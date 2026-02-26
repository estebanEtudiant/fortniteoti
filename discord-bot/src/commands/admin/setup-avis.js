'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const Colors  = require('../../config/colors');
const config  = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-avis')
    .setDescription('Poste l\'embed "Donner un avis" dans le salon avis clients')
    .addChannelOption(o =>
      o.setName('salon')
       .setDescription('Salon où envoyer l\'embed (défaut : salon avis configuré)')
       .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('salon')
      ?? interaction.guild.channels.cache.get(config.channels.reviews)
      ?? interaction.channel;

    if (!targetChannel.permissionsFor(interaction.guild.members.me)?.has('SendMessages')) {
      return interaction.reply({
        embeds: [{ color: Colors.ERROR, description: '❌ Je n\'ai pas la permission d\'écrire dans ce salon.' }],
        ephemeral: true,
      });
    }

    const button = new ButtonBuilder()
      .setCustomId('avis_open_modal')
      .setLabel('⭐ Donner mon avis')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await targetChannel.send({
      embeds: [{
        color:       Colors.GOLD ?? 0xFFD700,
        title:       '💬 Partagez votre expérience 404 Tweaks',
        description: [
          'Tu utilises **404 Tweaks** et tu es satisfait de tes résultats ?',
          'Laisse un avis pour aider la communauté !',
          '',
          '> ⭐ **Clique sur le bouton ci-dessous** pour partager ton expérience en quelques secondes.',
          '> 🔒 *Ton avis sera visible sur le site officiel.*',
        ].join('\n'),
        footer:    { text: '404 Tweaks • Optimisation Fortnite' },
        timestamp: new Date().toISOString(),
      }],
      components: [row],
    });

    return interaction.reply({
      embeds: [{ color: Colors.SUCCESS, description: `✅ Embed avis posté dans ${targetChannel}.` }],
      ephemeral: true,
    });
  },
};
