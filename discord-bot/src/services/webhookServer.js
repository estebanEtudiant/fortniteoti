'use strict';

/**
 * Serveur HTTP interne pour recevoir les notifications du backend NestJS.
 * Le backend appelle POST /webhook/sale après chaque paiement Stripe confirmé.
 *
 * Sécurité : le header x-bot-secret doit correspondre à BOT_API_SECRET.
 */

const http   = require('http');
const config = require('../config/config');
const Colors = require('../config/colors');
const logger = require('./logger');

const PLAN_LABELS = {
  DAYS_1:   '1 Jour',
  DAYS_7:   '7 Jours',
  DAYS_14:  '14 Jours',
  DAYS_30:  '30 Jours',
  DAYS_90:  '90 Jours',
  DAYS_365: '1 An',
  LIFETIME: 'Lifetime',
};

function start(client) {
  const server = http.createServer((req, res) => {
    // Vérification du secret
    const secret = req.headers['x-bot-secret'];
    if (secret !== config.api.secret) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    if (req.method !== 'POST') {
      res.writeHead(405);
      return res.end();
    }

    let body = '';
    req.on('data', chunk => (body += chunk.toString()));
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        await route(client, req.url, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        logger.error('webhookServer handler error:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal error' }));
      }
    });
  });

  server.listen(config.webhook.port, '127.0.0.1', () => {
    logger.info(`Webhook server écoute sur le port ${config.webhook.port} (127.0.0.1 only).`);
  });

  server.on('error', (err) => logger.error('webhookServer error:', err));
}

async function route(client, url, data) {
  if (url === '/webhook/sale') return handleSale(client, data);
  logger.warn(`webhookServer: route inconnue ${url}`);
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
