import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateGameDto, UpdateGameDto, CreatePlanDto, UpdatePlanDto } from './shop.dto';
import { Game, ShopPlan } from '@prisma/client';

@Injectable()
export class ShopService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  /** Stats de communauté live (nombre de membres Discord, dernier arrivé) — poussées par le bot. */
  async getCommunityStats() {
    const raw = await this.redis.get('community:stats');
    const empty = { totalMembers: 0, onlineMembers: null, newestMemberUsername: null, newestMemberAvatarUrl: null, updatedAt: null };
    if (!raw) return empty;
    try { return JSON.parse(raw); } catch { return empty; }
  }

  // ─────────────── Avis clients boutique (Redis, modérés depuis le dashboard) ───────────────
  private readonly REVIEWS_KEY = 'shop:reviews';
  private readonly REWARDS_KEY = 'shop:review_rewards';     // { "<customerId>:<game>": "<CODE>" }
  private readonly PROMO_CODES_KEY = 'admin:promo_codes';
  private readonly REWARD_PCT = 10;                          // −10 %
  private readonly REWARD_DAYS = 30;                         // valable 30 jours

  /** Crée (une seule fois par client et par jeu) un coupon personnel en remerciement d'un avis. */
  private async grantReviewReward(customerId: string, game: string) {
    const rawR = await this.redis.get(this.REWARDS_KEY);
    const rewards: Record<string, string> = rawR ? JSON.parse(rawR) : {};
    const key = `${customerId}:${game}`;
    if (rewards[key]) return null;
    const raw = await this.redis.get(this.PROMO_CODES_KEY);
    const codes: Record<string, any> = raw ? JSON.parse(raw) : {};
    let code = '';
    do { code = 'MERCI-' + randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase(); } while (codes[code]);
    const expiresAt = new Date(Date.now() + this.REWARD_DAYS * 86400000).toISOString();
    codes[code] = {
      type: 'percent', amount: this.REWARD_PCT, maxUses: 1, uses: 0, active: true, stripeId: '',
      customerId, scope: 'shop', expiresAt, note: `Récompense avis (${game})`, createdAt: new Date().toISOString(),
    };
    await this.redis.set(this.PROMO_CODES_KEY, JSON.stringify(codes));
    rewards[key] = code;
    await this.redis.set(this.REWARDS_KEY, JSON.stringify(rewards));
    return { code, percent: this.REWARD_PCT, expiresAt };
  }

  /** Coupons personnels encore utilisables par ce client. */
  async myCoupons(customerId: string) {
    const raw = await this.redis.get(this.PROMO_CODES_KEY);
    const codes: Record<string, any> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    return Object.entries(codes)
      .filter(([, p]) => p && p.customerId === customerId && p.active && !(p.maxUses > 0 && p.uses >= p.maxUses)
        && !(p.expiresAt && new Date(p.expiresAt).getTime() < now))
      .map(([code, p]) => ({ code, type: p.type, amount: p.amount, expiresAt: p.expiresAt || null, note: p.note || '' }));
  }

  private async readReviews(): Promise<any[]> {
    const raw = await this.redis.get(this.REVIEWS_KEY);
    try { return raw ? JSON.parse(raw) : []; } catch { return []; }
  }
  private async writeReviews(list: any[]) {
    await this.redis.set(this.REVIEWS_KEY, JSON.stringify(list));
  }

  /** Jeux (slugs) pour lesquels le client possède une licence boutique. */
  private async ownedGames(customerId: string): Promise<Map<string, string>> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Compte introuvable');
    const rows = await this.prisma.$queryRaw<{ game: string; name: string | null }[]>`
      SELECT lower(COALESCE(metadata->>'shopGame', CASE product WHEN 'FORTNITE_CLIENT' THEN 'fortnite' WHEN 'MARVEL_RIVALS_CLIENT' THEN 'marvel_rivals' END)) AS game, max(metadata->>'shopGameName') AS name
      FROM licenses
      WHERE (metadata->>'shopGame' IS NOT NULL OR product IN ('FORTNITE_CLIENT', 'MARVEL_RIVALS_CLIENT'))
        AND lower(email) = lower(${customer.email})
      GROUP BY 1`;
    const games = await this.prisma.game.findMany({ select: { slug: true, name: true } });
    const nameOf = new Map(games.map((g) => [g.slug.toLowerCase(), g.name]));
    return new Map(rows.filter((r) => r.game).map((r) => [r.game, r.name || nameOf.get(r.game) || r.game]));
  }

  async publicReviews() {
    const list = await this.readReviews();
    return list
      .filter((r) => r.approved)
      .map((r) => ({ id: r.id, name: r.name, game: r.gameName, r: r.rating, text: r.text, createdAt: r.createdAt }));
  }

  async myReviews(customerId: string) {
    const owned = await this.ownedGames(customerId);
    const list = (await this.readReviews()).filter((r) => r.customerId === customerId);
    return {
      reward: { percent: this.REWARD_PCT, days: this.REWARD_DAYS },
      canReview: [...owned.entries()].map(([slug, name]) => ({ game: slug, gameName: name })),
      reviews: list.map((r) => ({ id: r.id, game: r.game, gameName: r.gameName, rating: r.rating, text: r.text, approved: r.approved, createdAt: r.createdAt })),
    };
  }

  async submitReview(customerId: string, body: { game?: string; rating?: number; text?: string }) {
    const game = String(body.game || '').toLowerCase();
    const rating = Math.round(Number(body.rating));
    const text = String(body.text || '').trim();
    if (!(rating >= 1 && rating <= 5)) throw new BadRequestException('Note invalide (1 à 5)');
    if (text.length < 10 || text.length > 500) throw new BadRequestException('Ton avis doit faire entre 10 et 500 caractères');
    const owned = await this.ownedGames(customerId);
    if (!owned.has(game)) throw new ForbiddenException('Tu dois avoir acheté ce jeu pour laisser un avis');
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    const name = String((customer as any)?.displayName || (customer as any)?.username || 'Client').slice(0, 40);
    const all = await this.readReviews();
    const list = all.filter((r) => !(r.customerId === customerId && r.game === game));
    const review = { id: randomUUID(), customerId, name, game, gameName: owned.get(game), rating, text, approved: false, createdAt: new Date().toISOString() };
    list.unshift(review);
    await this.writeReviews(list);
    const reward = await this.grantReviewReward(customerId, game);   // null si déjà récompensé pour ce jeu
    return { success: true, pending: true, reward };
  }

  async adminReviews() {
    return this.readReviews();
  }

  async moderateReview(id: string, approved: boolean) {
    const list = await this.readReviews();
    const r = list.find((x) => x.id === id);
    if (!r) throw new NotFoundException('Avis introuvable');
    r.approved = approved;
    await this.writeReviews(list);
    return r;
  }

  async deleteReview(id: string) {
    const list = await this.readReviews();
    await this.writeReviews(list.filter((x) => x.id !== id));
    return { success: true };
  }

  // ─────────────── Public shapes (consumed by the shop frontend) ───────────────
  private gameToPublic(g: Game, buyers?: Map<string, number>) {
    const sections = Array.isArray(g.sections)
      ? (g.sections as any[])
          .filter((s) => s && typeof s === 'object' && !Array.isArray(s))
          .map((s) => ({
            title: { fr: s.titleFr || '', en: s.titleEn || '' },
            items: { fr: s.itemsFr || [], en: s.itemsEn || [] },
          }))
      : [];
    // Nombre réel de modules = total des lignes listées dans les sections (fallback: includes)
    const moduleCount = sections.length
      ? sections.reduce((n, s) => n + (s.items.fr.length || s.items.en.length), 0)
      : (g.includesFr?.length || g.includesEn?.length || 0);
    return {
      id: g.slug,
      name: g.name,
      chip: g.chip,
      logo: g.logo,
      image: g.image,
      images: g.images || [],
      status: g.status.toLowerCase(),
      since: { fr: g.sinceFr, en: g.sinceEn },
      rating: g.rating,
      members: buyers ? buyers.get(g.slug.toLowerCase()) || 0 : g.members,
      tipsCount: moduleCount,
      hue: g.hue,
      tagline: { fr: g.taglineFr, en: g.taglineEn },
      includes: { fr: g.includesFr, en: g.includesEn },
      sections,
    };
  }

  private planToPublic(p: ShopPlan) {
    return {
      id: p.slug,
      name: { fr: p.nameFr, en: p.nameEn },
      price: p.price,
      per: { fr: p.perFr, en: p.perEn },
      featured: p.featured,
      perks: { fr: p.perksFr, en: p.perksEn },
    };
  }

  async publicGames() {
    const games = await this.prisma.game.findMany({
      where: { visible: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const buyers = await this.buyersPerGame();
    return games.map((g) => this.gameToPublic(g, buyers));
  }

  /** Clients réels par jeu : emails distincts ayant une licence boutique pour ce jeu. */
  private async buyersPerGame(): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    try {
      const rows = await this.prisma.$queryRaw<{ game: string; n: bigint }[]>`
        SELECT lower(COALESCE(metadata->>'shopGame', CASE product WHEN 'FORTNITE_CLIENT' THEN 'fortnite' WHEN 'MARVEL_RIVALS_CLIENT' THEN 'marvel_rivals' END)) AS game, COUNT(DISTINCT lower(email)) AS n
        FROM licenses
        WHERE (metadata->>'shopGame' IS NOT NULL OR product IN ('FORTNITE_CLIENT', 'MARVEL_RIVALS_CLIENT'))
          AND email IS NOT NULL AND status::text <> 'BANNED'
        GROUP BY 1`;
      for (const r of rows) if (r.game) map.set(r.game, Number(r.n));
    } catch {
      /* stats non bloquantes */
    }
    return map;
  }

  async publicPlans() {
    const plans = await this.prisma.shopPlan.findMany({
      where: { visible: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return plans.map((p) => this.planToPublic(p));
  }

  // ─────────────── Settings (boutique : hero, etc.) ───────────────
  async getSettings() {
    const s = await this.prisma.shopSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    return { heroImage: s.heroImage, cryptoEnabled: !!process.env.NOWPAYMENTS_API_KEY };
  }

  async updateSettings(dto: { heroImage?: string }) {
    const s = await this.prisma.shopSetting.upsert({
      where: { id: 1 },
      update: { ...(dto.heroImage !== undefined ? { heroImage: dto.heroImage } : {}) },
      create: { id: 1, heroImage: dto.heroImage ?? '' },
    });
    return { heroImage: s.heroImage };
  }

  // ─────────────── Admin: Games CRUD ───────────────
  async listGames() {
    return this.prisma.game.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createGame(dto: CreateGameDto) {
    return this.prisma.game.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        chip: dto.chip,
        logo: dto.logo ?? dto.name.toUpperCase(),
        image: dto.image ?? '',
        images: dto.images ?? [],
        status: dto.status ?? 'UPDATED',
        sinceFr: dto.sinceFr ?? '',
        sinceEn: dto.sinceEn ?? '',
        rating: dto.rating ?? 5,
        members: dto.members ?? 0,
        tipsCount: dto.tipsCount ?? 0,
        hue: dto.hue ?? 26,
        taglineFr: dto.taglineFr ?? '',
        taglineEn: dto.taglineEn ?? '',
        includesFr: dto.includesFr ?? [],
        includesEn: dto.includesEn ?? [],
        sections: (dto.sections as any) ?? [],
        order: dto.order ?? 0,
        visible: dto.visible ?? true,
      },
    });
  }

  async updateGame(id: string, dto: UpdateGameDto) {
    await this.getGameOrThrow(id);
    const { sections, ...rest } = dto;
    return this.prisma.game.update({
      where: { id },
      data: { ...rest, ...(sections !== undefined ? { sections: sections as any } : {}) },
    });
  }

  async deleteGame(id: string) {
    await this.getGameOrThrow(id);
    await this.prisma.game.delete({ where: { id } });
    return { deleted: true };
  }

  private async getGameOrThrow(id: string) {
    const g = await this.prisma.game.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Jeu introuvable');
    return g;
  }

  // ─────────────── Admin: Plans CRUD ───────────────
  async listPlans() {
    return this.prisma.shopPlan.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createPlan(dto: CreatePlanDto) {
    return this.prisma.shopPlan.create({
      data: {
        slug: dto.slug,
        nameFr: dto.nameFr,
        nameEn: dto.nameEn,
        price: dto.price ?? 0,
        perFr: dto.perFr ?? '',
        perEn: dto.perEn ?? '',
        featured: dto.featured ?? false,
        perksFr: dto.perksFr ?? [],
        perksEn: dto.perksEn ?? [],
        order: dto.order ?? 0,
        visible: dto.visible ?? true,
      },
    });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    await this.getPlanOrThrow(id);
    return this.prisma.shopPlan.update({ where: { id }, data: { ...dto } });
  }

  async deletePlan(id: string) {
    await this.getPlanOrThrow(id);
    await this.prisma.shopPlan.delete({ where: { id } });
    return { deleted: true };
  }

  private async getPlanOrThrow(id: string) {
    const p = await this.prisma.shopPlan.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Plan introuvable');
    return p;
  }
}
