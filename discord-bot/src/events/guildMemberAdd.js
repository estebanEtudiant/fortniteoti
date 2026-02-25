'use strict';

const config = require('../config/config');
const Colors = require('../config/colors');
const logger = require('../services/logger');

const SITE_URL = 'https://404tweaks.tech/';

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
          content: `${member}`,
          embeds: [
            {
              color: Colors.PRIMARY,
              title: `👋 Bienvenue sur 404 Tweaks, ${member.user.displayName} !`,
              description: [
                `Heureux de t'accueillir sur le serveur officiel **404 Tweaks** !`,
                `Nous sommes le **${member.guild.memberCount}ème membre** à nous rejoindre.`,
                '',
                '**Premiers pas :**',
                `> 🛒 **Pas encore client ?** Achète ta licence sur [**404tweaks.tech**](${SITE_URL})`,
                '> 🔑 **Déjà client ?** Utilise `/verify <clé>` pour activer tes rôles',
                '> 🏅 **Rôles attribués ?** Utilise `/badge` pour récupérer ton badge si besoin',
                '> 📖 **Comment acheter ?** Utilise `/tuto` pour voir le guide complet',
                '> 🎫 **Besoin d\'aide ?** Ouvre un ticket avec `/ticket`',
                '',
                '*Le staff est là pour t\'aider. Bonne optimisation ! ⚡*',
              ].join('\n'),
              thumbnail: { url: member.user.displayAvatarURL({ dynamic: true, size: 256 }) },
              footer: { text: '404 Tweaks • Optimisation Fortnite' },
              timestamp: new Date().toISOString(),
            },
          ],
        }).catch((err) => logger.warn('guildMemberAdd welcome channel:', err.message));
      }
    }

    // ─── DM de bienvenue ─────────────────────────────────────────────────────
    await member.send({
      embeds: [{
        color: Colors.PRIMARY,
        title: '👋 Bienvenue sur 404 Tweaks !',
        description: [
          'Merci de nous rejoindre sur le serveur **404 Tweaks** !',
          '',
          `🛒 **Acheter une licence :** [404tweaks.tech](${SITE_URL})`,
          '',
          '🔑 **Déjà client ?** Reviens sur le serveur et utilise `/verify <ta-clé>` pour activer tes rôles.',
          '',
          '🎫 **Besoin d\'aide ?** Ouvre un ticket avec `/ticket` sur le serveur.',
        ].join('\n'),
      }],
    }).catch(() => {
      // DMs désactivés — pas grave
    });
  },
};
