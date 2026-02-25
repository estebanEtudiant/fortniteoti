'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Colors     = require('../../config/colors');
const { db }     = require('../../services/database');
const licenseApi = require('../../services/licenseApi');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Affiche les KPIs clés du projet (staff uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // ── Données locales (SQLite bot) ──────────────────────────────────
    const ticketsOpen   = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'open'").get().c;
    const ticketsToday  = db.prepare(`
      SELECT COUNT(*) as c FROM tickets
      WHERE created_at >= strftime('%s','now','start of day')
    `).get().c;
    const verified      = db.prepare('SELECT COUNT(*) as c FROM verifications').get().c;
    const expiringSoon  = db.prepare(`
      SELECT COUNT(*) as c FROM verifications
      WHERE expires_at IS NOT NULL AND expires_at BETWEEN strftime('%s','now') AND strftime('%s','now','+24 hours')
    `).get().c;

    // ── Données distantes (backend) ───────────────────────────────────
    const remote = await licenseApi.getDashboard();

    // ── Membres Discord ───────────────────────────────────────────────
    const guild      = interaction.guild;
    const members    = guild.memberCount;
    const online     = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;

    const salesToday   = remote?.salesToday   ?? '—';
    const salesMonth   = remote?.salesMonth   ?? '—';
    const revenueToday = remote?.revenueToday != null ? `${(remote.revenueToday / 100).toFixed(2)} €` : '—';
    const revenueMonth = remote?.revenueMonth != null ? `${(remote.revenueMonth / 100).toFixed(2)} €` : '—';

    return interaction.editReply({
      embeds: [{
        color: Colors.PRIMARY,
        title: '📊 Dashboard — 404 Tweaks',
        fields: [
          // Ventes
          { name: '🛒 Ventes aujourd\'hui', value: `${salesToday}`,   inline: true },
          { name: '📅 Ventes ce mois',      value: `${salesMonth}`,   inline: true },
          { name: '\u200B',                  value: '\u200B',           inline: true },
          { name: '💶 CA aujourd\'hui',      value: revenueToday,       inline: true },
          { name: '💶 CA ce mois',           value: revenueMonth,       inline: true },
          { name: '\u200B',                  value: '\u200B',           inline: true },
          // Support
          { name: '🎫 Tickets ouverts',      value: `${ticketsOpen}`,  inline: true },
          { name: '🎫 Tickets ouverts auj.', value: `${ticketsToday}`, inline: true },
          { name: '\u200B',                  value: '\u200B',           inline: true },
          // Licences
          { name: '🔑 Licences vérifiées',   value: `${verified}`,     inline: true },
          { name: '⚠️ Expirent dans 24h',    value: `${expiringSoon}`, inline: true },
          { name: '\u200B',                  value: '\u200B',           inline: true },
          // Serveur
          { name: '👥 Membres',             value: `${members}`,       inline: true },
          { name: '🟢 En ligne',            value: `${online}`,         inline: true },
        ],
        footer:    { text: `Demandé par ${interaction.user.tag}` },
        timestamp: new Date().toISOString(),
      }],
    });
  },
};
