'use strict';

const { Collection } = require('discord.js');
const path = require('path');
const fs   = require('fs');
const logger = require('../services/logger');

/**
 * Charge récursivement tous les fichiers de commandes depuis src/commands/
 * et les enregistre dans client.commands (Collection).
 */
function loadCommands(client) {
  client.commands = new Collection();

  const commandsPath = path.join(__dirname, '..', 'commands');
  const categories   = fs.readdirSync(commandsPath);

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const command  = require(filePath);

      if (!command.data || !command.execute) {
        logger.warn(`Commande ignorée (data/execute manquants) : ${filePath}`);
        continue;
      }

      client.commands.set(command.data.name, command);
      logger.debug(`Commande chargée : /${command.data.name} [${category}]`);
    }
  }

  logger.info(`${client.commands.size} commande(s) chargée(s).`);
}

module.exports = { loadCommands };
