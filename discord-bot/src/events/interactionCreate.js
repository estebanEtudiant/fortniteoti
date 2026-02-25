'use strict';

const { InteractionType } = require('discord.js');
const Colors = require('../config/colors');
const logger = require('../services/logger');

module.exports = {
  name: 'interactionCreate',

  async execute(client, interaction) {
    // ─── Commandes slash ─────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (err) {
        logger.error(`Erreur commande /${interaction.commandName}:`, err);

        const payload = {
          embeds: [{
            color: Colors.ERROR,
            description: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
          }],
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
    }

    // ─── Boutons (ex: fermer ticket) ─────────────────────────────────────────
    if (interaction.isButton()) {
      const [action, ...args] = interaction.customId.split(':');

      if (action === 'close_ticket') {
        const closeCmd = client.commands.get('close');
        if (closeCmd?.handleButton) {
          await closeCmd.handleButton(interaction, client, args).catch((err) => {
            logger.error('Erreur bouton close_ticket:', err);
          });
        }
      }
    }
  },
};
