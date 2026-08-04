// ── Seed shop content (games + plans) from the original static data.jsx ──
// Idempotent: upsert by slug. Run once: `node prisma/seed-shop.js`
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GAMES = [
  {
    slug: 'fortnite', name: 'Fortnite', chip: 'Battle Royale', logo: 'FORT\nNITE',
    status: 'UPDATED', sinceFr: '7 mois', sinceEn: '7 months',
    rating: 4.9, members: 6120, tipsCount: 142, hue: 26, order: 0,
    taglineFr: "Builds, edits et rotations comme les pros. Configs et routines d'entraînement à jour chaque saison.",
    taglineEn: 'Pro-level builds, edits and rotations. Settings and training routines refreshed every season.',
    includesFr: ["Routines d'aim & edit (par niveau)", 'Configs visuelles optimisées', 'Méta armes & loadouts hebdo', 'Rotations & spots de zone', 'VOD reviews de tes parties'],
    includesEn: ['Aim & edit routines (by skill)', 'Optimized visual configs', 'Weekly weapon meta & loadouts', 'Zone rotations & landing spots', 'VOD reviews of your matches'],
  },
  {
    slug: 'apex', name: 'Apex Legends', chip: 'Hero Shooter', logo: 'APEX\nLEGENDS',
    status: 'UPDATED', sinceFr: 'Release', sinceEn: 'Release',
    rating: 4.8, members: 4380, tipsCount: 98, hue: 26, order: 1,
    taglineFr: 'Movement avancé, recoil control et compos de légendes pour grimper en ranked.',
    taglineEn: 'Advanced movement, recoil control and legend comps to climb ranked.',
    includesFr: ['Patterns de recul (toutes armes)', 'Tech de movement (tap-strafe, etc.)', 'Compos & synergies de légendes', 'Rotations ranked par map', 'Settings & sensi recommandés'],
    includesEn: ['Recoil patterns (all weapons)', 'Movement tech (tap-strafe, etc.)', 'Legend comps & synergies', 'Ranked rotations per map', 'Recommended settings & sens'],
  },
  {
    slug: 'rust', name: 'Rust', chip: 'Survie / PvP', logo: 'RUST',
    status: 'UPDATING', sinceFr: 'Release', sinceEn: 'Release',
    rating: 4.7, members: 5210, tipsCount: 116, hue: 26, order: 2,
    taglineFr: "Bases imprenables, raids rentables et économie de wipe optimisée du jour 1 au endgame.",
    taglineEn: 'Unraidable bases, profitable raids and a wipe economy optimized from day 1 to endgame.',
    includesFr: ['Designs de base (anti-raid)', 'Coûts & timings de raid', 'Farm routes & priorités de wipe', 'Aim / spray des armes', 'Plans de progression journaliers'],
    includesEn: ['Base designs (anti-raid)', 'Raid costs & timings', 'Farm routes & wipe priorities', 'Weapon aim / spray', 'Daily progression plans'],
  },
  {
    slug: 'dayz', name: 'DayZ', chip: 'Survie hardcore', logo: 'DAY Z',
    status: 'UPDATED', sinceFr: '4 mois', sinceEn: '4 months',
    rating: 4.8, members: 3640, tipsCount: 87, hue: 26, order: 3,
    taglineFr: 'Loot routes, médecine, base building et survie PvP sur les serveurs les plus durs.',
    taglineEn: 'Loot routes, medical play, base building and PvP survival on the toughest servers.',
    includesFr: ['Loot maps & spawns à jour', 'Guide médical complet', 'Base building & cache spots', 'Combat & engagements PvP', 'Checklists de survie long terme'],
    includesEn: ['Up-to-date loot maps & spawns', 'Full medical guide', 'Base building & stash spots', 'PvP combat & engagements', 'Long-term survival checklists'],
  },
  {
    slug: 'arc', name: 'ARC Raiders', chip: 'Extraction PvPvE', logo: 'ARC\nRAIDERS',
    status: 'NEW', sinceFr: 'Nouveau', sinceEn: 'New',
    rating: 4.9, members: 2180, tipsCount: 54, hue: 26, order: 4,
    taglineFr: "Extraction propre, gestion d'ARC et builds rentables sur le nouveau hit extraction.",
    taglineEn: 'Clean extractions, ARC management and profitable builds on the new extraction hit.',
    includesFr: ["Spots d'extraction sûrs", 'Patterns des machines ARC', 'Builds & loadouts rentables', 'Routes de loot par zone', 'Stratégies PvPvE'],
    includesEn: ['Safe extraction spots', 'ARC machine patterns', 'Profitable builds & loadouts', 'Per-zone loot routes', 'PvPvE strategies'],
  },
];

const PLANS = [
  {
    slug: '3d', nameFr: '3 Jours', nameEn: '3 Days', price: 4.99,
    perFr: '/ 3 jours', perEn: '/ 3 days', featured: false, order: 0,
    perksFr: ["Accès complet aux tips du jeu", "Mises à jour pendant l'accès", 'Support communauté Discord'],
    perksEn: ["Full access to the game's tips", 'Updates during access', 'Discord community support'],
  },
  {
    slug: '1m', nameFr: '1 Mois', nameEn: '1 Month', price: 14.99,
    perFr: '/ mois', perEn: '/ month', featured: true, order: 1,
    perksFr: ['Tout ce qui précède', 'Nouveaux tips chaque semaine', '1 VOD review / mois', 'Accès canal privé', 'Annulable à tout moment'],
    perksEn: ['Everything above', 'New tips every week', '1 VOD review / month', 'Private channel access', 'Cancel anytime'],
  },
  {
    slug: 'life', nameFr: 'À Vie', nameEn: 'Lifetime', price: 49.99,
    perFr: '/ une fois', perEn: '/ one-time', featured: false, order: 2,
    perksFr: ['Accès à vie au jeu choisi', 'Toutes les futures mises à jour', 'VOD reviews prioritaires', 'Rôle exclusif Discord', 'Aucun paiement récurrent'],
    perksEn: ['Lifetime access to the chosen game', 'All future updates', 'Priority VOD reviews', 'Exclusive Discord role', 'No recurring payment'],
  },
];

async function main() {
  for (const g of GAMES) {
    await prisma.game.upsert({ where: { slug: g.slug }, update: g, create: g });
  }
  for (const p of PLANS) {
    await prisma.shopPlan.upsert({ where: { slug: p.slug }, update: p, create: p });
  }
  const [gc, pc] = await Promise.all([prisma.game.count(), prisma.shopPlan.count()]);
  console.log(`Seed OK — ${gc} jeux, ${pc} plans.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
