'use strict';
require('dotenv').config();
const path = require('path');

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Variable d'environnement manquante : ${name}`);
  return val;
}

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
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
    reviews:        process.env.CHANNEL_REVIEWS   || '1476353103878947101',
    update:         process.env.CHANNEL_UPDATES   || null,
  },

  webhook: {
    port: parsePositiveInt(process.env.WEBHOOK_PORT || '3001', 3001),
    maxBodyBytes: parsePositiveInt(process.env.WEBHOOK_MAX_BODY_BYTES || '16384', 16384),
  },

  monitor: {
    storefrontUrl:   process.env.STOREFRONT_URL   || 'http://localhost:3002',
    downloadUrl:     process.env.DOWNLOAD_URL     || null,
    intervalMs:      parsePositiveInt(process.env.STATUS_INTERVAL_MS || '60000', 60000),
  },

  automod: {
    spamThreshold: parsePositiveInt(process.env.AUTOMOD_SPAM_THRESHOLD || '5', 5),
    spamWindowMs:  parsePositiveInt(process.env.AUTOMOD_SPAM_WINDOW_MS || '5000', 5000),
  },

  db: {
    path: path.resolve(process.env.DB_PATH || './data/bot.sqlite'),
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },

  ng: {
    guildId:         process.env.NG_GUILD_ID          || null,
    channelWelcome:  process.env.NG_CHANNEL_WELCOME   || null,
    channelGiveaway: process.env.NG_CHANNEL_GIVEAWAY  || null,
    channelStatus:   process.env.NG_CHANNEL_STATUS    || null,
    storefrontUrl:   process.env.NG_STOREFRONT_URL    || 'https://404tweaks.tech/404Client',
    roleMember:      process.env.NG_ROLE_MEMBER       || null,
  },
};

module.exports = config;
