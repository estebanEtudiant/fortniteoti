'use strict';

const config = require('../config/config');
const { stmts } = require('./database');
const logger = require('./logger');

async function httpGet(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const headers = url.includes('/health/detailed')
      ? { 'x-bot-secret': config.api.secret }
      : undefined;
    const res = await fetch(url, { signal: controller.signal, headers });
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

function statusLine(label, status, detail = '') {
  const icon = status === 'ok'             ? '\u{1F7E2}'
             : status === 'degraded'       ? '\u{1F7E1}'
             : status === 'configured'     ? '\u{1F7E1}'
             : status === 'not_configured' ? '⚫'
             : '\u{1F534}';

  const text = status === 'ok'             ? 'En ligne'
             : status === 'degraded'       ? 'Dégradé'
             : status === 'configured'     ? 'Configuré'
             : status === 'not_configured' ? 'Non configuré'
             : 'Hors ligne';

  const suffix = detail ? `  \`${detail}\`` : '';
  return `${icon} **${label}**  —  ${text}${suffix}`;
}

function buildEmbed(results) {
  const allOk = Object.values(results).every(r => r.status === 'ok');
  const hasError = Object.values(results).some(r => r.status === 'error');

  const color = hasError ? 0xED4245 : allOk ? 0x57F287 : 0xFEE75C;

  const overallText = hasError ? '\u{1F534} Incident en cours'
                    : allOk   ? '\u{1F7E2} Tous les systèmes sont opérationnels'
                    : '\u{1F7E1} Dégradé';

  const serviceRows = [
    ['API Backend',              results.api],
    ['Site web',                 results.storefront],
    ['Téléchargement de 404 Tweaks', results.download],
  ];

  const lines = serviceRows
    .map(([label, r]) => r ? statusLine(label, r.status, r.latencyMs ? `${r.latencyMs} ms` : '') : null)
    .filter(Boolean)
    .join('\n');

  const nextUpdate = Math.floor((Date.now() + config.monitor.intervalMs) / 1000);

  return {
    color,
    title: '\u{1F4E1} Statut des services — 404 Tweaks',
    description: `**${overallText}**`,
    fields: [
      { name: 'Services', value: lines },
      { name: 'Prochaine vérification', value: `<t:${nextUpdate}:R>`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
}

function buildNgEmbed(results) {
  const allOk = Object.values(results).every(r => r.status === 'ok');
  const hasError = Object.values(results).some(r => r.status === 'error');

  const color = hasError ? 0xED4245 : allOk ? 0x57F287 : 0xFEE75C;

  const overallText = hasError ? '\u{1F534} Incident en cours'
                    : allOk   ? '\u{1F7E2} Tous les systèmes sont opérationnels'
                    : '\u{1F7E1} Dégradé';

  const serviceRows = [
    ['API Backend',    results.api],
    ['404 Client',     results.storefront],
    ['Téléchargement', results.download],
  ];

  const lines = serviceRows
    .map(([label, r]) => r ? statusLine(label, r.status, r.latencyMs ? `${r.latencyMs} ms` : '') : null)
    .filter(Boolean)
    .join('\n');

  const nextUpdate = Math.floor((Date.now() + config.monitor.intervalMs) / 1000);

  return {
    color,
    title: '\u{1F4E1} Statut des services — 404 Client',
    description: `**${overallText}**`,
    fields: [
      { name: 'Services', value: lines },
      { name: 'Prochaine vérification', value: `<t:${nextUpdate}:R>`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
}

async function runCheck(client) {
  // ─── Vérification commune (API + services) ───────────────────────────────
  const health = await httpGet(`${config.api.baseUrl}/health/detailed`, 6000);

  const apiResult = health.ok && health.body?.services
    ? { status: 'ok', latencyMs: health.latencyMs }
    : { status: 'error', latencyMs: health.latencyMs };

  // ─── FTN ─────────────────────────────────────────────────────────────────
  const ftnRow = stmts.getStatusMessage.get();
  if (ftnRow) {
    try {
      const results = {};
      results.api = apiResult;

      const sf = await httpGet(config.monitor.storefrontUrl, 5000);
      results.storefront = { status: sf.ok ? 'ok' : 'error', latencyMs: sf.latencyMs };

      if (config.monitor.downloadUrl) {
        const dl = await httpGet(config.monitor.downloadUrl, 8000);
        const dlOk = dl.ok || (dl.latencyMs < 8000 && dl.latencyMs > 0);
        results.download = { status: dlOk ? 'ok' : 'error', latencyMs: dl.latencyMs };
      }

      const guild = client.guilds.cache.get(ftnRow.guild_id);
      const channel = guild?.channels.cache.get(ftnRow.channel_id);
      if (channel) {
        const message = await channel.messages.fetch(ftnRow.message_id).catch(() => null);
        if (!message) {
          stmts.deleteStatusMessage.run();
          logger.warn('statusMonitor FTN: message introuvable, réinitialisez avec /setstatus.');
        } else {
          await message.edit({ embeds: [buildEmbed(results)] });
        }
      }
    } catch (err) {
      logger.error('statusMonitor.runCheck FTN:', err);
    }
  }

  // ─── NG ──────────────────────────────────────────────────────────────────
  const ngRow = stmts.getNgStatusMessage.get();
  if (ngRow) {
    try {
      const results = {};
      results.api = apiResult;

      const sf = await httpGet(config.ng.storefrontUrl, 5000);
      results.storefront = { status: sf.ok ? 'ok' : 'error', latencyMs: sf.latencyMs };

      if (config.monitor.downloadUrl) {
        const dl = await httpGet(config.monitor.downloadUrl, 8000);
        const dlOk = dl.ok || (dl.latencyMs < 8000 && dl.latencyMs > 0);
        results.download = { status: dlOk ? 'ok' : 'error', latencyMs: dl.latencyMs };
      }

      const guild = client.guilds.cache.get(ngRow.guild_id);
      const channel = guild?.channels.cache.get(ngRow.channel_id);
      if (channel) {
        const message = await channel.messages.fetch(ngRow.message_id).catch(() => null);
        if (!message) {
          stmts.deleteNgStatusMessage.run();
          logger.warn('statusMonitor NG: message introuvable, réinitialisez avec /ngsetstatus.');
        } else {
          await message.edit({ embeds: [buildNgEmbed(results)] });
        }
      }
    } catch (err) {
      logger.error('statusMonitor.runCheck NG:', err);
    }
  }
}

function buildInitialEmbed() {
  const initial = {
    api:        { status: 'degraded' },
    database:   { status: 'degraded' },
    redis:      { status: 'degraded' },
    storefront: { status: 'degraded' },
    stripe:     { status: 'degraded' },
  };
  if (config.monitor.downloadUrl) initial.download = { status: 'degraded' };
  return buildEmbed(initial);
}

function buildInitialNgEmbed() {
  const initial = {
    api:        { status: 'degraded' },
    storefront: { status: 'degraded' },
    download:   { status: 'degraded' },
  };
  return buildNgEmbed(initial);
}

function start(client) {
  const intervalMs = config.monitor.intervalMs;
  setInterval(() => runCheck(client), intervalMs);
  setTimeout(() => runCheck(client), 5000);
  logger.info(`Status monitor démarré (intervalle: ${intervalMs / 1000}s).`);
}

module.exports = { start, buildInitialEmbed, buildInitialNgEmbed, runCheck };
