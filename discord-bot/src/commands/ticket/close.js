'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors   = require('../../config/colors');
const config   = require('../../config/config');
const { stmts } = require('../../services/database');
const logger   = require('../../services/logger');

async function doCloseTicket(interaction) {
  const ticket = stmts.getTicketByChannel.get(interaction.channelId);

  if (!ticket) {
    return interaction.reply({
      embeds: [{ color: Colors.ERROR, description: '❌ Ce salon n\'est pas un ticket.' }],
      ephemeral: true,
    });
  }
  if (ticket.status === 'closed') {
    return interaction.reply({
      embeds: [{ color: Colors.WARNING, description: '⚠️ Ce ticket est déjà fermé.' }],
      ephemeral: true,
    });
  }

  // Seul l'auteur du ticket ou un modérateur peut fermer
  const isModerator = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)
    || (config.roles.moderator && interaction.member.roles.cache.has(config.roles.moderator));
  const isOwner = ticket.user_id === interaction.user.id;

  if (!isModerator && !isOwner) {
    return interaction.reply({
      embeds: [{ color: Colors.ERROR, description: '❌ Seul l\'auteur du ticket ou un modérateur peut le fermer.' }],
      ephemeral: true,
    });
  }

  // Message de fermeture
  await interaction.reply({
    embeds: [{
      color: Colors.NEUTRAL,
      description: `🔒 Ticket fermé par ${interaction.user}.\n\nCe salon sera supprimé dans **5 secondes**.`,
      timestamp: new Date().toISOString(),
    }],
  });

  // Marque en base
  stmts.closeTicket.run(interaction.channelId);
  logger.info(`[TICKET] Fermé par ${interaction.user.tag} — ${interaction.channel.name}`);

  // Supprime le salon après 5s
  setTimeout(() => {
    interaction.channel.delete(`Ticket fermé par ${interaction.user.tag}`).catch(() => {});
  }, 5000);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Ferme ce ticket de support'),

  async execute(interaction) {
    await doCloseTicket(interaction);
  },

  // Appelé depuis interactionCreate.js pour le bouton
  async handleButton(interaction) {
    await doCloseTicket(interaction);
  },
};
