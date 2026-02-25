'use strict';

/**
 * Réponses automatiques par mots-clés.
 * Chaque entrée déclenche une réponse éphémère et temporaire quand
 * un message contient l'un des mots-clés (insensible à la casse).
 *
 * La réponse est auto-supprimée après 25 secondes.
 * Un même utilisateur ne peut déclencher la même règle qu'une fois toutes les 30 secondes.
 */
const AUTORESPONSES = [
  {
    id: 'verify',
    keywords: ['comment vérifier', 'comment verify', 'vérifier ma clé', 'verify ma clé', 'lier ma clé', 'comment lier'],
    embed: {
      color: 0x00CFFF,
      title: '🔑 Comment vérifier ta licence ?',
      description: [
        'Utilise la commande suivante dans n\'importe quel salon :',
        '```/verify clé:TA-CLE-ICI```',
        'Tu recevras ensuite ton rôle automatiquement selon ton plan.',
      ].join('\n'),
      footer: { text: 'Ce message se supprime dans 25 secondes' },
    },
  },
  {
    id: 'download',
    keywords: ['lien téléchargement', 'lien de téléchargement', 'lien download', 'comment télécharger', 'où télécharger', 'download link'],
    embed: {
      color: 0x00CFFF,
      title: '⬇️ Lien de téléchargement',
      description: [
        'Le lien de téléchargement est disponible sur ton **profil** sur le site.',
        '',
        'Si tu as vérifié ta licence avec `/verify`, vérifie aussi dans ton profil Discord.',
        'Toujours pas trouvé ? Ouvre un ticket avec `/ticket`.',
      ].join('\n'),
      footer: { text: 'Ce message se supprime dans 25 secondes' },
    },
  },
  {
    id: 'key_lost',
    keywords: ['perdu ma clé', 'plus ma clé', 'retrouver ma clé', 'clé perdue', 'j\'ai perdu ma clé'],
    embed: {
      color: 0xFEE75C,
      title: '🔍 Clé de licence perdue ?',
      description: [
        '**Vérifie d\'abord ces endroits :**',
        '> 📧 Ton email de confirmation d\'achat',
        '> 👤 Ton profil sur le site (section "Mes licences")',
        '',
        'Si tu ne la trouves pas, ouvre un ticket avec `/ticket` en précisant ton email d\'achat.',
      ].join('\n'),
      footer: { text: 'Ce message se supprime dans 25 secondes' },
    },
  },
  {
    id: 'support',
    keywords: ['besoin d\'aide', 'besoin aide', 'contacter le support', 'comment contacter', 'support'],
    embed: {
      color: 0x00CFFF,
      title: '🎫 Contacter le support',
      description: 'Ouvre un ticket privé avec le staff :\n```/ticket sujet:Décris ton problème```',
      footer: { text: 'Ce message se supprime dans 25 secondes' },
    },
  },
  {
    id: 'status',
    keywords: ['statut licence', 'ma licence expire', 'quand expire', 'durée restante', 'temps restant'],
    embed: {
      color: 0x00CFFF,
      title: '📋 Vérifier le statut de ta licence',
      description: 'Utilise la commande :\n```/status```\nElle affiche ton plan, la date d\'expiration et le temps restant.',
      footer: { text: 'Ce message se supprime dans 25 secondes' },
    },
  },
];

module.exports = AUTORESPONSES;
