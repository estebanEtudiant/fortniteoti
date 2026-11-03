/* ====================== 404 — data + i18n ====================== */
(function () {

  const GAMES = [
    {
      id: "fortnite", name: "Fortnite", chip: "Battle Royale",
      logo: "FORT\nNITE", status: "updated", since: { fr: "7 mois", en: "7 months" },
      rating: 4.9, members: 1, tipsCount: 6, hue: 26,
      tagline: {
        fr: "Aimbot, ESP joueurs & loot, radar et configs stream-proof. Mises à jour à chaque patch Epic.",
        en: "Aimbot, player & loot ESP, radar and stream-proof configs. Updated every Epic patch."
      },
      includes: {
        fr: ["Aimbot (smooth, FOV, prediction)", "ESP joueurs (box, skeleton, rank)", "ESP loot & ressources", "Radar 2D", "Crosshair & fullbright", "Config stream-proof"],
        en: ["Aimbot (smooth, FOV, prediction)", "Player ESP (box, skeleton, rank)", "Loot & resource ESP", "2D radar", "Crosshair & fullbright", "Stream-proof config"]
      }
    },
    {
      id: "apex", name: "Apex Legends", chip: "Hero Shooter",
      logo: "APEX\nLEGENDS", status: "updated", since: { fr: "Release", en: "Release" },
      rating: 0, members: 0, tipsCount: 6, hue: 26,
      tagline: {
        fr: "Aimbot, ESP, no recoil et glow. Conçu pour ranked & arenas, discret en usage normal.",
        en: "Aimbot, ESP, no recoil and glow. Built for ranked & arenas, low-profile by design."
      },
      includes: {
        fr: ["Aimbot & triggerbot", "ESP joueurs & knockdowns", "No recoil / no spread", "Glow & chams", "Radar & distance", "Configs par légende"],
        en: ["Aimbot & triggerbot", "Player & knockdown ESP", "No recoil / no spread", "Glow & chams", "Radar & distance", "Per-legend configs"]
      }
    },
    {
      id: "rust", name: "Rust", chip: "Survie / PvP",
      logo: "RUST", status: "updating", since: { fr: "Release", en: "Release" },
      rating: 0, members: 0, tipsCount: 6, hue: 26,
      tagline: {
        fr: "ESP joueurs, ressources, caisses et bases. Silent aim et infos raid pour dominer le wipe.",
        en: "Player, resource, crate and base ESP. Silent aim and raid intel to dominate the wipe."
      },
      includes: {
        fr: ["ESP joueurs & sleepers", "ESP ressources & caisses", "ESP bases & TC", "Silent aim / aimbot", "No recoil & rapid fire", "Infos raid & distance"],
        en: ["Player & sleeper ESP", "Resource & crate ESP", "Base & TC ESP", "Silent aim / aimbot", "No recoil & rapid fire", "Raid intel & distance"]
      }
    },
    {
      id: "dayz", name: "DayZ", chip: "Survie hardcore",
      logo: "DAY Z", status: "updated", since: { fr: "4 mois", en: "4 months" },
      rating: 0, members: 0, tipsCount: 6, hue: 26,
      tagline: {
        fr: "ESP joueurs, loot et véhicules. Aimbot discret pour les serveurs hardcore et moddés.",
        en: "Player, loot and vehicle ESP. Low-profile aimbot for hardcore and modded servers."
      },
      includes: {
        fr: ["ESP joueurs & zombies", "ESP loot & véhicules", "ESP bases & stash", "Aimbot & silent aim", "Radar & distance", "Mode legit configurable"],
        en: ["Player & zombie ESP", "Loot & vehicle ESP", "Base & stash ESP", "Aimbot & silent aim", "Radar & distance", "Configurable legit mode"]
      }
    },
    {
      id: "arc", name: "ARC Raiders", chip: "Extraction PvPvE",
      logo: "ARC\nRAIDERS", status: "new", since: { fr: "Nouveau", en: "New" },
      rating: 0, members: 0, tipsCount: 6, hue: 26,
      tagline: {
        fr: "ESP ARC, joueurs et loot. Aimbot et infos extraction pour extraire clean à chaque run.",
        en: "ARC, player and loot ESP. Aimbot and extraction intel for clean runs every time."
      },
      includes: {
        fr: ["ESP joueurs & ARC", "ESP loot & ressources", "Aimbot & triggerbot", "Radar & distance", "Infos extraction", "Config anti-screenshot"],
        en: ["Player & ARC ESP", "Loot & resource ESP", "Aimbot & triggerbot", "Radar & distance", "Extraction intel", "Anti-screenshot config"]
      }
    },
    {
      id: "marvel_rivals", name: "Marvel Rivals", chip: "Hero Shooter",
      logo: "MARVEL\nRIVALS", status: "new", since: { fr: "Nouveau", en: "New" },
      rating: 0, members: 0, tipsCount: 6, hue: 26,
      tagline: {
        fr: "Aimbot héros, ESP joueurs & ults, no recoil et infos objectifs. Optimisé pour la compétition.",
        en: "Hero aimbot, player & ult ESP, no recoil and objective intel. Built for competitive play."
      },
      includes: {
        fr: ["Aimbot (par héros)", "ESP joueurs & ultimates", "ESP objectifs & points", "No recoil / spread", "Radar 2D", "Config stream-proof"],
        en: ["Per-hero aimbot", "Player & ultimate ESP", "Objective & point ESP", "No recoil / spread", "2D radar", "Stream-proof config"]
      }
    }
  ];

  const PLANS = [
    {
      id: "3d", name: { fr: "3 Jours", en: "3 Days" }, price: 4.99,
      per: { fr: "/ 3 jours", en: "/ 3 days" }, featured: false,
      perks: {
        fr: ["Tout inclus", "Nouveaux modules chaque patch", "Canal privé Discord", "Priorité support", "Annulable à tout moment"],
        en: ["Everything above", "New modules every patch", "Private Discord channel", "Priority support", "Cancel anytime"]
      }
    },
    {
      id: "1m", name: { fr: "1 Mois", en: "1 Month" }, price: 14.99,
      per: { fr: "/ mois", en: "/ month" }, featured: true,
      perks: {
        fr: ["Tout inclus", "Nouveaux modules chaque patch", "Canal privé Discord", "Priorité support", "Annulable à tout moment"],
        en: ["Everything above", "New modules every patch", "Private Discord channel", "Priority support", "Cancel anytime"]
      }
    },
    {
      id: "life", name: { fr: "À Vie", en: "Lifetime" }, price: 49.99,
      per: { fr: "/ une fois", en: "/ one-time" }, featured: false,
      perks: {
        fr: ["Tout inclus", "Nouveaux modules chaque patch", "Canal privé Discord", "Priorité support", "Annulable à tout moment"],
        en: ["Everything above", "New modules every patch", "Private Discord channel", "Priority support", "Cancel anytime"]
      }
    }
  ];

  const REVIEWS = [];

  const STATS = { delivered: 33, members: 54, online: 9, reviews: 0, rating: 0, newestMemberUsername: null, newestMemberAvatarUrl: null };

  const I18N = {
    nav: { store: { fr: "Boutique", en: "Store" }, forum: { fr: "Forum", en: "Forum" }, status: { fr: "Statut", en: "Status" }, reviews: { fr: "Avis", en: "Reviews" }, account: { fr: "Mon compte", en: "Account" }, discord: { fr: "Discord", en: "Discord" } },
    signin: { fr: "Déjà membre ? Connexion", en: "Existing user? Sign In" },
    signup: { fr: "Inscription", en: "Sign Up" },
    home: { fr: "Accueil", en: "Home" },
    allActivity: { fr: "Toute l'activité", en: "All Activity" },
    heroKick: { fr: "Premium & indétectable", en: "Premium & undetected" },
    heroTitle1: { fr: "Des cheats premium pour", en: "Premium cheats to" },
    heroTitle2: { fr: "Dominer chaque lobby", en: "Dominate every lobby" },
    heroSub: { fr: "Aimbot, ESP, radar et modules avancés. Loader sécurisé, mises à jour à chaque patch, support 24/7.", en: "Aimbot, ESP, radar and advanced modules. Secure loader, patch-day updates, 24/7 support." },
    delivered: { fr: "Licences activées", en: "Licenses activated" },
    ratingFrom: { fr: "Satisfaction garantie", en: "Satisfaction guaranteed" },
    browse: { fr: "Voir la boutique", en: "Browse the store" },
    joinDiscord: { fr: "Rejoindre le Discord", en: "Join Discord" },
    welcomeTo: { fr: "Bienvenue sur", en: "Welcome to" },
    welcomeTail: { fr: "ton hub de cheats", en: "your cheat hub" },
    welcomeBody: { fr: "Chez 404, on livre des cheats stables, mis à jour rapidement et pensés pour rester discrets. Chaque licence inclut le loader, les modules du jeu et un support réactif.", en: "At 404 we ship stable cheats, fast updates and low-profile design. Every license includes the loader, game modules and responsive support." },
    totalMembers: { fr: "Membres au total", en: "Total members" },
    mostOnline: { fr: "Record en ligne", en: "Most online" },
    newest: { fr: "Dernier membre", en: "Newest member" },
    support247: { fr: "Support 24/7", en: "24/7 Support" },
    supportBody: { fr: "Réponse en moins de 5 minutes en moyenne. Aide pour l'installation, la config et le HWID.", en: "We usually reply in under 5 minutes. Help with install, config and HWID." },
    allProducts: { fr: "Tous les cheats", en: "All cheats" },
    popular: { fr: "Populaire en ce moment", en: "Popular right now" },
    from: { fr: "dès", en: "from" },
    viewTips: { fr: "Voir le cheat", en: "View cheat" },
    purchaseNow: { fr: "Acheter", en: "Purchase Now" },
    selectPlan: { fr: "Choisir cette licence", en: "Choose this license" },
    addedCart: { fr: "Ajouté au panier", en: "Added to cart" },
    whatsIncluded: { fr: "Modules inclus", en: "Included modules" },
    choosePlan: { fr: "Choisis ta licence", en: "Choose your license" },
    statusTitle: { fr: "Statut des cheats", en: "Cheat status" },
    statusSub: { fr: "Suivi en temps réel : statut anti-détection, dernière mise à jour et version du loader.", en: "Real-time tracking: detection status, last update and loader version." },
    updated: { fr: "Undetected", en: "Undetected" },
    updating: { fr: "Mise à jour", en: "Updating" },
    isnew: { fr: "Nouveau", en: "New" },
    upToDateSince: { fr: "Undetected depuis :", en: "Undetected since:" },
    all: { fr: "Tous", en: "All" },
    reviewsTitle: { fr: "La parole à nos", en: "Straight from our" },
    reviewsTail: { fr: "cheaters", en: "cheaters" },
    ourCommunity: { fr: "Notre communauté", en: "Our community" },
    verifiedReviews: { fr: "Avis vérifiés", en: "Verified reviews" },
    allVerified: { fr: "Tous les avis vérifiés", en: "All reviews verified" },
    secure: { fr: "Loader sécurisé", en: "Secure loader" },
    liveSupport: { fr: "Support 24/7", en: "24/7 Live Support" },
    verified: { fr: "Vérifié", en: "Verified" },
    signInTitle: { fr: "Content de te revoir", en: "Welcome back" },
    signUpTitle: { fr: "Crée ton compte 404", en: "Create your 404 account" },
    email: { fr: "Adresse e-mail", en: "Email address" },
    username: { fr: "Nom d'utilisateur", en: "Username" },
    password: { fr: "Mot de passe", en: "Password" },
    login: { fr: "Se connecter", en: "Log in" },
    createAccount: { fr: "Créer le compte", en: "Create account" },
    noAccount: { fr: "Pas encore de compte ?", en: "No account yet?" },
    haveAccount: { fr: "Déjà un compte ?", en: "Already have an account?" },
    orContinue: { fr: "ou continuer avec", en: "or continue with" },
    aboutTitle: { fr: "À propos", en: "About us" },
    aboutBody: { fr: "Fondé en 2022. 404 développe et maintient des cheats premium pour les jeux compétitifs et survival. Loader sécurisé, updates rapides — Stay hidden. Stay 404.", en: "Founded in 2022. 404 builds and maintains premium cheats for competitive and survival games. Secure loader, fast updates — Stay hidden. Stay 404." },
    ourGames: { fr: "Nos cheats", en: "Our cheats" },
    info: { fr: "Informations", en: "Information" },
    tos: { fr: "Conditions d'utilisation", en: "Terms of Service" },
    tosale: { fr: "Conditions de vente", en: "Terms of Sale" },
    refund: { fr: "Politique de remboursement", en: "Refund Policy" },
    aboutLink: { fr: "À propos de 404", en: "About 404" },
    contact: { fr: "Nous contacter", en: "Contact Us" },
    inquiries: { fr: "Autres demandes :", en: "Other inquiries:" },
    ctaTitle: { fr: "Prêt à dominer ?", en: "Ready to dominate?" },
    ctaSub: { fr: "Choisis ton jeu, prends ta licence, injecte et joue.", en: "Pick your game, grab a license, inject and play." },
    perGame: { fr: "modules", en: "modules" },
    members: { fr: "membres", en: "members" }
  };

  window.DATA = { GAMES, PLANS, REVIEWS, STATS, I18N, SETTINGS: { heroImage: "", forumUrl: "https://forum.404tweaks.tech", discordUrl: "" } };
  window.I18N = I18N;
  window.t = function (key, lang) {
    const v = I18N[key];
    if (!v) return key;
    return v[lang] || v.en || key;
  };
})();
