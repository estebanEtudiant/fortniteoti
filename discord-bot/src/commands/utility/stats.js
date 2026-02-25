'use strict';

const { SlashCommandBuilder } = require('discord.js');
const Colors = require('../../config/colors');
const { db } = require('../../services/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Statistiques du serveur et du bot'),

  async execute(interaction) {
    const guild = interaction.guild;

    // Statistiques membres
    const total    = guild.memberCount;
    const bots     = guild.members.cache.filter(m => m.user.bot).size;
    const humans   = total - bots;
    const online   = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;

    // Statistiques licences (DB locale)
    const licensesCount = db.prepare('SELECT COUNT(*) as c FROM verifications').get().c;
    const ticketsOpen   = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'open'").get().c;

    // Uptime du bot
    const uptimeMs = process.uptime() * 1000;
    const uptimeStr = formatUptime(uptimeMs);

    return interaction.reply({
      embeds: [{
        color: Colors.PRIMARY,
        title: `📊 Statistiques — ${guild.name}`,
        thumbnail: { url: guild.iconURL({ dynamic: true }) || '' },
        fields: [
          { name: '👥 Membres',          value: `${humans} humains / ${bots} bots`, inline: true },
          { name: '🟢 En ligne',          value: `${online}`,                       inline: true },
          { name: '🔑 Licences vérifiées', value: `${licensesCount}`,               inline: true },
          { name: '🎫 Tickets ouverts',    value: `${ticketsOpen}`,                 inline: true },
          { name: '🤖 Uptime bot',         value: uptimeStr,                        inline: true },
          { name: '💾 Mémoire',            value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} Mo`, inline: true },
        ],
        footer: { text: `Serveur créé le ${guild.createdAt.toLocaleDateString('fr-FR')}` },
        timestamp: new Date().toISOString(),
      }],
    });
  },
};

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}j`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}min`);
  if (!parts.length) parts.push(`${s}s`);
  return parts.join(' ');
}
