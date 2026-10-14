'use strict';

const config = require('../config/config');
const logger = require('../services/logger');
const communityStats = require('../services/communityStats');

module.exports = {
  name: 'guildMemberRemove',

  async execute(client, member) {
    logger.info(`Membre parti : ${member.user.tag} (${member.id}) depuis ${member.guild.name}`);

    if (member.guild.id === config.discord.guildId) {
      communityStats.pushStats(client).catch(() => {});
    }
  },
};
