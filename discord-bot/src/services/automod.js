'use strict';

/**
 * Service d'auto-modération.
 * Règles actives :
 *   1. Anti-spam        : >N messages en <W ms → mute 10 min + avertissement
 *   2. Anti-invite      : lien discord.gg → suppression + avertissement
 *   3. Anti-mass-mention: >5 mentions en un message → suppression + avertissement
 */

const config  = require('../config/config');
const { stmts } = require('./database');
const logger  = require('./logger');

// Map<userId, { count: number, firstAt: number }>
const spamMap = new Map();

// Nettoyage de la map toutes les 30s pour éviter les fuites mémoire
setInterval(() => {
  const cutoff = Date.now() - config.automod.spamWindowMs * 4;
  for (const [id, entry] of spamMap.entries()) {
    if (entry.firstAt < cutoff) spamMap.delete(id);
  }
}, 30_000);

const INVITE_RE = /discord\.gg\/[a-zA-Z0-9]+/i;

/**
 * Point d'entrée principal : appelé depuis messageCreate.
 * @returns {boolean} true si le message a été traité par l'automod
 */
async function check(message) {
  // Ignore bots, DMs, et modérateurs
  if (message.author.bot) return false;
  if (!message.guild)     return false;

  const member = message.member;
  if (!member) return false;

  // Les modérateurs sont exemptés
  if (config.roles.moderator && member.roles.cache.has(config.roles.moderator)) return false;
  if (member.permissions.has(8n)) return false; // Administrator

  // 1. Anti-mass-mention
  if (message.mentions.users.size + message.mentions.roles.size > 5) {
    await message.delete().catch(() => {});
    await warn(message, 'Mass-mention détectée (trop de mentions dans un seul message).');
    return true;
  }

  // 2. Anti-invite Discord
  if (INVITE_RE.test(message.content)) {
    await message.delete().catch(() => {});
    await warn(message, 'Publication d\'une invitation Discord non autorisée.');
    return true;
  }

  // 3. Anti-spam
  const now = Date.now();
  const entry = spamMap.get(message.author.id) || { count: 0, firstAt: now };

  if (now - entry.firstAt > config.automod.spamWindowMs) {
    // Fenêtre expirée → reset
    entry.count  = 1;
    entry.firstAt = now;
  } else {
    entry.count++;
  }

  spamMap.set(message.author.id, entry);

  if (entry.count >= config.automod.spamThreshold) {
    spamMap.delete(message.author.id);
    await applySpamMute(message);
    return true;
  }

  return false;
}

async function warn(message, reason) {
  // Enregistre en base
  stmts.addInfraction.run({
    guild_id:     message.guild.id,
    user_id:      message.author.id,
    moderator_id: message.client.user.id,
    type:         'warn',
    reason,
    duration:     null,
  });

  // Notifie le membre
  await message.channel.send({
    content: `${message.author}`,
    embeds: [{
      color:       0xFEE75C,
      description: `⚠️ **Avertissement automatique** : ${reason}`,
    }],
  }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 8000)).catch(() => {});

  logAutomod(message, 'WARN', reason);
}

async function applySpamMute(message) {
  if (!config.roles.muted) {
    logger.warn('automod: ROLE_MUTED non configuré — mute ignoré.');
    return;
  }

  const duration = 10 * 60; // 10 minutes
  const expiresAt = Math.floor(Date.now() / 1000) + duration;
  const reason = 'Spam automatique détecté';

  try {
    await message.member.roles.add(config.roles.muted, reason);
    stmts.addMute.run(message.author.id, message.guild.id, expiresAt);
    stmts.addInfraction.run({
      guild_id:     message.guild.id,
      user_id:      message.author.id,
      moderator_id: message.client.user.id,
      type:         'mute',
      reason,
      duration,
    });

    await message.channel.send({
      embeds: [{
        color:       0xED4245,
        description: `🔇 ${message.author} a été muté **10 minutes** pour spam.`,
      }],
    }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 10000)).catch(() => {});

    logAutomod(message, 'MUTE (spam)', reason);
  } catch (err) {
    logger.error('automod.applySpamMute:', err);
  }
}

function logAutomod(message, action, reason) {
  if (!config.channels.logs) return;
  const channel = message.guild.channels.cache.get(config.channels.logs);
  if (!channel) return;

  channel.send({
    embeds: [{
      color:  0xFEE75C,
      title:  `🤖 Auto-mod — ${action}`,
      fields: [
        { name: 'Utilisateur', value: `${message.author.tag} (${message.author.id})`, inline: true },
        { name: 'Salon',       value: `${message.channel}`,                            inline: true },
        { name: 'Raison',      value: reason },
      ],
      timestamp: new Date().toISOString(),
    }],
  }).catch(() => {});

  logger.info(`[AUTOMOD] ${action} — ${message.author.tag} — ${reason}`);
}

module.exports = { check };
