'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');
const Colors   = require('../../config/colors');
const config   = require('../../config/config');
const { stmts } = require('../../services/database');
const logger   = require('../../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ouvre un ticket de support')
    .addStringOption(o =>
      o.setName('sujet')
       .setDescription('Décris brièvement ton problème')
       .setRequired(true)
       .setMaxLength(100)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subject = interaction.options.getString('sujet');

    // Vérifier si un ticket est déjà ouvert
    const existing = stmts.getOpenTicketByUser.get(interaction.guild.id, interaction.user.id);
    if (existing) {
      const existingChannel = interaction.guild.channels.cache.get(existing.channel_id);
      if (existingChannel) {
        return interaction.editReply({
          embeds: [{
            color: Colors.WARNING,
            description: `⚠️ Tu as déjà un ticket ouvert : ${existingChannel}.\nFerme-le avant d'en ouvrir un nouveau.`,
          }],
        });
      }
      // Le salon n'existe plus → on nettoie
      stmts.closeTicket.run(existing.channel_id);
    }

    if (!config.channels.ticketCategory) {
      return interaction.editReply({
        embeds: [{ color: Colors.ERROR, description: '❌ La catégorie tickets n\'est pas configurée (`CATEGORY_TICKETS` dans .env).' }],
      });
    }

    // Récupère la vérification de l'utilisateur (si elle existe)
    const verification = stmts.getVerification.get(interaction.user.id);

    // Crée le salon ticket
    const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`;

    const channel = await interaction.guild.channels.create({
      name:   channelName,
      type:   ChannelType.GuildText,
      parent: config.channels.ticketCategory,
      permissionOverwrites: [
        {
          id:   interaction.guild.id,  // @everyone — personne ne voit
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id:    interaction.user.id,  // L'auteur du ticket
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id:    interaction.client.user.id,  // Le bot
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
        },
        // Donne accès aux modérateurs si le rôle est configuré
        ...(config.roles.moderator ? [{
          id:    config.roles.moderator,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        }] : []),
      ],
      topic: `Ticket de ${interaction.user.tag} — ${subject}`,
    });

    // Enregistre le ticket en base
    stmts.createTicket.run({
      guild_id:   interaction.guild.id,
      channel_id: channel.id,
      user_id:    interaction.user.id,
      subject,
    });

    // Bouton fermer
    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Fermer le ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    const row = new ActionRowBuilder().addComponents(closeButton);

    // Message d'ouverture dans le ticket
    const licenseInfo = verification
      ? `\n**Licence :** Plan ${verification.plan}${verification.expires_at ? ` — expire le ${new Date(verification.expires_at * 1000).toLocaleDateString('fr-FR')}` : ''}`
      : '\n*Aucune licence liée — utilise `/verify` si tu es client.*';

    await channel.send({
      content: `${interaction.user}`,
      embeds: [{
        color: Colors.PRIMARY,
        title: '🎫 Ticket de support ouvert',
        fields: [
          { name: 'Auteur',  value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
          { name: 'Sujet',   value: subject },
          { name: 'Compte',  value: licenseInfo },
        ],
        footer: { text: 'L\'équipe support va te répondre rapidement.' },
        timestamp: new Date().toISOString(),
      }],
      components: [row],
    });

    logger.info(`[TICKET] Ouvert par ${interaction.user.tag} — ${subject} — #${channel.name}`);

    return interaction.editReply({
      embeds: [{
        color: Colors.SUCCESS,
        description: `✅ Ton ticket a été créé : ${channel}\nL'équipe support va te répondre rapidement.`,
      }],
    });
  },
};
