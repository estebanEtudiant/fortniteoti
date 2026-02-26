'use strict';

const config     = require('../config/config');
const Colors     = require('../config/colors');
const logger     = require('../services/logger');
const { getBotConfig } = require('../services/licenseApi');

const SITE_URL = 'https://404tweaks.tech/';

const DEFAULTS = {
  welcome_channel_title: "👋 Bienvenue sur 404 Tweaks, {username} !",
  welcome_channel_desc: [
    `Heureux de t'accueillir sur le serveur officiel **404 Tweaks** !`,
    `Nous sommes le **{memberCount}ème membre** à nous rejoindre.`,
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
  welcome_dm_title: "👋 Bienvenue sur 404 Tweaks !",
  welcome_dm_desc: [
    'Merci de nous rejoindre sur le serveur **404 Tweaks** !',
    '',
    `🛒 **Acheter une licence :** [404tweaks.tech](${SITE_URL})`,
    '',
    '🔑 **Déjà client ?** Reviens sur le serveur et utilise `/verify <ta-clé>` pour activer tes rôles.',
    '',
    '🎫 **Besoin d\'aide ?** Ouvre un ticket avec `/ticket` sur le serveur.',
  ].join('\n'),
};

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

    // ─── Récupérer la config embeds (fallback sur défauts) ────────────────────
    const cfg = await getBotConfig();

    const channelTitle = (cfg.welcome_channel_title || DEFAULTS.welcome_channel_title)
      .replace('{username}', member.user.displayName)
      .replace('{memberCount}', member.guild.memberCount);

    const channelDesc = (cfg.welcome_channel_desc || DEFAULTS.welcome_channel_desc)
      .replace('{username}', member.user.displayName)
      .replace('{memberCount}', member.guild.memberCount);

    const dmTitle = cfg.welcome_dm_title || DEFAULTS.welcome_dm_title;
    const dmDesc  = cfg.welcome_dm_desc  || DEFAULTS.welcome_dm_desc;

    // ─── Message de bienvenue dans le salon dédié ────────────────────────────
    if (config.channels.welcome) {
      const channel = member.guild.channels.cache.get(config.channels.welcome);
      if (channel) {
        await channel.send({
          content: `${member}`,
          embeds: [{
            color:       Colors.PRIMARY,
            title:       channelTitle,
            description: channelDesc,
            thumbnail:   { url: member.user.displayAvatarURL({ dynamic: true, size: 256 }) },
            footer:      { text: '404 Tweaks • Optimisation Fortnite' },
            timestamp:   new Date().toISOString(),
          }],
        }).catch((err) => logger.warn('guildMemberAdd welcome channel:', err.message));
      }
    }

    // ─── DM de bienvenue ─────────────────────────────────────────────────────
    await member.send({
      embeds: [{
        color:       Colors.PRIMARY,
        title:       dmTitle,
        description: dmDesc,
      }],
    }).catch(() => {
      // DMs désactivés — pas grave
    });
  },
};
