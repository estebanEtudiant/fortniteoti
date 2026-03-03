'use strict';

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config  = require('./config/config');
const logger  = require('./services/logger');
const { loadCommands }  = require('./handlers/commandHandler');
const { loadEvents }    = require('./handlers/eventHandler');
const webhookServer     = require('./services/webhookServer');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// Cache des invitations par guilde : Map<guildId, Map<code, uses>>
client.inviteCache = new Map();

// Charge les commandes et les événements
loadCommands(client);
loadEvents(client);

// Gestion globale des erreurs non interceptées
process.on('unhandledRejection', (err) => logger.error('unhandledRejection:', err));
process.on('uncaughtException',  (err) => logger.error('uncaughtException:',  err));

client.login(config.discord.token).then(() => {
  // Démarre le serveur webhook interne après connexion Discord
  webhookServer.start(client);
}).catch((err) => {
  logger.error('Échec de connexion Discord :', err);
  process.exit(1);
});
