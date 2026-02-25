'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors = require('../../config/colors');
const logger = require('../../services/logger');

const COLOR_MAP = {
  bleu:   0x00CFFF,
  vert:   0x57F287,
  rouge:  0xED4245,
  or:     0xFFD700,
  violet: 0x9B59B6,
  blanc:  0xFFFFFF,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Envoie une annonce formatée dans un salon')
    .addChannelOption(o =>
      o.setName('salon').setDescription('Salon de destination').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('titre').setDescription('Titre de l\'annonce').setRequired(true).setMaxLength(100)
    )
    .addStringOption(o =>
      o.setName('message').setDescription('Contenu de l\'annonce').setRequired(true).setMaxLength(2000)
    )
    .addStringOption(o =>
      o.setName('couleur')
       .setDescription('Couleur de l\'embed (défaut : bleu)')
       .setRequired(false)
       .addChoices(
         { name: 'Bleu',   value: 'bleu' },
         { name: 'Vert',   value: 'vert' },
         { name: 'Rouge',  value: 'rouge' },
         { name: 'Or',     value: 'or' },
         { name: 'Violet', value: 'violet' },
         { name: 'Blanc',  value: 'blanc' },
       )
    )
    .addRoleOption(o =>
      o.setName('mention').setDescription('Rôle à mentionner (optionnel)').setRequired(false)
    )
    .addStringOption(o =>
      o.setName('image').setDescription('URL d\'une image à afficher en bas (optionnel)').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.options.getChannel('salon');
    const titre   = interaction.options.getString('titre');
    const message = interaction.options.getString('message');
    const couleur = interaction.options.getString('couleur') ?? 'bleu';
    const role    = interaction.options.getRole('mention');
    const image   = interaction.options.getString('image');

    // Vérifie que le bot peut écrire dans ce salon
    if (!channel.permissionsFor(interaction.guild.members.me)?.has('SendMessages')) {
      return interaction.reply({
        embeds: [{ color: Colors.ERROR, description: '❌ Je n\'ai pas la permission d\'écrire dans ce salon.' }],
        ephemeral: true,
      });
    }

    const embed = {
      color:       COLOR_MAP[couleur] ?? Colors.PRIMARY,
      title:       titre,
      description: message,
      footer:      { text: `Annonce par ${interaction.user.tag}` },
      timestamp:   new Date().toISOString(),
    };

    if (image) embed.image = { url: image };

    await channel.send({
      content: role ? `${role}` : undefined,
      embeds:  [embed],
    });

    logger.info(`[ANNOUNCE] "${titre}" envoyé dans #${channel.name} par ${interaction.user.tag}`);

    return interaction.reply({
      embeds: [{ color: Colors.SUCCESS, description: `✅ Annonce envoyée dans ${channel}.` }],
      ephemeral: true,
    });
  },
};
