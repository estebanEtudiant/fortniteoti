'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors   = require('../../config/colors');
const { stmts } = require('../../services/database');

const TYPE_EMOJI = { warn: '⚠️', mute: '🔇', kick: '👢', ban: '🔨' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('infractions')
    .setDescription('Affiche l\'historique des infractions d\'un membre')
    .addUserOption(o => o.setName('membre').setDescription('Membre à consulter').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('membre');
    const list   = stmts.getUserInfractions.all(interaction.guild.id, target.id);

    if (!list.length) {
      return interaction.reply({
        embeds: [{
          color: Colors.SUCCESS,
          description: `✅ **${target.tag}** n'a aucune infraction enregistrée.`,
        }],
        ephemeral: true,
      });
    }

    // Formate les 10 dernières infractions
    const lines = list.slice(0, 10).map((inf, i) => {
      const date = new Date(inf.created_at * 1000).toLocaleDateString('fr-FR');
      const emoji = TYPE_EMOJI[inf.type] || '•';
      const dur = inf.duration ? ` (${inf.duration}s)` : '';
      return `\`#${inf.id}\` ${emoji} **${inf.type.toUpperCase()}**${dur} — ${inf.reason} — *${date}*`;
    });

    return interaction.reply({
      embeds: [{
        color: Colors.WARNING,
        title: `📋 Infractions de ${target.tag}`,
        description: lines.join('\n'),
        footer: {
          text: `${list.length} infraction(s) au total${list.length > 10 ? ' (10 affichées)' : ''}`,
        },
        timestamp: new Date().toISOString(),
      }],
      ephemeral: true,
    });
  },
};
