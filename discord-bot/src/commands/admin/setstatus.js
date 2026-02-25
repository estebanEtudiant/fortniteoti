'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors        = require('../../config/colors');
const { stmts }     = require('../../services/database');
const statusMonitor = require('../../services/statusMonitor');
const logger        = require('../../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstatus')
    .setDescription('Initialise ou déplace l\'embed de statut dans ce salon (staff uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Supprimer l'ancien message si existant
    const existing = stmts.getStatusMessage.get();
    if (existing && existing.guild_id === interaction.guild.id) {
      const oldChannel = interaction.guild.channels.cache.get(existing.channel_id);
      if (oldChannel) {
        const oldMsg = await oldChannel.messages.fetch(existing.message_id).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
      }
    }

    // Poster le nouvel embed dans le salon courant
    const embed = statusMonitor.buildInitialEmbed();
    const message = await interaction.channel.send({
      embeds: [embed],
    });

    // Sauvegarder la référence
    stmts.upsertStatusMessage.run({
      guild_id:   interaction.guild.id,
      channel_id: interaction.channel.id,
      message_id: message.id,
    });

    // Lancer une vérification immédiate pour peupler avec les vraies données
    setTimeout(() => statusMonitor.runCheck(interaction.client).catch(() => {}), 2000);

    logger.info(`[STATUS] Embed initialisé dans #${interaction.channel.name} par ${interaction.user.tag}`);

    return interaction.editReply({
      embeds: [{
        color:       Colors.SUCCESS,
        description: `✅ Embed de statut positionné dans ${interaction.channel}.\nIl se met à jour automatiquement toutes les 60 secondes.`,
      }],
    });
  },
};
