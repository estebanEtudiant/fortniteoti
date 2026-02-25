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
            // ── Embed 1 : Accueil principal ──
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
                '> 🎫 **Besoin d\'aide ?** Ouvre un ticket avec `/ticket`',
                '',
                '*Le staff est là pour t\'aider. Bonne optimisation ! ⚡*',
              ].join('\n'),
              thumbnail: { url: member.user.displayAvatarURL({ dynamic: true, size: 256 }) },
              footer: { text: '404 Tweaks • Optimisation Fortnite' },
              timestamp: new Date().toISOString(),
            },

            // ── Embed 2 : Comment acheter — tutoriel complet ──
            {
              color: Colors.GOLD,
              title: '🛒 Comment acheter une licence 404 Tweaks ?',
              description: 'Suis ces étapes simples pour obtenir et activer ta licence en moins de 5 minutes.',
              fields: [
                {
                  name: '**Étape 1 — Accéder au site**',
                  value: [
                    `➜ Rends-toi sur [**404tweaks.tech**](${SITE_URL})`,
                    '➜ Le site affiche les différents plans disponibles avec leurs prix et durées.',
                  ].join('\n'),
                },
                {
                  name: '**Étape 2 — Choisir ton plan**',
                  value: [
                    '➜ **1 jour** — Idéal pour tester le logiciel',
                    '➜ **7 jours** — Accès une semaine complète',
                    '➜ **14 jours** — Le meilleur rapport qualité/prix',
                    '➜ Clique sur **"Acheter"** en face du plan souhaité.',
                  ].join('\n'),
                },
                {
                  name: '**Étape 3 — Paiement sécurisé (Stripe)**',
                  value: [
                    '➜ Tu es redirigé vers une page de paiement **Stripe** (100% sécurisé 🔒)',
                    '➜ Renseigne ton **adresse email** (tu recevras ta clé dessus)',
                    '➜ Entre les **informations de ta carte bancaire**',
                    '➜ Clique sur **"Payer"** pour valider la commande',
                    '> 💡 *Aucun compte requis — le paiement est ponctuel et sans abonnement.*',
                  ].join('\n'),
                },
                {
                  name: '**Étape 4 — Récupérer ta clé de licence**',
                  value: [
                    '➜ Après le paiement, tu es redirigé vers une page de confirmation',
                    '➜ Ta **clé de licence** est affichée à l\'écran (format `XXXXX-XXXXX-XXXXX-XXXXX-XXXXX`)',
                    '➜ Tu reçois également un **email de confirmation** avec la clé',
                    '> ⚠️ *Copie et conserve ta clé précieusement — elle ne peut être utilisée que sur une seule machine.*',
                  ].join('\n'),
                },
                {
                  name: '**Étape 5 — Activer sur Discord**',
                  value: [
                    '➜ Reviens sur ce serveur Discord',
                    '➜ Utilise la commande : `/verify <ta-clé>`',
                    '➜ Le bot vérifie ta licence et t\'attribue automatiquement ton **rôle plan**',
                    '➜ Utilise `/badge` pour récupérer ton rôle badge si nécessaire',
                  ].join('\n'),
                },
                {
                  name: '**Étape 6 — Télécharger et utiliser le logiciel**',
                  value: [
                    '➜ Télécharge **404 Tweaks** depuis le lien fourni sur la page de confirmation ou ton profil',
                    '➜ Lance le `.exe` **en tant qu\'administrateur** (clic droit → Exécuter en tant qu\'administrateur)',
                    '➜ Entre ta clé de licence dans le champ prévu',
                    '➜ Clique sur **"Activate the License"** et profite des optimisations ! 🚀',
                  ].join('\n'),
                },
                {
                  name: '❓ Un problème ?',
                  value: `➜ Ouvre un ticket avec \`/ticket\` et le staff t'aidera sous 24h.\n➜ Site : [404tweaks.tech](${SITE_URL})`,
                },
              ],
              footer: { text: '💳 Paiement sécurisé par Stripe • Aucun abonnement' },
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
