'use strict';

const { AttachmentBuilder } = require('discord.js');
const fs     = require('fs');
const path   = require('path');
const config = require('../config/config');
const logger = require('./logger');

/**
 * Envoie le fichier SQLite en pièce jointe dans le salon de backup.
 * Appelé quotidiennement depuis le scheduler.
 */
async function runBackup(client) {
  if (!config.channels.backup) {
    logger.debug('backup: CHANNEL_BACKUP non configuré, ignoré.');
    return;
  }

  const dbPath = path.resolve(config.db.path);
  if (!fs.existsSync(dbPath)) {
    logger.warn('backup: fichier SQLite introuvable.');
    return;
  }

  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `bot-backup-${dateStr}.sqlite`;

  for (const guild of client.guilds.cache.values()) {
    const channel = guild.channels.cache.get(config.channels.backup);
    if (!channel) continue;

    try {
      const attachment = new AttachmentBuilder(dbPath, { name: filename });

      await channel.send({
        embeds: [{
          color:       0x5865F2,
          title:       '💾 Backup automatique',
          description: `Sauvegarde quotidienne de la base de données bot.\n**Fichier :** \`${filename}\``,
          footer:      { text: 'Backup automatique — conserver au moins 7 jours' },
          timestamp:   new Date().toISOString(),
        }],
        files: [attachment],
      });

      logger.info(`[BACKUP] Envoyé dans #${channel.name} — ${filename}`);
    } catch (err) {
      logger.error('backup.runBackup:', err);
    }
  }
}

module.exports = { runBackup };
