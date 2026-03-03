'use strict';

// Nettoie le cache quand une invitation est supprimée
module.exports = {
  name: 'inviteDelete',

  async execute(client, invite) {
    const cached = client.inviteCache.get(invite.guild.id);
    if (cached) cached.delete(invite.code);
  },
};
