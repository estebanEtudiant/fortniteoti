import { useEffect } from 'react';

const SEO = {
  '/': {
    title: '404 Tweaks | Optimizer Fortnite #1 — +66% FPS',
    description: '404 Tweaks : le logiciel d\'optimisation Fortnite le plus complet. +66% FPS, -65% input delay, 98 tweaks automatiques pour Windows 10/11. Résultats garantis dès la première utilisation.',
  },
  '/comment-ca-marche': {
    title: 'Comment ça marche — 404 Tweaks',
    description: '3 étapes simples pour optimiser Fortnite : achetez, téléchargez, appliquez 98 tweaks en 1 clic. Compatible Windows 10 et Windows 11.',
  },
  '/login': {
    title: 'Connexion — 404 Tweaks',
    description: 'Connectez-vous à votre espace client 404 Tweaks pour accéder à vos licences et télécharger le logiciel.',
  },
  '/register': {
    title: 'Créer un compte — 404 Tweaks',
    description: 'Créez votre compte 404 Tweaks et commencez à optimiser Fortnite en moins de 5 minutes.',
  },
  '/payment': {
    title: 'Acheter 404 Tweaks — Optimizer Fortnite',
    description: 'Choisissez votre plan 404 Tweaks. Accès instantané au logiciel d\'optimisation Fortnite — paiement sécurisé via Stripe.',
  },
  '/payment/success': {
    title: 'Merci pour votre achat ! — 404 Tweaks',
    description: 'Votre achat est confirmé. Téléchargez 404 Tweaks et commencez à optimiser Fortnite.',
    noindex: true,
  },
  '/payment/cancel': {
    title: 'Paiement annulé — 404 Tweaks',
    description: 'Paiement annulé. Aucun montant n\'a été débité.',
    noindex: true,
  },
  '/profile': {
    title: 'Mon Profil — 404 Tweaks',
    description: 'Gérez vos licences, téléchargez le logiciel et consultez vos commandes.',
    noindex: true,
  },
  '/forgot-password': {
    title: 'Mot de passe oublié — 404 Tweaks',
    description: 'Réinitialisez votre mot de passe 404 Tweaks.',
    noindex: true,
  },
  '/reset-password': {
    title: 'Réinitialiser le mot de passe — 404 Tweaks',
    description: 'Choisissez un nouveau mot de passe pour votre compte 404 Tweaks.',
    noindex: true,
  },
};

const BASE_URL = 'https://404tweaks.tech';

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

function setOg(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

function setCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el); }
  el.setAttribute('href', url);
}

export function usePageTitle(route) {
  useEffect(() => {
    const seo = SEO[route] || SEO['/'];
    const canonical = `${BASE_URL}${route === '/' ? '' : route}`;

    document.title = seo.title;
    setMeta('description', seo.description);
    setMeta('robots', seo.noindex ? 'noindex, nofollow' : 'index, follow');
    setCanonical(canonical);
    setOg('og:title', seo.title);
    setOg('og:description', seo.description);
    setOg('og:url', canonical);
  }, [route]);
}
