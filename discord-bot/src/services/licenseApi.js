'use strict';

/**
 * Service d'accès à l'API FortniteOpti depuis le bot.
 *
 * Endpoint backend requis :
 *   POST /api/v1/bot/verify-license
 *     Header : x-bot-secret: <BOT_API_SECRET>
 *     Body   : { key: string, discordId: string }
 *     Réponse OK (200) :
 *       { valid: true, plan: "DAYS_1"|"DAYS_7"|"DAYS_14", expiresAt: ISO8601|null, customerName: string }
 *     Réponse KO (400/404) :
 *       { valid: false, reason: string }
 *
 *   GET /api/v1/bot/license-status/:discordId
 *     Header : x-bot-secret: <BOT_API_SECRET>
 *     Réponse OK (200) :
 *       { valid: true, plan, expiresAt, licenseKey, customerName }
 *     Réponse KO (404) :
 *       { valid: false }
 */

const axios  = require('axios');
const config = require('../config/config');
const logger = require('./logger');

const client = axios.create({
  baseURL: config.api.baseUrl,
  timeout: 8000,
  headers: { 'x-bot-secret': config.api.secret },
});

/**
 * Vérifie une licence et l'associe à un compte Discord.
 * @returns {{ valid: boolean, plan?: string, expiresAt?: string|null, customerName?: string, reason?: string }}
 */
async function verifyLicense(key, discordId) {
  try {
    const { data } = await client.post('/bot/verify-license', { key, discordId });
    return data;
  } catch (err) {
    const status = err.response?.status;
    const body   = err.response?.data;

    logger.error(`licenseApi.verifyLicense HTTP ${status ?? 'N/A'}:`, body ?? err.message);

    if (status === 401) return { valid: false, reason: 'Erreur de configuration bot (secret invalide). Contacte un admin.' };
    if (status === 404) return { valid: false, reason: 'Route API introuvable — le backend n\'a pas été redémarré.' };
    if (body?.reason)   return { valid: false, reason: body.reason };
    if (body?.message)  return { valid: false, reason: body.message };
    return { valid: false, reason: 'Service temporairement indisponible.' };
  }
}

/**
 * Récupère le statut de la licence liée à un Discord ID.
 * @returns {{ valid: boolean, plan?: string, expiresAt?: string|null, licenseKey?: string }}
 */
async function getLicenseStatus(discordId) {
  try {
    const { data } = await client.get(`/bot/license-status/${discordId}`);
    return data;
  } catch (err) {
    if (err.response?.status === 404) return { valid: false };
    logger.error('licenseApi.getLicenseStatus error:', err.message);
    return { valid: false, reason: 'Service temporairement indisponible.' };
  }
}

/**
 * Génère une ou plusieurs clés de licence via le backend.
 * @returns {{ success: boolean, keys?: string[], reason?: string }}
 */
async function generateKeys(plan, count = 1) {
  try {
    const { data } = await client.post('/bot/generate', { plan, count });
    return data;
  } catch (err) {
    const status = err.response?.status;
    const body   = err.response?.data;
    logger.error(`licenseApi.generateKeys HTTP ${status ?? 'N/A'}:`, body ?? err.message);
    return { success: false, reason: body?.message || 'Service indisponible.' };
  }
}

/**
 * Récupère les KPIs pour /dashboard.
 * @returns {{ salesToday, salesMonth, revenueToday, revenueMonth } | null}
 */
async function getDashboard() {
  try {
    const { data } = await client.get('/bot/dashboard');
    return data;
  } catch (err) {
    logger.error('licenseApi.getDashboard error:', err.message);
    return null;
  }
}

/**
 * Active ou désactive le mode maintenance.
 * @returns {{ success: boolean, enabled: boolean, reason?: string }}
 */
async function setMaintenance(enabled, raison = null) {
  try {
    const { data } = await client.post('/bot/maintenance', { enabled, raison });
    return data;
  } catch (err) {
    const body = err.response?.data;
    logger.error('licenseApi.setMaintenance error:', err.message);
    return { success: false, reason: body?.message || 'Service indisponible.' };
  }
}

/**
 * Soumet un avis client au backend (synchronisation Redis).
 * @returns {{ success: boolean }}
 */
async function submitReview({ discordId, username, description, text, stars }) {
  try {
    const { data } = await client.post('/bot/reviews', { discordId, username, description, text, stars });
    return data;
  } catch (err) {
    logger.error('licenseApi.submitReview error:', err.message);
    return { success: false };
  }
}

module.exports = { verifyLicense, getLicenseStatus, generateKeys, getDashboard, setMaintenance, submitReview };
