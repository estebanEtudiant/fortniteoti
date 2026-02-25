'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors   = require('../../config/colors');
const { stmts } = require('../../services/database');
const { logModAction } = require('./ban');
const logger   = require('../../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulse un membre du serveur')
    .addUserOption(o => o.setName('membre').setDescription('Membre à expulser').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison de l\'expulsion').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!target) {
      return interaction.reply({ embeds: [{ color: Colors.ERROR, description: '❌ Membre introuvable.' }], ephemeral: true });
    }
    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [{ color: Colors.ERROR, description: '❌ Tu ne peux pas t\'expulser toi-même.' }], ephemeral: true });
    }
    if (!target.kickable) {
      return interaction.reply({ embeds: [{ color: Colors.ERROR, description: '❌ Je ne peux pas expulser ce membre.' }], ephemeral: true });
    }

    await target.send({
      embeds: [{
        color: Colors.WARNING,
        title: `Tu as été expulsé de ${interaction.guild.name}`,
        fields: [{ name: 'Raison', value: reason }],
        timestamp: new Date().toISOString(),
      }],
    }).catch(() => {});

    await target.kick(reason);

    stmts.addInfraction.run({
      guild_id: interaction.guild.id,
      user_id: target.id,
      moderator_id: interaction.user.id,
      type: 'kick',
      reason,
      duration: null,
    });

    logModAction(interaction.client, interaction.guild, {
      action: 'KICK', color: Colors.WARNING,
      target, moderator: interaction.user, reason,
    });

    logger.info(`[KICK] ${target.user.tag} expulsé par ${interaction.user.tag}`);

    return interaction.reply({
      embeds: [{
        color: Colors.WARNING,
        title: '👢 Membre expulsé',
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
