'use strict';

const { SlashCommandBuilder } = require('discord.js');
const Colors      = require('../../config/colors');
const config      = require('../../config/config');
const { stmts }   = require('../../services/database');
const licenseApi  = require('../../services/licenseApi');
const logger      = require('../../services/logger');

const PLAN_LABELS = { DAYS_1: '1 jour', DAYS_3: '3 jours', DAYS_7: '7 jours', DAYS_14: '14 jours' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('badge')
    .setDescription('Réclame ton rôle badge FortniteOpti (licence active requise)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // 1. Licence liée en DB ?
    const local = stmts.getVerification.get(interaction.user.id);
    if (!local) {
      return interaction.editReply({
        embeds: [{
          color: Colors.NEUTRAL,
          title: '🔍 Aucune licence liée',
          description: 'Tu dois d\'abord lier ta clé de licence avec `/verify <clé>`.',
        }],
      });
    }

    // 2. Vérification temps réel auprès de l'API
    const api = await licenseApi.getLicenseStatus(interaction.user.id);
    if (!api.valid) {
      return interaction.editReply({
        embeds: [{
          color: Colors.ERROR,
          title: '❌ Licence expirée ou révoquée',
          description: 'Ta licence n\'est plus valide. Renouvelle-la sur le site pour obtenir ton badge.',
          fields: [{ name: 'Clé', value: `\`${maskKey(local.license_key)}\`` }],
        }],
      });
    }

    const member = interaction.member;
    const errors = [];

    // 3. Attribuer le rôle badge (ROLE_MEMBER)
    const badgeRoleId = config.roles.member;
    if (badgeRoleId) {
      const hasBadge = member.roles.cache.has(badgeRoleId);
      if (!hasBadge) {
        await member.roles.add(badgeRoleId, 'Badge FortniteOpti réclamé').catch(err => {
          logger.warn(`[BADGE] Impossible d'ajouter ROLE_MEMBER à ${member.user.tag}: ${err.message}`);
          errors.push('rôle badge');
        });
      }
    } else {
      logger.warn('[BADGE] ROLE_MEMBER non configuré dans .env — badge non attribué');
    }

    // 4. Re-synchroniser le rôle plan (en cas de perte après rejoin, etc.)
    const allPlanRoles = Object.values(config.roles.plans).filter(Boolean);
    const toRemove = member.roles.cache.filter(r => allPlanRoles.includes(r.id));
    if (toRemove.size > 0) {
      await member.roles.remove([...toRemove.keys()], 'Resync plan badge').catch(() => {});
    }
    const planRoleId = config.roles.plans[api.plan];
    if (planRoleId) {
      await member.roles.add(planRoleId, `Resync plan : ${api.plan}`).catch(err => {
        logger.warn(`[BADGE] Impossible de resync ${api.plan} à ${member.user.tag}: ${err.message}`);
        errors.push('rôle plan');
      });
    }

    const planLabel  = PLAN_LABELS[api.plan] || api.plan;
    const expiryText = api.expiresAt
      ? new Date(api.expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Illimité';

    logger.info(`[BADGE] ${interaction.user.tag} a réclamé son badge — plan: ${api.plan}`);

    const desc = errors.length
      ? `Ton badge a été partiellement attribué (erreur : ${errors.join(', ')}). Ouvre un ticket si le problème persiste.`
      : 'Ton rôle badge et ton rôle plan ont bien été attribués !';

    return interaction.editReply({
      embeds: [{
        color: errors.length ? Colors.WARNING : Colors.SUCCESS,
        title: errors.length ? '⚠️ Badge partiellement attribué' : '🏅 Badge attribué !',
        description: desc,
        fields: [
          { name: 'Plan',        value: planLabel,  inline: true },
          { name: 'Expiration',  value: expiryText, inline: true },
          { name: 'Clé',         value: `\`${maskKey(local.license_key)}\`` },
        ],
        footer: { text: 'FortniteOpti — Utilise /status pour vérifier ton statut' },
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
