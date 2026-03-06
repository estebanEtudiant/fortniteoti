import { useEffect } from 'react';

const SEO = {
  fr: {
    '/': {
      title: '404 Tweaks | Optimizer Fortnite #1 - +66% FPS',
      description: '404 Tweaks : le logiciel d optimisation Fortnite le plus complet. +66% FPS, -65% input delay, 98 tweaks automatiques pour Windows 10/11.',
    },
    '/comment-ca-marche': {
      title: 'Comment ca marche - 404 Tweaks',
      description: '3 etapes simples pour optimiser Fortnite : achetez, telechargez, appliquez 98 tweaks en 1 clic.',
    },
    '/login': {
      title: 'Connexion - 404 Tweaks',
      description: 'Connectez-vous a votre espace client 404 Tweaks.',
    },
    '/register': {
      title: 'Creer un compte - 404 Tweaks',
      description: 'Creez votre compte 404 Tweaks et commencez a optimiser Fortnite.',
    },
    '/payment': {
      title: 'Acheter 404 Tweaks - Optimizer Fortnite',
      description: 'Choisissez votre plan 404 Tweaks. Paiement securise via Stripe.',
    },
    '/payment/success': {
      title: 'Merci pour votre achat ! - 404 Tweaks',
      description: 'Votre achat est confirme. Telechargez 404 Tweaks.',
      noindex: true,
    },
    '/payment/cancel': {
      title: 'Paiement annule - 404 Tweaks',
      description: 'Paiement annule. Aucun montant n a ete debite.',
      noindex: true,
    },
    '/profile': {
      title: 'Mon Profil - 404 Tweaks',
      description: 'Gerez vos licences et vos commandes.',
      noindex: true,
    },
    '/forgot-password': {
      title: 'Mot de passe oublie - 404 Tweaks',
      description: 'Reinitialisez votre mot de passe 404 Tweaks.',
      noindex: true,
    },
    '/reset-password': {
      title: 'Reinitialiser le mot de passe - 404 Tweaks',
      description: 'Choisissez un nouveau mot de passe pour votre compte.',
      noindex: true,
    },
  },
  en: {
    '/': {
      title: '404 Tweaks | Fortnite Optimizer #1 - +66% FPS',
      description: '404 Tweaks is the complete Fortnite optimization software. +66% FPS, -65% input delay, 98 automatic tweaks for Windows 10/11.',
    },
    '/comment-ca-marche': {
      title: 'How It Works - 404 Tweaks',
      description: '3 simple steps to optimize Fortnite: buy, download, apply 98 tweaks in one click.',
    },
    '/login': {
      title: 'Login - 404 Tweaks',
      description: 'Sign in to your 404 Tweaks customer area.',
    },
    '/register': {
      title: 'Create Account - 404 Tweaks',
      description: 'Create your 404 Tweaks account and start optimizing Fortnite.',
    },
    '/payment': {
      title: 'Buy 404 Tweaks - Fortnite Optimizer',
      description: 'Choose your 404 Tweaks plan. Secure Stripe checkout.',
    },
    '/payment/success': {
      title: 'Thanks for your purchase! - 404 Tweaks',
      description: 'Your purchase is confirmed. Download 404 Tweaks now.',
      noindex: true,
    },
    '/payment/cancel': {
      title: 'Payment canceled - 404 Tweaks',
      description: 'Payment canceled. No amount was charged.',
      noindex: true,
    },
    '/profile': {
      title: 'My Profile - 404 Tweaks',
      description: 'Manage your licenses and orders.',
      noindex: true,
    },
    '/forgot-password': {
      title: 'Forgot Password - 404 Tweaks',
      description: 'Reset your 404 Tweaks password.',
      noindex: true,
    },
    '/reset-password': {
      title: 'Reset Password - 404 Tweaks',
      description: 'Choose a new password for your account.',
      noindex: true,
    },
  },
};

const BASE_URL = 'https://404tweaks.tech';

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setOg(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

export function usePageTitle(route) {
  useEffect(() => {
    const lang = localStorage.getItem('ftn_lang') === 'en' ? 'en' : 'fr';
    const byLang = SEO[lang] || SEO.fr;
    const seo = byLang[route] || byLang['/'];
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
