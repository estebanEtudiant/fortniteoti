'use strict';

/**
 * Scheduler : tâches périodiques du bot.
 *  - Vérifie toutes les 60 s les mutes expirés et retire le rôle Muted.
 *  - Vérifie toutes les 10 min les licences expirées et retire les rôles plan.
 */

const config = require('../config/config');
const { stmts } = require('./database');
const logger = require('./logger');
const backup = require('./backup');

async function checkExpiredMutes(client) {
  const expired = stmts.getExpiredMutes.all();
  for (const row of expired) {
    try {
      const guild = client.guilds.cache.get(row.guild_id);
      if (!guild) continue;

      const member = await guild.members.fetch(row.discord_id).catch(() => null);
      if (member && config.roles.muted) {
        await member.roles.remove(config.roles.muted, 'Mute expiré automatiquement').catch(() => {});
      }
      stmts.removeMute.run(row.discord_id, row.guild_id);
      logger.info(`Mute expiré retiré : ${row.discord_id} sur ${row.guild_id}`);
    } catch (e) {
      logger.error('scheduler.checkExpiredMutes:', e);
    }
  }
}

async function checkExpiredLicenses(client) {
  const now = Math.floor(Date.now() / 1000);
  const { db } = require('./database');
  const expired = db.prepare(
    'SELECT * FROM verifications WHERE expires_at IS NOT NULL AND expires_at < ?'
  ).all(now);

  for (const row of expired) {
    for (const guild of client.guilds.cache.values()) {
      try {
        const member = await guild.members.fetch(row.discord_id).catch(() => null);
        if (!member) continue;

        // Retirer tous les rôles plan
        const planRoles = Object.values(config.roles.plans).filter(Boolean);
        await member.roles.remove(planRoles, 'Licence expirée').catch(() => {});

        // Notifier le membre en DM
        await member.send({
          embeds: [{
            color: 0xED4245,
            title: '⚠️ Votre licence FortniteOpti a expiré',
            description: 'Votre accès membre a été révoqué.\nRendez-vous sur le site pour renouveler votre licence.',
            timestamp: new Date().toISOString(),
          }],
        }).catch(() => {});

        logger.info(`Rôles plan retirés (licence expirée) : ${row.discord_id}`);
      } catch (e) {
        logger.error('scheduler.checkExpiredLicenses:', e);
      }
    }
    // Supprime la vérification expirée
    stmts.deleteVerification.run(row.discord_id);
  }
}

async function sendExpiryReminders(client) {
  const { db } = require('./database');
  const now    = Math.floor(Date.now() / 1000);
  const in3d   = now + 3 * 24 * 3600;
  const in3dPlusWindow = in3d + 3600; // fenêtre d'1 heure autour de J-3

  const soon = db.prepare(`
    SELECT * FROM verifications
    WHERE expires_at IS NOT NULL
      AND expires_at BETWEEN ? AND ?
      AND (reminder_sent IS NULL OR reminder_sent = 0)
  `).all(in3d, in3dPlusWindow);

  const markSent = db.prepare('UPDATE verifications SET reminder_sent = 1 WHERE discord_id = ?');

  for (const row of soon) {
    for (const guild of client.guilds.cache.values()) {
      try {
        const member = await guild.members.fetch(row.discord_id).catch(() => null);
        if (!member) continue;

        const expiry = new Date(row.expires_at * 1000).toLocaleDateString('fr-FR', {
          day: '2-digit', month: 'long', year: 'numeric',
        });

        await member.send({
          embeds: [{
            color: 0xFEE75C,
            title: '⏳ Votre licence FortniteOpti expire dans 3 jours',
            description: [
              `Votre licence (plan **${row.plan}**) expire le **${expiry}**.`,
              '',
              'Renouvelez dès maintenant pour conserver votre accès et vos avantages Discord sans interruption.',
            ].join('\n'),
            footer:    { text: 'FortniteOpti — Rappel automatique' },
            timestamp: new Date().toISOString(),
          }],
        }).catch(() => {});

        markSent.run(row.discord_id);
        logger.info(`[REMINDER J-3] Rappel envoyé à ${row.discord_id} — plan ${row.plan}`);
      } catch (e) {
        logger.error('scheduler.sendExpiryReminders:', e);
      }
    }
  }
}

function scheduleDaily(fn, client) {
  // Calcule le délai jusqu'à minuit
  const now    = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const delay = midnight.getTime() - now.getTime();

  setTimeout(() => {
    fn(client).catch(() => {});
    setInterval(() => fn(client).catch(() => {}), 24 * 60 * 60_000);
  }, delay);
}

function start(client) {
  // Mutes : vérification toutes les 60 secondes
  setInterval(() => checkExpiredMutes(client), 60_000);

  // Licences expirées : vérification toutes les 10 minutes
  setInterval(() => checkExpiredLicenses(client), 10 * 60_000);

  // Rappels J-3 : vérification toutes les heures
  setInterval(() => sendExpiryReminders(client), 60 * 60_000);
  sendExpiryReminders(client).catch(() => {});

  // Backup SQLite : tous les jours à minuit
  scheduleDaily(backup.runBackup, client);

  logger.info('Scheduler démarré (mutes: 60s, licences: 10min, rappels: 1h, backup: minuit).');
}

module.exports = { start };
