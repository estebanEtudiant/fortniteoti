'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors   = require('../../config/colors');
const config   = require('../../config/config');
const { stmts } = require('../../services/database');
const { logModAction } = require('./ban');
const logger   = require('../../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Retire le mute d\'un membre')
    .addUserOption(o => o.setName('membre').setDescription('Membre à démuter').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!config.roles.muted) {
      return interaction.reply({
        embeds: [{ color: Colors.ERROR, description: '❌ Le rôle `ROLE_MUTED` n\'est pas configuré.' }],
        ephemeral: true,
      });
    }

    const target = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!target) {
      return interaction.reply({ embeds: [{ color: Colors.ERROR, description: '❌ Membre introuvable.' }], ephemeral: true });
    }
    if (!target.roles.cache.has(config.roles.muted)) {
      return interaction.reply({ embeds: [{ color: Colors.WARNING, description: '⚠️ Ce membre n\'est pas muet.' }], ephemeral: true });
    }

    await target.roles.remove(config.roles.muted, `Unmute par ${interaction.user.tag} — ${reason}`);
    stmts.removeMute.run(target.id, interaction.guild.id);

    logModAction(interaction.client, interaction.guild, {
      action: 'UNMUTE', color: Colors.SUCCESS,
      target, moderator: interaction.user, reason,
    });

    logger.info(`[UNMUTE] ${target.user.tag} démuté par ${interaction.user.tag}`);

    return interaction.reply({
      embeds: [{
        color: Colors.SUCCESS,
        title: '🔊 Membre démuté',
        fields: [
          { name: 'Membre', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Modérateur', value: interaction.user.tag, inline: true },
          { name: 'Raison', value: reason },
        ],
        timestamp: new Date().toISOString(),
      }],
    });
  },
};
