'use strict';

/**
 * Synchronise le nombre de membres live et le dernier arrivé vers le backend,
 * pour affichage sur le site public (shop.404tweaks.tech).
 */

const config = require('../config/config');
const logger = require('./logger');
const { updateCommunityStats } = require('./licenseApi');

function pickNewestMember(guild) {
  let newest = null;
  for (const member of guild.members.cache.values()) {
    if (member.user.bot || !member.joinedTimestamp) continue;
    if (!newest || member.joinedTimestamp > newest.joinedTimestamp) newest = member;
  }
  return newest;
}

async function pushStats(client, memberOverride = null) {
  const guild = client.guilds.cache.get(config.discord.guildId);
  if (!guild) return;

  // Le cache des membres n'est pas forcément complet (large guild) tant qu'on ne l'a pas demandé.
  if (!memberOverride && guild.members.cache.size < guild.memberCount) {
    await guild.members.fetch().catch(() => {});
  }

  const newest = memberOverride || pickNewestMember(guild);

  await updateCommunityStats({
    totalMembers:          guild.memberCount,
    newestMemberUsername:  newest?.user.username,
    newestMemberAvatarUrl: newest?.user.displayAvatarURL({ size: 128, extension: 'png' }),
  });
}

function start(client) {
  setTimeout(() => pushStats(client).catch((err) => logger.warn('communityStats initial push:', err.message)), 10_000);
  setInterval(() => pushStats(client).catch((err) => logger.warn('communityStats push:', err.message)), 5 * 60_000);
  logger.info('Stats de communauté : synchronisation démarrée (intervalle: 5min).');
}

module.exports = { start, pushStats };
