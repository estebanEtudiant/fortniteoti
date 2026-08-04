'use strict';

/**
 * Serveur HTTP interne pour recevoir les notifications du backend NestJS.
 * Le backend appelle POST /webhook/sale après chaque paiement Stripe confirmé.
 *
 * Sécurité : le header x-bot-secret doit correspondre à BOT_API_SECRET.
 */

const http   = require('http');
const crypto = require('crypto');
const config = require('../config/config');
const Colors = require('../config/colors');
const logger = require('./logger');

const PLAN_LABELS = {
  DAYS_1:   '1 Jour',
  DAYS_3:   '3 Jours',
  DAYS_7:   '7 Jours',
  DAYS_14:  '14 Jours',
  DAYS_30:  '30 Jours',
  DAYS_90:  '90 Jours',
  DAYS_365: '1 An',
  LIFETIME: 'Lifetime',
};

function start(client) {
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405);
      return res.end();
    }

    const secretHeader = req.headers['x-bot-secret'];
    const secret = Array.isArray(secretHeader) ? secretHeader[0] : secretHeader;
    const expected = Buffer.from(config.api.secret);
    const provided = Buffer.from(typeof secret === 'string' ? secret : '');

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    let body = '';
    let aborted = false;
    req.on('data', chunk => {
      if (aborted) return;
      body += chunk.toString();
      if (Buffer.byteLength(body, 'utf8') > config.webhook.maxBodyBytes) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (aborted) return;
      let data;
      try {
        data = JSON.parse(body);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
      // On répond dès que le payload est validé : l'envoi Discord (route()) peut prendre
      // plus longtemps que le timeout du fetch côté backend, notamment avec des images.
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      route(client, req.url, data).catch((err) => logger.error('webhookServer route error:', err));
    });
  });

  server.listen(config.webhook.port, '127.0.0.1', () => {
    logger.info(`Webhook server écoute sur le port ${config.webhook.port} (127.0.0.1 only).`);
  });

  server.on('error', (err) => logger.error('webhookServer error:', err));
}

async function route(client, url, data) {
  if (url === '/webhook/sale') return handleSale(client, data);
  if (url === '/webhook/update') return handleUpdate(client, data);
  logger.warn(`webhookServer: route inconnue ${url}`);
}

function parseEmbedColor(input, fallback) {
  if (!input) return fallback;
  const n = parseInt(String(input).replace('#', ''), 16);
  return Number.isFinite(n) ? n : fallback;
}

async function handleUpdate(client, data) {
  const channelId = data.channelId || config.channels.update;
  if (!channelId) return logger.warn('webhookServer.handleUpdate: aucun salon configuré.');
  const hasFields = Array.isArray(data.fields) && data.fields.length > 0;
  if (!data.title && !data.message && !hasFields) return logger.warn('webhookServer.handleUpdate: contenu manquant.');

  const embed = {
    color:       parseEmbedColor(data.color, Colors.INFO),
    title:       data.title || null,
    url:         data.url || undefined,
    description: data.message || null,
    author:      data.authorName
      ? { name: data.authorName, icon_url: data.authorIconUrl || undefined, url: data.authorUrl || undefined }
      : undefined,
    fields: hasFields
      ? data.fields
          .filter((f) => f && f.name && f.value)
          .slice(0, 25)
          .map((f) => ({ name: String(f.name).slice(0, 256), value: String(f.value).slice(0, 1024), inline: !!f.inline }))
      : undefined,
    thumbnail: data.thumbnailUrl ? { url: data.thumbnailUrl } : undefined,
    image:     data.imageUrl ? { url: data.imageUrl } : undefined,
    footer:    data.footerText ? { text: data.footerText, icon_url: data.footerIconUrl || undefined } : undefined,
    timestamp: data.showTimestamp === false ? undefined : new Date().toISOString(),
  };

  for (const guild of client.guilds.cache.values()) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) continue;

    await channel.send({
      content: data.mentionEveryone ? '@everyone' : undefined,
      embeds: [embed],
    }).catch((err) => logger.warn('webhookServer.handleUpdate send:', err.message));

    logger.info(`[UPDATE] "${data.title || ''}" publié dans #${channel.name}`);
  }
}

async function handleSale(client, data) {
  if (!config.channels.sales) return;

  const planLabel = PLAN_LABELS[data.plan] || data.plan || 'N/A';
  const amount    = data.amount ? `${(data.amount / 100).toFixed(2)} €` : null;

  for (const guild of client.guilds.cache.values()) {
    const channel = guild.channels.cache.get(config.channels.sales);
    if (!channel) continue;

    await channel.send({
      embeds: [{
        color:  Colors.SUCCESS,
        title:  '🛒 Nouvelle vente !',
        fields: [
          { name: 'Plan',    value: planLabel,          inline: true },
          ...(amount ? [{ name: 'Montant', value: amount, inline: true }] : []),
          { name: 'Total',   value: data.totalToday ? `${data.totalToday} vente(s) aujourd'hui` : '—', inline: true },
        ],
        footer:    { text: 'FortniteOpti — Vente confirmée' },
        timestamp: new Date().toISOString(),
      }],
    }).catch((err) => logger.warn('webhookServer.handleSale send:', err.message));

    logger.info(`[VENTE] Plan ${planLabel}${amount ? ` — ${amount}` : ''}`);
  }
}

module.exports = { start };
