'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors     = require('../../config/colors');
const licenseApi = require('../../services/licenseApi');
const logger     = require('../../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Active ou désactive le mode maintenance du site')
    .addBooleanOption(o =>
      o.setName('activer')
       .setDescription('true = maintenance ON, false = maintenance OFF')
       .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('raison')
       .setDescription('Raison affichée (optionnel)')
       .setRequired(false)
       .setMaxLength(200)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const enable = interaction.options.getBoolean('activer');
    const raison = interaction.options.getString('raison') ?? null;

    const result = await licenseApi.setMaintenance(enable, raison);

    if (!result.success) {
      return interaction.editReply({
        embeds: [{ color: Colors.ERROR, description: `❌ Erreur : ${result.reason}` }],
      });
    }

    logger.info(`[MAINTENANCE] ${enable ? 'activé' : 'désactivé'} par ${interaction.user.tag}${raison ? ` — ${raison}` : ''}`);

    return interaction.editReply({
      embeds: [{
        color:       enable ? Colors.WARNING : Colors.SUCCESS,
        title:       enable ? '🔧 Mode maintenance activé' : '✅ Mode maintenance désactivé',
        description: enable
          ? `Le site est maintenant **hors ligne** pour les visiteurs.${raison ? `\n\n> ${raison}` : ''}`
          : 'Le site est de nouveau **accessible** au public.',
        footer:    { text: `Par ${interaction.user.tag}` },
        timestamp: new Date().toISOString(),
      }],
    });
  },
};
