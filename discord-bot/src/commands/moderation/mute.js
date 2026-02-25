'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors   = require('../../config/colors');
const config   = require('../../config/config');
const { stmts } = require('../../services/database');
const { logModAction } = require('./ban');
const logger   = require('../../services/logger');

const DURATIONS = {
  '10min': 10 * 60,
  '30min': 30 * 60,
  '1h':    60 * 60,
  '6h':    6 * 60 * 60,
  '12h':  12 * 60 * 60,
  '24h':  24 * 60 * 60,
  '7j':    7 * 24 * 60 * 60,
  'permanent': null,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Rend un membre muet (retire sa capacité de parler)')
    .addUserOption(o => o.setName('membre').setDescription('Membre à muter').setRequired(true))
    .addStringOption(o =>
      o.setName('durée')
       .setDescription('Durée du mute')
       .setRequired(true)
       .addChoices(
         { name: '10 minutes', value: '10min' },
         { name: '30 minutes', value: '30min' },
         { name: '1 heure',    value: '1h' },
         { name: '6 heures',   value: '6h' },
         { name: '12 heures',  value: '12h' },
         { name: '24 heures',  value: '24h' },
         { name: '7 jours',    value: '7j' },
         { name: 'Permanent',  value: 'permanent' },
       )
    )
    .addStringOption(o => o.setName('raison').setDescription('Raison du mute').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!config.roles.muted) {
      return interaction.reply({
        embeds: [{ color: Colors.ERROR, description: '❌ Le rôle `ROLE_MUTED` n\'est pas configuré dans le .env.' }],
        ephemeral: true,
      });
    }

    const target   = interaction.options.getMember('membre');
    const duration = interaction.options.getString('durée');
    const reason   = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!target) {
      return interaction.reply({ embeds: [{ color: Colors.ERROR, description: '❌ Membre introuvable.' }], ephemeral: true });
    }
    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [{ color: Colors.ERROR, description: '❌ Tu ne peux pas te muter toi-même.' }], ephemeral: true });
    }
    if (target.roles.cache.has(config.roles.muted)) {
      return interaction.reply({ embeds: [{ color: Colors.WARNING, description: '⚠️ Ce membre est déjà muet.' }], ephemeral: true });
    }

    const seconds   = DURATIONS[duration];
    const expiresAt = seconds !== null ? Math.floor(Date.now() / 1000) + seconds : null;

    await target.roles.add(config.roles.muted, `Mute par ${interaction.user.tag} — ${reason}`);
    stmts.addMute.run(target.id, interaction.guild.id, expiresAt);

    stmts.addInfraction.run({
      guild_id: interaction.guild.id,
      user_id: target.id,
      moderator_id: interaction.user.id,
      type: 'mute',
      reason,
      duration: seconds,
    });

    const dureeLabel = duration === 'permanent' ? 'Permanent' : duration;

    logModAction(interaction.client, interaction.guild, {
      action: 'MUTE', color: Colors.WARNING,
      target, moderator: interaction.user, reason,
      extra: `Durée : ${dureeLabel}`,
    });

    logger.info(`[MUTE] ${target.user.tag} muté ${dureeLabel} par ${interaction.user.tag}`);

    return interaction.reply({
      embeds: [{
        color: Colors.WARNING,
        title: '🔇 Membre muté',
        fields: [
          { name: 'Membre', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Durée', value: dureeLabel, inline: true },
          { name: 'Modérateur', value: interaction.user.tag, inline: true },
          { name: 'Raison', value: reason },
        ],
        timestamp: new Date().toISOString(),
      }],
    });
  },
};
