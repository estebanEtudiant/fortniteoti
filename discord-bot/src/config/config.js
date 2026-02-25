'use strict';
require('dotenv').config();

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Variable d'environnement manquante : ${name}`);
  return val;
}

const config = {
  discord: {
    token:    required('DISCORD_TOKEN'),
    clientId: required('CLIENT_ID'),
    guildId:  process.env.GUILD_ID || null,
  },

  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
    secret:  required('BOT_API_SECRET'),
  },

  roles: {
    member:    process.env.ROLE_MEMBER    || null,
    muted:     process.env.ROLE_MUTED     || null,
    moderator: process.env.ROLE_MODERATOR || null,
    plans: {
      DAYS_1:  process.env.ROLE_PLAN_DAYS_1  || null,
      DAYS_7:  process.env.ROLE_PLAN_DAYS_7  || null,
      DAYS_14: process.env.ROLE_PLAN_DAYS_14 || null,
    },
  },

  channels: {
    welcome:        process.env.CHANNEL_WELCOME   || null,
    logs:           process.env.CHANNEL_LOGS      || null,
    sales:          process.env.CHANNEL_SALES     || null,
    backup:         process.env.CHANNEL_BACKUP    || null,
    ticketCategory: process.env.CATEGORY_TICKETS  || null,
  },

  webhook: {
    port: parseInt(process.env.WEBHOOK_PORT || '3001', 10),
  },

  monitor: {
    storefrontUrl:   process.env.STOREFRONT_URL   || 'http://localhost:3002',
    downloadUrl:     process.env.DOWNLOAD_URL     || null,
    intervalMs:      parseInt(process.env.STATUS_INTERVAL_MS || '60000', 10),
  },

  automod: {
    spamThreshold: parseInt(process.env.AUTOMOD_SPAM_THRESHOLD || '5', 10),
    spamWindowMs:  parseInt(process.env.AUTOMOD_SPAM_WINDOW_MS || '5000', 10),
  },

  db: {
    path: process.env.DB_PATH || './data/bot.sqlite',
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

module.exports = config;
