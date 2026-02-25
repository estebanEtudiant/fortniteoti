'use strict';

/**
 * Status Monitor — vérifie toutes les N secondes l'état des services
 * et met à jour un embed Discord fixe dans le salon #status.
 *
 * Services surveillés :
 *   - API Backend (NestJS)
 *   - Base de données PostgreSQL  (via /health/detailed)
 *   - Cache Redis                 (via /health/detailed)
 *   - Storefront (React)
 *   - Stripe                      (via /health/detailed)
 */

const config = require('../config/config');
const { stmts } = require('./database');
const logger = require('./logger');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fait un GET HTTP avec timeout, retourne { ok, latencyMs, body? }.
 */
async function httpGet(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const latencyMs = Date.now() - t0;
    let body = null;
    try { body = await res.json(); } catch { /* pas du JSON */ }
    return { ok: res.ok, latencyMs, body };
  } catch {
    return { ok: false, latencyMs: Date.now() - t0, body: null };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Construire l'embed ───────────────────────────────────────────────────────

function statusLine(label, status, detail = '') {
  const icon = status === 'ok'             ? '🟢'
             : status === 'degraded'       ? '🟡'
             : status === 'configured'     ? '🟡'
             : status === 'not_configured' ? '⚫'
             : '🔴';

  const text = status === 'ok'             ? 'En ligne'
             : status === 'degraded'       ? 'Dégradé'
             : status === 'configured'     ? 'Configuré'
             : status === 'not_configured' ? 'Non configuré'
             : 'Hors ligne';

  const suffix = detail ? `  \`${detail}\`` : '';
  return `${icon} **${label}**  —  ${text}${suffix}`;
}

function buildEmbed(results) {
  const allOk = Object.values(results).every(r => r.status === 'ok' || r.status === 'configured');
  const hasError = Object.values(results).some(r => r.status === 'error');

  const color = hasError ? 0xED4245  // rouge
              : allOk   ? 0x57F287  // vert
              : 0xFEE75C;            // jaune (dégradé)

  const overallText = hasError ? '🔴 Incident en cours'
                    : allOk   ? '🟢 Tous les systèmes sont opérationnels'
                    : '🟡 Dégradé';

  const serviceRows = [
    ['API Backend',     results.api],
    ['Base de données', results.database],
    ['Cache Redis',     results.redis],
    ['Site web',        results.storefront],
    ...(results.download ? [['Téléchargement de 404 Tweaks', results.download]] : []),
    ['Stripe',          results.stripe],
  ];

  const lines = serviceRows
    .map(([label, r]) => r ? statusLine(label, r.status, r.latencyMs ? `${r.latencyMs} ms` : '') : null)
    .filter(Boolean)
    .join('\n');

  const nextUpdate = Math.floor((Date.now() + config.monitor.intervalMs) / 1000);

  return {
    color,
    title: '📡 Statut des services — 404 Tweaks',
    description: `**${overallText}**\n\u200B`,
    fields: [
      { name: 'Services', value: lines },
    ],
    footer: { text: `Prochaine vérification <t:${nextUpdate}:R>` },
    timestamp: new Date().toISOString(),
  };
}

// ─── Vérification ─────────────────────────────────────────────────────────────

async function runCheck(client) {
  const row = stmts.getStatusMessage.get();
  if (!row) return; // Aucun embed configuré

  const results = {};

  // 1. API Backend + DB + Redis + Stripe (via /health/detailed)
  const health = await httpGet(`${config.api.baseUrl}/health/detailed`, 6000);
  if (health.ok && health.body?.services) {
    results.api      = { status: 'ok',         latencyMs: health.latencyMs };
    results.database = health.body.services.database || { status: 'error' };
    results.redis    = health.body.services.redis    || { status: 'error' };
    results.stripe   = health.body.services.stripe   || { status: 'not_configured' };
  } else {
    // Backend entièrement offline
    results.api      = { status: 'error', latencyMs: health.latencyMs };
    results.database = { status: 'error' };
    results.redis    = { status: 'error' };
    results.stripe   = { status: 'error' };
  }

  // 2. Storefront
  const sf = await httpGet(config.monitor.storefrontUrl, 5000);
  results.storefront = { status: sf.ok ? 'ok' : 'error', latencyMs: sf.latencyMs };

  // 3. Lien de téléchargement (si configuré)
  if (config.monitor.downloadUrl) {
    const dl = await httpGet(config.monitor.downloadUrl, 8000);
    // Une réponse 200-499 = le serveur répond (même 404 = hébergeur en ligne)
    // 5xx ou timeout = vraiment offline
    const dlOk = dl.ok || (dl.latencyMs < 8000 && dl.latencyMs > 0);
    results.download = { status: dlOk ? 'ok' : 'error', latencyMs: dl.latencyMs };
  }

  // 3. Mettre à jour l'embed
  try {
    const guild   = client.guilds.cache.get(row.guild_id);
    if (!guild) return;

    const channel = guild.channels.cache.get(row.channel_id);
    if (!channel) return;

    const message = await channel.messages.fetch(row.message_id).catch(() => null);
    if (!message) {
      // Message supprimé — on réinitialise
      stmts.deleteStatusMessage.run();
      logger.warn('statusMonitor: message de statut introuvable, réinitialisez avec /setstatus.');
      return;
    }

    await message.edit({ embeds: [buildEmbed(results)] });

    const statuses = Object.entries(results)
      .map(([k, v]) => `${k}:${v.status}`)
      .join(' | ');
    logger.debug(`[STATUS] ${statuses}`);
  } catch (err) {
    logger.error('statusMonitor.runCheck:', err);
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Construit et retourne l'embed initial (pour /setstatus).
 */
function buildInitialEmbed() {
  const initial = {
    api:        { status: 'degraded' },
    database:   { status: 'degraded' },
    redis:      { status: 'degraded' },
    storefront: { status: 'degraded' },
    stripe:     { status: 'degraded' },
  };
  if (config.monitor.downloadUrl) {
    initial.download = { status: 'degraded' };
  }
  return buildEmbed(initial);
}

/**
 * Démarre le monitor périodique.
 */
function start(client) {
  const intervalMs = config.monitor.intervalMs;
  setInterval(() => runCheck(client), intervalMs);
  // Première vérification dans 5s (laisse le bot finir de démarrer)
  setTimeout(() => runCheck(client), 5000);
  logger.info(`Status monitor démarré (intervalle: ${intervalMs / 1000}s).`);
}

module.exports = { start, buildInitialEmbed, runCheck };
