'use strict';

const { ActivityType } = require('discord.js');
const scheduler     = require('../services/scheduler');
const statusMonitor = require('../services/statusMonitor');
const logger        = require('../services/logger');

module.exports = {
  name: 'ready',
  once: true,

  async execute(client) {
    logger.info(`Connecté en tant que ${client.user.tag}`);
    logger.info(`Présent sur ${client.guilds.cache.size} serveur(s).`);

    client.user.setPresence({
      activities: [{ name: '/help • FortniteOpti', type: ActivityType.Watching }],
      status: 'online',
    });

    // Démarre les tâches planifiées
    scheduler.start(client);

    // Démarre le monitor de statut
    statusMonitor.start(client);
  },
};
