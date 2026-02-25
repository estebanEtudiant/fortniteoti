'use strict';

const { SlashCommandBuilder } = require('discord.js');
const Colors = require('../../config/colors');

const COMMANDS = [
  {
    category: '🔑 Licence',
    commands: [
      { name: '/verify <clé>',  desc: 'Lie ta clé de licence à ton compte Discord et obtient tes rôles automatiquement.' },
      { name: '/status',        desc: 'Vérifie le statut et la durée restante de ta licence liée.' },
    ],
  },
  {
    category: '🎫 Support',
    commands: [
      { name: '/ticket <sujet>', desc: 'Ouvre un ticket de support privé avec le staff.' },
      { name: '/close',          desc: 'Ferme et supprime le ticket courant (auteur ou modérateur).' },
    ],
  },
  {
    category: '⚙️ Utilitaires',
    commands: [
      { name: '/help',  desc: 'Affiche cette aide.' },
      { name: '/ping',  desc: 'Affiche la latence du bot.' },
      { name: '/stats', desc: 'Statistiques du serveur et du bot.' },
    ],
  },
  {
    category: '🛡️ Modération (staff)',
    commands: [
      { name: '/ban <membre>',         desc: 'Bannit un membre.' },
      { name: '/kick <membre>',        desc: 'Expulse un membre.' },
      { name: '/mute <membre> <durée>', desc: 'Mute un membre pour une durée définie.' },
      { name: '/unmute <membre>',       desc: 'Retire le mute d\'un membre.' },
      { name: '/warn <membre> <raison>', desc: 'Avertit un membre et enregistre l\'infraction.' },
      { name: '/clear <nombre>',        desc: 'Supprime des messages en masse.' },
      { name: '/infractions <membre>',  desc: 'Consulte l\'historique d\'infractions d\'un membre.' },
    ],
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Liste toutes les commandes disponibles'),

  async execute(interaction) {
    const fields = COMMANDS.map(cat => ({
      name:  cat.category,
      value: cat.commands.map(c => `\`${c.name}\` — ${c.desc}`).join('\n'),
    }));

    return interaction.reply({
      embeds: [{
        color: Colors.PRIMARY,
        title: '📖 Aide — FortniteOpti Bot',
        description: 'Voici toutes les commandes disponibles.\nLes commandes de modération nécessitent les permissions appropriées.',
        fields,
        footer: { text: 'FortniteOpti • /ticket pour contacter le support' },
        timestamp: new Date().toISOString(),
      }],
      ephemeral: true,
    });
  },
};
