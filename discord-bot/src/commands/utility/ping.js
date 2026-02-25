'use strict';

const { SlashCommandBuilder } = require('discord.js');
const Colors = require('../../config/colors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Affiche la latence du bot'),

  async execute(interaction) {
    const sent = await interaction.reply({
      embeds: [{
        color: Colors.INFO,
        description: '📡 Calcul en cours…',
      }],
      fetchReply: true,
    });

    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;

    return interaction.editReply({
      embeds: [{
        color: Colors.INFO,
        title: '🏓 Pong !',
        fields: [
          { name: 'Latence', value: `${roundtrip} ms`, inline: true },
          { name: 'WebSocket',  value: `${wsLatency} ms`, inline: true },
        ],
        timestamp: new Date().toISOString(),
      }],
    });
  },
};
