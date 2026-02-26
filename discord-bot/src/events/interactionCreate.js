'use strict';

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const Colors      = require('../config/colors');
const config      = require('../config/config');
const logger      = require('../services/logger');
const { stmts }   = require('../services/database');
const { submitReview } = require('../services/licenseApi');

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
            color:       Colors.ERROR,
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

    // ─── Boutons ──────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      const [action, ...args] = interaction.customId.split(':');

      // ── Fermer ticket ──
      if (action === 'close_ticket') {
        const closeCmd = client.commands.get('close');
        if (closeCmd?.handleButton) {
          await closeCmd.handleButton(interaction, client, args).catch((err) => {
            logger.error('Erreur bouton close_ticket:', err);
          });
        }
        return;
      }

      // ── Ouvrir modal avis ──
      if (action === 'avis_open_modal') {
        const modal = new ModalBuilder()
          .setCustomId('avis_modal')
          .setTitle('⭐ Donner mon avis — 404 Tweaks');

        const inputText = new TextInputBuilder()
          .setCustomId('avis_text')
          .setLabel('Votre avis (20–500 caractères)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMinLength(20)
          .setMaxLength(500)
          .setPlaceholder('Ex: J\'ai gagné 80 FPS en endgame grâce au module GPU…');

        const inputStars = new TextInputBuilder()
          .setCustomId('avis_stars')
          .setLabel('Note (1 à 5 étoiles)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(1)
          .setPlaceholder('5');

        const inputDesc = new TextInputBuilder()
          .setCustomId('avis_description')
          .setLabel('Votre pseudo + description (optionnel)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(80)
          .setPlaceholder('Ex: Thomas L. — Champion Division, 6000 pts Arena');

        modal.addComponents(
          new ActionRowBuilder().addComponents(inputText),
          new ActionRowBuilder().addComponents(inputStars),
          new ActionRowBuilder().addComponents(inputDesc),
        );

        await interaction.showModal(modal);
        return;
      }
    }

    // ─── Soumission modal ─────────────────────────────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId === 'avis_modal') {
      await interaction.deferReply({ ephemeral: true });

      const rawText  = interaction.fields.getTextInputValue('avis_text').trim();
      const rawStars = interaction.fields.getTextInputValue('avis_stars').trim();
      const rawDesc  = (interaction.fields.getTextInputValue('avis_description') ?? '').trim();

      // ── Validation étoiles ──
      const stars = parseInt(rawStars, 10);
      if (isNaN(stars) || stars < 1 || stars > 5) {
        return interaction.editReply({
          embeds: [{ color: Colors.ERROR, description: '❌ La note doit être un chiffre entre 1 et 5.' }],
        });
      }

      const discordId = interaction.user.id;
      const username  = interaction.user.tag;
      const description = rawDesc || `Membre — 404 Tweaks`;

      // ── Upsert en DB (un seul avis par utilisateur) ──
      try {
        stmts.addReview.run({ discord_id: discordId, username, description, text: rawText, stars });
      } catch (err) {
        logger.error('DB addReview error:', err);
        return interaction.editReply({
          embeds: [{ color: Colors.ERROR, description: '❌ Erreur lors de l\'enregistrement. Réessaie plus tard.' }],
        });
      }

      // ── Synchroniser avec le backend ──
      submitReview({ discordId, username, description, text: rawText, stars }).catch(() => {});

      // ── Poster l'avis dans le salon avis ──
      const starsDisplay = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
      const reviewEmbed = {
        color:       Colors.GOLD ?? 0xFFD700,
        author:      { name: username, icon_url: interaction.user.displayAvatarURL({ dynamic: true, size: 64 }) },
        description: `${starsDisplay}\n\n"${rawText}"`,
        footer:      { text: description },
        timestamp:   new Date().toISOString(),
      };

      if (config.channels.reviews) {
        const channel = interaction.guild.channels.cache.get(config.channels.reviews);
        if (channel) {
          await channel.send({ embeds: [reviewEmbed] }).catch((err) => {
            logger.warn('Impossible de poster l\'avis dans le salon reviews:', err.message);
          });
        }
      }

      logger.info(`Avis reçu de ${username} (${discordId}) — ${stars}★`);

      return interaction.editReply({
        embeds: [{
          color:       Colors.SUCCESS,
          title:       '✅ Avis envoyé !',
          description: 'Merci pour ton retour ! Il sera visible sur le site officiel **404 Tweaks**.',
        }],
      });
    }
  },
};
