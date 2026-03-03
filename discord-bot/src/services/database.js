'use strict';

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
const config   = require('../config/config');
const logger   = require('./logger');

// Crée le dossier data/ si inexistant
const dbDir = path.dirname(path.resolve(config.db.path));
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.resolve(config.db.path));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Migrations ──────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS verifications (
    discord_id  TEXT PRIMARY KEY,
    license_key TEXT UNIQUE NOT NULL,
    plan        TEXT NOT NULL,
    expires_at  INTEGER,
    verified_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS infractions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id     TEXT    NOT NULL,
    user_id      TEXT    NOT NULL,
    moderator_id TEXT    NOT NULL,
    type         TEXT    NOT NULL CHECK(type IN ('warn','mute','kick','ban')),
    reason       TEXT    NOT NULL,
    duration     INTEGER,
    created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS mutes (
    discord_id TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    expires_at INTEGER,
    PRIMARY KEY (discord_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT NOT NULL,
    channel_id TEXT UNIQUE NOT NULL,
    user_id    TEXT NOT NULL,
    subject    TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    closed_at  INTEGER
  );
`);

// ─── Table statut embed ───────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS status_messages (
    id         INTEGER PRIMARY KEY CHECK(id = 1),
    guild_id   TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL
  );
`);

// ─── Table avis clients ───────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id  TEXT    UNIQUE NOT NULL,
    username    TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    text        TEXT    NOT NULL,
    stars       INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
`);

// Migration : ajout de la colonne reminder_sent si elle n'existe pas encore
try {
  db.exec('ALTER TABLE verifications ADD COLUMN reminder_sent INTEGER DEFAULT 0');
} catch (_) { /* colonne déjà présente */ }

// ─── Table giveaways ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS giveaways (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT    NOT NULL,
    channel_id  TEXT    NOT NULL,
    message_id  TEXT    NOT NULL,
    host_id     TEXT    NOT NULL,
    prize       TEXT    NOT NULL,
    winners_count INTEGER NOT NULL DEFAULT 1,
    ends_at     INTEGER NOT NULL,
    ended       INTEGER NOT NULL DEFAULT 0
  );
`);

// ─── Table exclusions concours ────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS contest_excluded (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    added_by   TEXT NOT NULL,
    added_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    PRIMARY KEY (guild_id, user_id)
  );
`);

// ─── Tables concours invitations ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS contests (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id          TEXT    NOT NULL,
    channel_id        TEXT    NOT NULL,
    message_id        TEXT    NOT NULL,
    host_id           TEXT    NOT NULL,
    plan              TEXT    NOT NULL DEFAULT 'DAYS_30',
    invites_required  INTEGER NOT NULL DEFAULT 2,
    ends_at           INTEGER NOT NULL,
    ended             INTEGER NOT NULL DEFAULT 0,
    winner_id         TEXT,
    prize_key         TEXT,
    created_at        INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS contest_invites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id  INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    inviter_id  TEXT    NOT NULL,
    invited_id  TEXT    NOT NULL UNIQUE,
    invited_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
`);

logger.info('Base de données SQLite initialisée.');

// ─── Requêtes préparées ───────────────────────────────────────────────────────

const stmts = {
  // Vérifications
  getVerification:    db.prepare('SELECT * FROM verifications WHERE discord_id = ?'),
  getVerificationKey: db.prepare('SELECT * FROM verifications WHERE license_key = ?'),
  upsertVerification: db.prepare(`
    INSERT INTO verifications (discord_id, license_key, plan, expires_at, verified_at)
    VALUES (@discord_id, @license_key, @plan, @expires_at, strftime('%s','now'))
    ON CONFLICT(discord_id) DO UPDATE SET
      license_key = excluded.license_key,
      plan        = excluded.plan,
      expires_at  = excluded.expires_at,
      verified_at = excluded.verified_at
  `),
  deleteVerification: db.prepare('DELETE FROM verifications WHERE discord_id = ?'),

  // Infractions
  addInfraction: db.prepare(`
    INSERT INTO infractions (guild_id, user_id, moderator_id, type, reason, duration)
    VALUES (@guild_id, @user_id, @moderator_id, @type, @reason, @duration)
  `),
  getUserInfractions: db.prepare(`
    SELECT * FROM infractions WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC
  `),
  countUserInfractions: db.prepare(`
    SELECT COUNT(*) as count FROM infractions WHERE guild_id = ? AND user_id = ?
  `),

  // Mutes
  addMute:    db.prepare('INSERT OR REPLACE INTO mutes (discord_id, guild_id, expires_at) VALUES (?, ?, ?)'),
  getMute:    db.prepare('SELECT * FROM mutes WHERE discord_id = ? AND guild_id = ?'),
  removeMute: db.prepare('DELETE FROM mutes WHERE discord_id = ? AND guild_id = ?'),
  getExpiredMutes: db.prepare('SELECT * FROM mutes WHERE expires_at IS NOT NULL AND expires_at <= strftime(\'%s\',\'now\')'),

  // Reviews
  addReview: db.prepare(`
    INSERT INTO reviews (discord_id, username, description, text, stars)
    VALUES (@discord_id, @username, @description, @text, @stars)
    ON CONFLICT(discord_id) DO UPDATE SET
      username    = excluded.username,
      description = excluded.description,
      text        = excluded.text,
      stars       = excluded.stars,
      created_at  = strftime('%s','now')
  `),
  getReviewByDiscordId: db.prepare('SELECT * FROM reviews WHERE discord_id = ?'),
  getAllReviews:        db.prepare('SELECT * FROM reviews ORDER BY created_at DESC LIMIT 50'),

  // Status embed
  getStatusMessage:    db.prepare('SELECT * FROM status_messages WHERE id = 1'),
  upsertStatusMessage: db.prepare(`
    INSERT INTO status_messages (id, guild_id, channel_id, message_id)
    VALUES (1, @guild_id, @channel_id, @message_id)
    ON CONFLICT(id) DO UPDATE SET
      guild_id   = excluded.guild_id,
      channel_id = excluded.channel_id,
      message_id = excluded.message_id
  `),
  deleteStatusMessage: db.prepare('DELETE FROM status_messages WHERE id = 1'),

  // Tickets
  createTicket:   db.prepare(`
    INSERT INTO tickets (guild_id, channel_id, user_id, subject)
    VALUES (@guild_id, @channel_id, @user_id, @subject)
  `),
  getTicketByChannel: db.prepare('SELECT * FROM tickets WHERE channel_id = ?'),
  getOpenTicketByUser: db.prepare(`
    SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open' LIMIT 1
  `),
  closeTicket: db.prepare(`
    UPDATE tickets SET status = 'closed', closed_at = strftime('%s','now') WHERE channel_id = ?
  `),

  // Giveaways
  createGiveaway: db.prepare(`
    INSERT INTO giveaways (guild_id, channel_id, message_id, host_id, prize, winners_count, ends_at)
    VALUES (@guild_id, @channel_id, @message_id, @host_id, @prize, @winners_count, @ends_at)
  `),
  getGiveaway:    db.prepare('SELECT * FROM giveaways WHERE id = ?'),
  getActiveGiveaways: db.prepare('SELECT * FROM giveaways WHERE ended = 0 AND ends_at <= strftime(\'%s\',\'now\')'),
  markGiveawayEnded:  db.prepare('UPDATE giveaways SET ended = 1 WHERE id = ?'),
  getGiveawayByMessage: db.prepare('SELECT * FROM giveaways WHERE message_id = ?'),

  // Concours invitations
  createContest: db.prepare(`
    INSERT INTO contests (guild_id, channel_id, message_id, host_id, plan, invites_required, ends_at)
    VALUES (@guild_id, @channel_id, @message_id, @host_id, @plan, @invites_required, @ends_at)
  `),
  getActiveContest:    db.prepare('SELECT * FROM contests WHERE guild_id = ? AND ended = 0 ORDER BY created_at DESC LIMIT 1'),
  getContestById:      db.prepare('SELECT * FROM contests WHERE id = ?'),
  endContest:          db.prepare('UPDATE contests SET ended = 1, winner_id = @winner_id, prize_key = @prize_key WHERE id = @id'),
  updateContestMessage:db.prepare('UPDATE contests SET message_id = ? WHERE id = ?'),

  addContestInvite: db.prepare(`
    INSERT OR IGNORE INTO contest_invites (contest_id, inviter_id, invited_id)
    VALUES (@contest_id, @inviter_id, @invited_id)
  `),
  getContestInviteCount: db.prepare(`
    SELECT COUNT(*) as count FROM contest_invites WHERE contest_id = ? AND inviter_id = ?
  `),
  getContestLeaderboard: db.prepare(`
    SELECT inviter_id, COUNT(*) as invites
    FROM contest_invites WHERE contest_id = ?
    GROUP BY inviter_id ORDER BY invites DESC
  `),
  getContestParticipants: db.prepare(`
    SELECT inviter_id, COUNT(*) as invites
    FROM contest_invites WHERE contest_id = ?
    GROUP BY inviter_id HAVING invites >= ?
  `),
  alreadyInvited: db.prepare('SELECT id FROM contest_invites WHERE contest_id = ? AND invited_id = ?'),

  // Exclusions concours
  addExcluded:    db.prepare('INSERT OR REPLACE INTO contest_excluded (guild_id, user_id, added_by) VALUES (?, ?, ?)'),
  removeExcluded: db.prepare('DELETE FROM contest_excluded WHERE guild_id = ? AND user_id = ?'),
  isExcluded:     db.prepare('SELECT 1 FROM contest_excluded WHERE guild_id = ? AND user_id = ?'),
  getExcluded:    db.prepare('SELECT user_id FROM contest_excluded WHERE guild_id = ? ORDER BY added_at DESC'),
};

module.exports = { db, stmts };
