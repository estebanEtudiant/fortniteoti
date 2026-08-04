const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const GAMES = {
  fortnite: {
    taglineFr: "Aimbot, ESP joueurs & loot, radar et configs stream-proof. Mises à jour à chaque patch Epic.",
    taglineEn: "Aimbot, player & loot ESP, radar and stream-proof configs. Updated every Epic patch.",
    tipsCount: 42,
    includesFr: ["Aimbot (smooth, FOV, prediction)", "ESP joueurs (box, skeleton, rank)", "ESP loot & ressources", "Radar 2D", "Crosshair & fullbright", "Config stream-proof"],
    includesEn: ["Aimbot (smooth, FOV, prediction)", "Player ESP (box, skeleton, rank)", "Loot & resource ESP", "2D radar", "Crosshair & fullbright", "Stream-proof config"],
    sections: [
      { titleFr: "AIMBOT", titleEn: "AIMBOT", itemsFr: ["Smooth & prediction", "FOV & deadzone", "Visible check", "Aim key bind", "Max distance"], itemsEn: ["Smooth & prediction", "FOV & deadzone", "Visible check", "Aim key bind", "Max distance"] },
      { titleFr: "ESP JOUEURS", titleEn: "PLAYER ESP", itemsFr: ["Box & skeleton", "Distance & rank", "Weapon & knocked", "Radar 2D", "Stream-proof"], itemsEn: ["Box & skeleton", "Distance & rank", "Weapon & knocked", "2D radar", "Stream-proof"] },
      { titleFr: "ESP LOOT", titleEn: "LOOT ESP", itemsFr: ["Chests & ammo", "Ressources & véhicules", "Rarity filter", "Max distance", "Icons"], itemsEn: ["Chests & ammo", "Resources & vehicles", "Rarity filter", "Max distance", "Icons"] },
    ],
  },
  apex: {
    taglineFr: "Aimbot, ESP, no recoil et glow. Conçu pour ranked & arenas, discret en usage normal.",
    taglineEn: "Aimbot, ESP, no recoil and glow. Built for ranked & arenas, low-profile by design.",
    tipsCount: 38,
    includesFr: ["Aimbot & triggerbot", "ESP joueurs & knockdowns", "No recoil / no spread", "Glow & chams", "Radar & distance", "Configs par légende"],
    includesEn: ["Aimbot & triggerbot", "Player & knockdown ESP", "No recoil / no spread", "Glow & chams", "Radar & distance", "Per-legend configs"],
    sections: [{ titleFr: "Modules inclus", titleEn: "Included modules", itemsFr: ["Aimbot & triggerbot", "ESP joueurs & knockdowns", "No recoil / no spread", "Glow & chams", "Radar & distance"], itemsEn: ["Aimbot & triggerbot", "Player & knockdown ESP", "No recoil / no spread", "Glow & chams", "Radar & distance"] }],
  },
  rust: {
    taglineFr: "ESP joueurs, ressources, caisses et bases. Silent aim et infos raid pour dominer le wipe.",
    taglineEn: "Player, resource, crate and base ESP. Silent aim and raid intel to dominate the wipe.",
    tipsCount: 36,
    includesFr: ["ESP joueurs & sleepers", "ESP ressources & caisses", "ESP bases & TC", "Silent aim / aimbot", "No recoil & rapid fire", "Infos raid & distance"],
    includesEn: ["Player & sleeper ESP", "Resource & crate ESP", "Base & TC ESP", "Silent aim / aimbot", "No recoil & rapid fire", "Raid intel & distance"],
    sections: [{ titleFr: "Modules inclus", titleEn: "Included modules", itemsFr: ["ESP joueurs & sleepers", "ESP ressources & caisses", "ESP bases & TC", "Silent aim / aimbot", "No recoil & rapid fire"], itemsEn: ["Player & sleeper ESP", "Resource & crate ESP", "Base & TC ESP", "Silent aim / aimbot", "No recoil & rapid fire"] }],
  },
  dayz: {
    taglineFr: "ESP joueurs, loot et véhicules. Aimbot discret pour les serveurs hardcore et moddés.",
    taglineEn: "Player, loot and vehicle ESP. Low-profile aimbot for hardcore and modded servers.",
    tipsCount: 32,
    includesFr: ["ESP joueurs & zombies", "ESP loot & véhicules", "ESP bases & stash", "Aimbot & silent aim", "Radar & distance", "Mode legit configurable"],
    includesEn: ["Player & zombie ESP", "Loot & vehicle ESP", "Base & stash ESP", "Aimbot & silent aim", "Radar & distance", "Configurable legit mode"],
    sections: [{ titleFr: "Modules inclus", titleEn: "Included modules", itemsFr: ["ESP joueurs & zombies", "ESP loot & véhicules", "ESP bases & stash", "Aimbot & silent aim", "Radar & distance"], itemsEn: ["Player & zombie ESP", "Loot & vehicle ESP", "Base & stash ESP", "Aimbot & silent aim", "Radar & distance"] }],
  },
  arc: {
    taglineFr: "ESP ARC, joueurs et loot. Aimbot et infos extraction pour extraire clean à chaque run.",
    taglineEn: "ARC, player and loot ESP. Aimbot and extraction intel for clean runs every time.",
    tipsCount: 28,
    includesFr: ["ESP joueurs & ARC", "ESP loot & ressources", "Aimbot & triggerbot", "Radar & distance", "Infos extraction", "Config anti-screenshot"],
    includesEn: ["Player & ARC ESP", "Loot & resource ESP", "Aimbot & triggerbot", "Radar & distance", "Extraction intel", "Anti-screenshot config"],
    sections: [{ titleFr: "Modules inclus", titleEn: "Included modules", itemsFr: ["ESP joueurs & ARC", "ESP loot & ressources", "Aimbot & triggerbot", "Radar & distance", "Infos extraction"], itemsEn: ["Player & ARC ESP", "Loot & resource ESP", "Aimbot & triggerbot", "Radar & distance", "Extraction intel"] }],
  },
};

const PLANS = {
  '3d': {
    perksFr: ["Accès complet au cheat", "Mises à jour pendant l'accès", "Support Discord"],
    perksEn: ["Full cheat access", "Updates during access", "Discord support"],
  },
  '1m': {
    perksFr: ["Tout ce qui précède", "Nouveaux modules chaque patch", "Canal privé Discord", "Priorité support", "Annulable à tout moment"],
    perksEn: ["Everything above", "New modules every patch", "Private Discord channel", "Priority support", "Cancel anytime"],
  },
  life: {
    perksFr: ["Accès à vie au jeu choisi", "Toutes les futures mises à jour", "Support prioritaire", "Rôle exclusif Discord", "Aucun paiement récurrent"],
    perksEn: ["Lifetime access to the chosen game", "All future updates", "Priority support", "Exclusive Discord role", "No recurring payment"],
  },
  '1w': {
    perksFr: ["Accès complet au cheat", "Mises à jour pendant l'accès", "Support Discord"],
    perksEn: ["Full cheat access", "Updates during access", "Discord support"],
  },
  '1d': {
    perksFr: ["Accès complet au cheat", "Mises à jour pendant l'accès", "Support Discord"],
    perksEn: ["Full cheat access", "Updates during access", "Discord support"],
  },
};

(async () => {
  for (const [slug, data] of Object.entries(GAMES)) {
    await p.game.updateMany({
      where: { slug },
      data: {
        taglineFr: data.taglineFr,
        taglineEn: data.taglineEn,
        tipsCount: data.tipsCount,
        includesFr: data.includesFr,
        includesEn: data.includesEn,
        sections: data.sections,
      },
    });
    console.log('updated game', slug);
  }
  for (const [slug, data] of Object.entries(PLANS)) {
    await p.shopPlan.updateMany({ where: { slug }, data });
    console.log('updated plan', slug);
  }
  await p.$disconnect();
  console.log('done');
})().catch((e) => { console.error(e); process.exit(1); });
