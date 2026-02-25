'use strict';

const automod       = require('../services/automod');
const AUTORESPONSES = require('../config/autoresponses');
const config        = require('../config/config');
const { stmts }     = require('../services/database');

// Rate-limit par userId+ruleId : timestamp de la dernière réponse
const autorespCooldown = new Map();
const COOLDOWN_MS = 30_000; // 30 secondes

module.exports = {
  name: 'messageCreate',

  async execute(_client, message) {
    if (!message.guild || message.author.bot) return;

    // 1. Auto-modération (spam, invites, mentions)
    const blocked = await automod.check(message);
    if (blocked) return;

    // 2. Réponses automatiques par mots-clés
    // — Exclure les modérateurs et les admins
    const member = message.member;
    if (!member) return;
    const isMod = (config.roles.moderator && member.roles.cache.has(config.roles.moderator))
               || member.permissions.has(8n);
    if (isMod) return;

    // — Exclure les salons tickets (catégorie tickets)
    if (config.channels.ticketCategory && message.channel.parentId === config.channels.ticketCategory) return;

    const content = message.content.toLowerCase();

    for (const rule of AUTORESPONSES) {
      const matched = rule.keywords.some(kw => content.includes(kw.toLowerCase()));
      if (!matched) continue;

      // Rate-limit
      const key = `${message.author.id}:${rule.id}`;
      const lastAt = autorespCooldown.get(key) || 0;
      if (Date.now() - lastAt < COOLDOWN_MS) continue;
      autorespCooldown.set(key, Date.now());

      // Envoie la réponse et la supprime après 25s
      const reply = await message.channel.send({
        content: `${message.author}`,
        embeds: [rule.embed],
      }).catch(() => null);

      if (reply) {
        setTimeout(() => reply.delete().catch(() => {}), 25_000);
      }

      break; // Une seule réponse par message
    }
  },
};
