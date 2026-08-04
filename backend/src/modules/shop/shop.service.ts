import { Injectable, NotFoundException } from '@nestjs/common';
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

  // ─────────────── Public shapes (consumed by the shop frontend) ───────────────
  private gameToPublic(g: Game) {
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
      members: g.members,
      tipsCount: g.tipsCount,
      hue: g.hue,
      tagline: { fr: g.taglineFr, en: g.taglineEn },
      includes: { fr: g.includesFr, en: g.includesEn },
      sections: Array.isArray(g.sections)
        ? (g.sections as any[])
            .filter((s) => s && typeof s === 'object' && !Array.isArray(s))
            .map((s) => ({
              title: { fr: s.titleFr || '', en: s.titleEn || '' },
              items: { fr: s.itemsFr || [], en: s.itemsEn || [] },
            }))
        : [],
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
    return games.map((g) => this.gameToPublic(g));
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
