'use strict';

/**
 * Sync reviews from SQLite → backend Redis
 * Usage: node scripts/sync-reviews.js
 */

// Charger depuis la racine du projet (là où est le .env)
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const axios    = require('axios');
const path     = require('path');
const Database = require('better-sqlite3');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const SECRET   = process.env.BOT_API_SECRET;
const DB_PATH  = process.env.DB_PATH || path.resolve(__dirname, '../data/bot.sqlite');

console.log(`Base URL : ${BASE_URL}`);
console.log(`DB Path  : ${DB_PATH}`);
console.log(`Secret   : ${SECRET ? '***' + SECRET.slice(-4) : '⚠️  MANQUANT'}`);

if (!SECRET) {
  console.error('\n❌ BOT_API_SECRET manquant dans .env — impossible de s\'authentifier.');
  process.exit(1);
}

const db      = new Database(DB_PATH);
const reviews = db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all();
console.log(`\n${reviews.length} avis trouvés en SQLite\n`);

if (reviews.length === 0) {
  console.log('Aucun avis à synchroniser.');
  process.exit(0);
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'x-bot-secret': SECRET, 'Content-Type': 'application/json' },
});

(async () => {
  let ok = 0;
  for (const r of reviews) {
    const payload = {
      discordId:   r.discord_id,
      username:    r.username,
      description: r.description || '',
      text:        r.text,
      stars:       r.stars,
    };
    try {
      const res = await client.post('/bot/reviews', payload);
      console.log(`✅ ${r.username} → ${JSON.stringify(res.data)}`);
      ok++;
    } catch (err) {
      const status = err.response?.status;
      const body   = JSON.stringify(err.response?.data ?? err.message);
      console.error(`❌ ${r.username} [HTTP ${status ?? 'N/A'}] : ${body}`);
    }
  }
  console.log(`\nTerminé : ${ok}/${reviews.length} avis synchronisés.`);
})();
