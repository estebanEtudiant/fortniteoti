'use strict';

const { SlashCommandBuilder } = require('discord.js');
const Colors     = require('../../config/colors');
const { stmts }  = require('../../services/database');
const licenseApi = require('../../services/licenseApi');

const PLAN_LABELS = { DAYS_1: '1 jour', DAYS_7: '7 jours', DAYS_14: '14 jours' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Vérifie le statut de ta licence liée'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // 1. Vérifier dans la DB locale
    const local = stmts.getVerification.get(interaction.user.id);
    if (!local) {
      return interaction.editReply({
        embeds: [{
          color: Colors.NEUTRAL,
          description: '🔍 Aucune licence n\'est liée à ton compte Discord.\nUtilise `/verify <clé>` pour lier ta licence.',
        }],
      });
    }

    // 2. Vérifier auprès de l'API (statut temps réel)
    const api = await licenseApi.getLicenseStatus(interaction.user.id);

    if (!api.valid) {
      return interaction.editReply({
        embeds: [{
          color: Colors.ERROR,
          title: '❌ Licence expirée ou révoquée',
          description: 'Ta licence n\'est plus valide. Renouvelle-la sur le site.',
          fields: [{ name: 'Ancienne clé', value: `\`${maskKey(local.license_key)}\`` }],
        }],
      });
    }

    const planLabel  = PLAN_LABELS[api.plan] || api.plan;
    const expiryText = api.expiresAt
      ? new Date(api.expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Illimité';

    // Calcul du temps restant
    let remaining = '';
    if (api.expiresAt) {
      const ms   = new Date(api.expiresAt).getTime() - Date.now();
      const days = Math.ceil(ms / 86400000);
      remaining  = days > 0 ? `${days} jour(s) restant(s)` : 'Expire aujourd\'hui';
    }

    return interaction.editReply({
      embeds: [{
        color: Colors.SUCCESS,
        title: '✅ Licence active',
        fields: [
          { name: 'Plan',        value: planLabel,   inline: true },
          { name: 'Expiration',  value: expiryText,  inline: true },
          { name: 'Temps restant', value: remaining || 'Illimité', inline: true },
          { name: 'Clé',         value: `\`${maskKey(local.license_key)}\`` },
        ],
        footer: { text: 'FortniteOpti' },
        timestamp: new Date().toISOString(),
      }],
    });
  },
};

function maskKey(key) {
  const parts = key.split('-');
  if (parts.length < 2) return key.slice(0, 4) + '****';
  return parts[0] + '-****-****-' + parts[parts.length - 1];
}
