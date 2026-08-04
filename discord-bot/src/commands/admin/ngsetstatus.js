'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors        = require('../../config/colors');
const { stmts }     = require('../../services/database');
const statusMonitor = require('../../services/statusMonitor');
const logger        = require('../../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ngsetstatus')
    .setDescription('Initialise ou déplace l\'embed de statut 404 Client dans ce salon (staff uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const existing = stmts.getNgStatusMessage.get();
    if (existing && existing.guild_id === interaction.guild.id) {
      const oldChannel = interaction.guild.channels.cache.get(existing.channel_id);
      if (oldChannel) {
        const oldMsg = await oldChannel.messages.fetch(existing.message_id).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
      }
    }

    const embed = statusMonitor.buildInitialNgEmbed();
    const message = await interaction.channel.send({ embeds: [embed] });

    stmts.upsertNgStatusMessage.run({
      guild_id:   interaction.guild.id,
      channel_id: interaction.channel.id,
      message_id: message.id,
    });

    setTimeout(() => statusMonitor.runCheck(interaction.client).catch(() => {}), 2000);

    logger.info(`[STATUS NG] Embed initialisé dans #${interaction.channel.name} par ${interaction.user.tag}`);

    return interaction.editReply({
      embeds: [{
        color:       Colors.SUCCESS,
        description: `✅ Embed de statut 404 Client positionné dans ${interaction.channel}.\nIl se met à jour automatiquement toutes les 60 secondes.`,
      }],
    });
  },
};
