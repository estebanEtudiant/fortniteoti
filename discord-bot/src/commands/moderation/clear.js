'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors = require('../../config/colors');
const logger = require('../../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime des messages dans le salon')
    .addIntegerOption(o =>
      o.setName('nombre')
       .setDescription('Nombre de messages à supprimer (1-100)')
       .setMinValue(1)
       .setMaxValue(100)
       .setRequired(true)
    )
    .addUserOption(o =>
      o.setName('membre')
       .setDescription('Ne supprimer que les messages de ce membre (optionnel)')
       .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const nombre = interaction.options.getInteger('nombre');
    const target = interaction.options.getUser('membre');

    await interaction.deferReply({ ephemeral: true });

    // Récupère les messages (max 100, pas plus vieux que 14j pour bulkDelete)
    let messages = await interaction.channel.messages.fetch({ limit: 100 });

    if (target) {
      messages = messages.filter(m => m.author.id === target.id);
    }

    // Limite à "nombre" messages
    const toDelete = messages.first(nombre);

    // bulkDelete ne supprime pas les messages >14j — on filtre
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const valid  = toDelete.filter(m => m.createdTimestamp > cutoff);

    const deleted = await interaction.channel.bulkDelete(valid, true);

    logger.info(`[CLEAR] ${deleted.size} messages supprimés dans #${interaction.channel.name} par ${interaction.user.tag}`);

    return interaction.editReply({
      embeds: [{
        color: Colors.SUCCESS,
        description: `✅ **${deleted.size}** message(s) supprimé(s)${target ? ` de ${target.tag}` : ''}.`,
      }],
    });
  },
};
