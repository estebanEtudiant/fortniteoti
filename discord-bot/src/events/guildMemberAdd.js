'use strict';

const config = require('../config/config');
const Colors = require('../config/colors');
const logger = require('../services/logger');

module.exports = {
  name: 'guildMemberAdd',

  async execute(client, member) {
    logger.info(`Nouveau membre : ${member.user.tag} (${member.id}) sur ${member.guild.name}`);

    // ─── Rôle automatique ─────────────────────────────────────────────────────
    if (config.roles.member) {
      await member.roles.add(config.roles.member, 'Rôle membre automatique').catch((err) => {
        logger.warn(`Impossible d'ajouter le rôle member à ${member.user.tag}:`, err.message);
      });
    }

    // ─── Message de bienvenue dans le salon dédié ────────────────────────────
    if (config.channels.welcome) {
      const channel = member.guild.channels.cache.get(config.channels.welcome);
      if (channel) {
        await channel.send({
          embeds: [{
            color: Colors.PRIMARY,
            title: `Bienvenue sur FortniteOpti, ${member.user.displayName} !`,
            description: [
              `Hey ${member}, heureux de t'accueillir sur le serveur officiel **FortniteOpti** !`,
              '',
              '**Premiers pas :**',
              '> 🔑 `/verify <clé>` — Lie ta licence pour débloquer l\'accès membre',
              '> 🛒 Pas encore client ? Rends-toi sur notre site pour acquérir une licence',
              '> 🎫 `/ticket` — Ouvre un ticket si tu as besoin d\'aide',
              '',
              '*Le staff est là pour t\'aider. Bonne optimisation !*',
            ].join('\n'),
            thumbnail: { url: member.user.displayAvatarURL() },
            footer: { text: `Membre #${member.guild.memberCount}` },
            timestamp: new Date().toISOString(),
          }],
        }).catch((err) => logger.warn('guildMemberAdd welcome channel:', err.message));
      }
    }

    // ─── DM de bienvenue ─────────────────────────────────────────────────────
    await member.send({
      embeds: [{
        color: Colors.PRIMARY,
        title: 'Bienvenue sur le serveur FortniteOpti !',
        description: [
          'Merci de nous rejoindre.',
          '',
          'Si tu as acheté une licence, utilise la commande `/verify` avec ta clé sur le serveur pour débloquer ton accès et tes avantages.',
          '',
          'Si tu as besoin d\'aide, ouvre un ticket avec `/ticket`.',
        ].join('\n'),
        color: Colors.PRIMARY,
      }],
    }).catch(() => {
      // DMs désactivés — pas grave
    });
  },
};
