'use strict';

const path = require('path');
const fs   = require('fs');
const logger = require('../services/logger');

/**
 * Charge tous les fichiers d'événements depuis src/events/
 * et les enregistre sur le client Discord.
 */
function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(eventsPath, file);
    const event    = require(filePath);

    if (!event.name || !event.execute) {
      logger.warn(`Événement ignoré (name/execute manquants) : ${filePath}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }

    logger.debug(`Événement chargé : ${event.name} (once=${!!event.once})`);
  }

  logger.info(`${files.length} événement(s) chargé(s).`);
}

module.exports = { loadEvents };
