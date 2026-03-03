'use strict';

// Met à jour le cache quand une nouvelle invitation est créée
module.exports = {
  name: 'inviteCreate',

  async execute(client, invite) {
    const cached = client.inviteCache.get(invite.guild.id) || new Map();
    cached.set(invite.code, invite.uses);
    client.inviteCache.set(invite.guild.id, cached);
  },
};
