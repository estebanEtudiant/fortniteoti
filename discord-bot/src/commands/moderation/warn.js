'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors   = require('../../config/colors');
const { stmts } = require('../../services/database');
const { logModAction } = require('./ban');
const logger   = require('../../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertit un membre')
    .addUserOption(o => o.setName('membre').setDescription('Membre à avertir').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison de l\'avertissement').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison');

    if (!target) {
      return interaction.reply({ embeds: [{ color: Colors.ERROR, description: '❌ Membre introuvable.' }], ephemeral: true });
    }
    if (target.user.bot) {
      return interaction.reply({ embeds: [{ color: Colors.ERROR, description: '❌ Impossible d\'avertir un bot.' }], ephemeral: true });
    }

    stmts.addInfraction.run({
      guild_id: interaction.guild.id,
      user_id: target.id,
      moderator_id: interaction.user.id,
      type: 'warn',
      reason,
      duration: null,
    });

    const { count } = stmts.countUserInfractions.get(interaction.guild.id, target.id);

    // Notifie le membre en DM
    await target.send({
      embeds: [{
        color: Colors.WARNING,
        title: `⚠️ Avertissement sur ${interaction.guild.name}`,
        fields: [
          { name: 'Raison', value: reason },
          { name: 'Total avertissements', value: `${count}` },
        ],
        timestamp: new Date().toISOString(),
      }],
    }).catch(() => {});

    logModAction(interaction.client, interaction.guild, {
      action: 'WARN', color: Colors.WARNING,
      target, moderator: interaction.user, reason,
      extra: `Total infractions : ${count}`,
    });

    logger.info(`[WARN] ${target.user.tag} averti par ${interaction.user.tag} (total: ${count})`);

    return interaction.reply({
      embeds: [{
        color: Colors.WARNING,
        title: '⚠️ Avertissement enregistré',
        fields: [
          { name: 'Membre', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Infractions totales', value: `${count}`, inline: true },
          { name: 'Raison', value: reason },
        ],
        timestamp: new Date().toISOString(),
      }],
    });
  },
};
