'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors   = require('../../config/colors');
const config   = require('../../config/config');
const { stmts } = require('../../services/database');
const logger   = require('../../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannit un membre du serveur')
    .addUserOption(o => o.setName('membre').setDescription('Membre à bannir').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison du ban').setRequired(false))
    .addIntegerOption(o => o.setName('jours').setDescription('Supprimer les messages des X derniers jours (0-7)').setMinValue(0).setMaxValue(7).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const days   = interaction.options.getInteger('jours') ?? 0;

    // Vérifications
    if (!target) {
      return interaction.reply({ embeds: [{ color: Colors.ERROR, description: '❌ Membre introuvable.' }], ephemeral: true });
    }
    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [{ color: Colors.ERROR, description: '❌ Tu ne peux pas te bannir toi-même.' }], ephemeral: true });
    }
    if (!target.bannable) {
      return interaction.reply({ embeds: [{ color: Colors.ERROR, description: '❌ Je ne peux pas bannir ce membre (rôle supérieur ou protégé).' }], ephemeral: true });
    }

    // DM avant le ban
    await target.send({
      embeds: [{
        color: Colors.ERROR,
        title: `Tu as été banni de ${interaction.guild.name}`,
        fields: [{ name: 'Raison', value: reason }],
        timestamp: new Date().toISOString(),
      }],
    }).catch(() => {});

    await target.ban({ reason, deleteMessageSeconds: days * 86400 });

    // Infraction en base
    stmts.addInfraction.run({
      guild_id: interaction.guild.id,
      user_id: target.id,
      moderator_id: interaction.user.id,
      type: 'ban',
      reason,
      duration: null,
    });

    // Log modération
    logModAction(interaction.client, interaction.guild, {
      action: 'BAN', color: Colors.ERROR,
      target, moderator: interaction.user, reason,
    });

    logger.info(`[BAN] ${target.user.tag} banni par ${interaction.user.tag} — ${reason}`);

    return interaction.reply({
      embeds: [{
        color: Colors.ERROR,
        title: '🔨 Membre banni',
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

function logModAction(client, guild, { action, color, target, moderator, reason, extra = '' }) {
  if (!config.channels.logs) return;
  const channel = guild.channels.cache.get(config.channels.logs);
  if (!channel) return;
  channel.send({
    embeds: [{
      color,
      title: `🛡️ ${action}`,
      fields: [
        { name: 'Utilisateur', value: `${target.user.tag} (${target.id})`, inline: true },
        { name: 'Modérateur', value: moderator.tag, inline: true },
        { name: 'Raison', value: reason },
        ...(extra ? [{ name: 'Détails', value: extra }] : []),
      ],
      timestamp: new Date().toISOString(),
    }],
  }).catch(() => {});
}

module.exports.logModAction = logModAction;
