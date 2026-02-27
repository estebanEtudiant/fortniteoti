'use strict';

const { SlashCommandBuilder } = require('discord.js');
const Colors = require('../../config/colors');
const { getBotConfig } = require('../../services/licenseApi');

const SITE_URL = 'https://404tweaks.tech/';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tuto')
    .setDescription('Affiche le guide complet pour acheter et activer une licence 404 Tweaks'),

  async execute(interaction) {
    const cfg = await getBotConfig();
    const embedTitle = cfg.tuto_title || '🛒 Comment acheter une licence 404 Tweaks ?';
    const embedDesc  = cfg.tuto_intro  || 'Suis ces étapes simples pour obtenir et activer ta licence en moins de 5 minutes.';

    return interaction.reply({
      embeds: [{
        color: Colors.GOLD,
        title: embedTitle,
        description: embedDesc,
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
        timestamp: new Date().toISOString(),
      }],
    });
  },
};
