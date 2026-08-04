'use strict';

const { ActivityType } = require('discord.js');
const scheduler       = require('../services/scheduler');
const statusMonitor   = require('../services/statusMonitor');
const communityStats  = require('../services/communityStats');
const logger          = require('../services/logger');

module.exports = {
  name: 'ready',
  once: true,

  async execute(client) {
    logger.info(`Connecté en tant que ${client.user.tag}`);
    logger.info(`Présent sur ${client.guilds.cache.size} serveur(s).`);

    client.user.setPresence({
      activities: [{ name: '/help pour avoir de l\'aide', type: ActivityType.Watching }],
      status: 'online',
    });

    // ── Cache initial des invitations (tracking concours) ─────────────────────
    for (const guild of client.guilds.cache.values()) {
      guild.invites.fetch().then(invites => {
        client.inviteCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
        logger.info(`[INVITES] Cache chargé pour ${guild.name} — ${invites.size} invite(s)`);
      }).catch(() => {});
    }

    // Démarre les tâches planifiées
    scheduler.start(client);

    // Démarre le monitor de statut
    statusMonitor.start(client);

    // Démarre la synchronisation des stats de communauté (site public)
    communityStats.start(client);
  },
};
