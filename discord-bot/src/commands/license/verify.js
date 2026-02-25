'use strict';

const { SlashCommandBuilder } = require('discord.js');
const Colors      = require('../../config/colors');
const config      = require('../../config/config');
const { stmts }   = require('../../services/database');
const licenseApi  = require('../../services/licenseApi');
const logger      = require('../../services/logger');

const PLAN_LABELS = {
  DAYS_1:  '1 jour',
  DAYS_7:  '7 jours',
  DAYS_14: '14 jours',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Lie ta clé de licence FortniteOpti à ton compte Discord')
    .addStringOption(o =>
      o.setName('clé')
       .setDescription('Ta clé de licence (ex: FTN-XXXX-XXXX-XXXX)')
       .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const key = interaction.options.getString('clé').trim();

    // Vérifier si une autre vérification existe déjà pour cette clé
    const existing = stmts.getVerificationKey.get(key);
    if (existing && existing.discord_id !== interaction.user.id) {
      return interaction.editReply({
        embeds: [{
          color: Colors.ERROR,
          description: '❌ Cette clé est déjà liée à un autre compte Discord.',
        }],
      });
    }

    // Appel API backend
    const result = await licenseApi.verifyLicense(key, interaction.user.id);

    if (!result.valid) {
      logger.warn(`[VERIFY] Échec pour ${interaction.user.tag} — ${result.reason}`);
      return interaction.editReply({
        embeds: [{
          color: Colors.ERROR,
          title: '❌ Licence invalide',
          description: result.reason || 'Cette clé est invalide ou expirée.',
          fields: [{ name: 'Aide', value: 'Vérifie ta clé sur ton email de confirmation ou ouvre un ticket avec `/ticket`.' }],
        }],
      });
    }

    // Sauvegarde en DB locale
    const expiresAt = result.expiresAt ? Math.floor(new Date(result.expiresAt).getTime() / 1000) : null;
    stmts.upsertVerification.run({
      discord_id:  interaction.user.id,
      license_key: key,
      plan:        result.plan,
      expires_at:  expiresAt,
    });

    // Gestion des rôles
    const member = interaction.member;
    await assignPlanRoles(member, result.plan);

    const planLabel  = PLAN_LABELS[result.plan] || result.plan;
    const expiryText = result.expiresAt
      ? new Date(result.expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Illimité';

    logger.info(`[VERIFY] ${interaction.user.tag} vérifié — plan: ${result.plan}, expire: ${expiryText}`);

    return interaction.editReply({
      embeds: [{
        color: Colors.SUCCESS,
        title: '✅ Licence vérifiée !',
        description: `Bienvenue, **${result.customerName || interaction.user.displayName}** ! Ton accès est maintenant actif.`,
        fields: [
          { name: 'Plan',       value: planLabel,  inline: true },
          { name: 'Expiration', value: expiryText, inline: true },
          { name: 'Clé',        value: `\`${maskKey(key)}\`` },
        ],
        footer: { text: 'FortniteOpti — Tes rôles ont été mis à jour' },
        timestamp: new Date().toISOString(),
      }],
    });
  },
};

/** Retire les anciens rôles plan et attribue le bon. */
async function assignPlanRoles(member, plan) {
  const allPlanRoles = Object.values(config.roles.plans).filter(Boolean);

  // Retire tous les anciens rôles plan
  const toRemove = member.roles.cache.filter(r => allPlanRoles.includes(r.id));
  if (toRemove.size > 0) {
    await member.roles.remove([...toRemove.keys()], 'Mise à jour plan licence').catch(() => {});
  }

  // Attribue le nouveau rôle plan
  const newRole = config.roles.plans[plan];
  if (newRole) {
    await member.roles.add(newRole, `Plan vérifié : ${plan}`).catch((err) => {
      logger.warn(`assignPlanRoles: impossible d'ajouter ${plan} à ${member.user.tag}: ${err.message}`);
    });
  }
}

/** Masque partiellement la clé pour l'affichage. */
function maskKey(key) {
  const parts = key.split('-');
  if (parts.length < 2) return key.slice(0, 4) + '****';
  return parts[0] + '-****-****-' + parts[parts.length - 1];
}
