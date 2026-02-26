'use strict';

/**
 * Sync reviews from SQLite → backend Redis
 * Usage: node scripts/sync-reviews.js
 */

require('dotenv').config();
const axios  = require('axios');
const path   = require('path');

const DB_PATH  = process.env.DB_PATH    || './data/bot.sqlite';
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const SECRET   = process.env.BOT_API_SECRET;

if (!SECRET) {
  console.error('BOT_API_SECRET manquant dans .env');
  process.exit(1);
}

const Database = require('better-sqlite3');
const db = new Database(path.resolve(DB_PATH));

const reviews = db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all();
console.log(`${reviews.length} avis trouvés en SQLite`);

if (reviews.length === 0) {
  console.log('Aucun avis à synchroniser.');
  process.exit(0);
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: { 'x-bot-secret': SECRET },
});

(async () => {
  let ok = 0;
  for (const r of reviews) {
    try {
      await client.post('/bot/reviews', {
        discordId:   r.discord_id,
        username:    r.username,
        description: r.description || '',
        text:        r.text,
        stars:       r.stars,
      });
      console.log(`✅ Synced: ${r.username} (${r.discord_id})`);
      ok++;
    } catch (err) {
      console.error(`❌ Erreur pour ${r.username}: ${err.response?.status} ${JSON.stringify(err.response?.data) ?? err.message}`);
    }
  }
  console.log(`\nTerminé: ${ok}/${reviews.length} avis synchronisés.`);
})();
