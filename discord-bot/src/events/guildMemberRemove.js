'use strict';

const config = require('../config/config');
const Colors = require('../config/colors');
const logger = require('../services/logger');

module.exports = {
  name: 'guildMemberRemove',

  async execute(client, member) {
    logger.info(`Membre parti : ${member.user.tag} (${member.id}) depuis ${member.guild.name}`);

    if (!config.channels.welcome) return;

    const channel = member.guild.channels.cache.get(config.channels.welcome);
    if (!channel) return;

    await channel.send({
      embeds: [{
        color: Colors.NEUTRAL,
        description: `**${member.user.displayName}** vient de quitter le serveur. 👋`,
        footer: { text: `${member.guild.memberCount} membres restants` },
        timestamp: new Date().toISOString(),
      }],
    }).catch((err) => logger.warn('guildMemberRemove goodbye:', err.message));
  },
};
