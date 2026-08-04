import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Stripe from 'stripe';
import { LicensePlan, OrderStatus } from '@prisma/client';
import { LicenseService } from '../license/license.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { MailService } from '../customer/mail.service';
import { DiscordRoleService } from '../customer/discord-role.service';
import { BotNotifyService } from '../bot/bot-notify.service';
import { AffiliateService } from '../affiliate/affiliate.service';
import { ResellerService } from '../reseller/reseller.service';

const PLANS_CONFIG_KEY = 'admin:plans_config';
const NG_PLANS_CONFIG_KEY = 'admin:ng_plans_config';
const MENORIA_PLANS_CONFIG_KEY = 'admin:menoria_plans_config';
const VELTHAR_PLANS_CONFIG_KEY = 'admin:velthar_plans_config';
const PROMO_CODES_KEY = 'admin:promo_codes';
const LICENSE_PLAN_VALUES = new Set<LicensePlan>(Object.values(LicensePlan));

interface PlanConfig {
  name: string;
  price: number;
  originalPrice: number;
  active: boolean;
  popular: boolean;
  stripePrice: string;
  description: string;
  licensePlan: LicensePlan;
  customDays: number | null;
  sortOrder: number;
  badgeText: string;
  ctaText: string;
  icon: string;
  themeColor: string;
  features: string[];
  tags: string[];
}

const DEFAULT_PLANS: Record<string, PlanConfig> = {
  DAYS_1: {
    name: '1 Jour',
    price: 199,
    originalPrice: 0,
    active: false,
    popular: false,
    stripePrice: '',
    description: '',
    licensePlan: LicensePlan.DAYS_1,
    customDays: null,
    sortOrder: 10,
    badgeText: '',
    ctaText: '',
    icon: 'fa-calendar-day',
    themeColor: '#06b6d4',
    features: [],
    tags: [],
  },
  DAYS_7: {
    name: '7 Jours',
    price: 499,
    originalPrice: 0,
    active: false,
    popular: false,
    stripePrice: '',
    description: '',
    licensePlan: LicensePlan.DAYS_7,
    customDays: null,
    sortOrder: 20,
    badgeText: '',
    ctaText: '',
    icon: 'fa-calendar-week',
    themeColor: '#8b5cf6',
    features: [],
    tags: [],
  },
  DAYS_14: {
    name: '14 Jours',
    price: 799,
    originalPrice: 0,
    active: false,
    popular: false,
    stripePrice: '',
    description: '',
    licensePlan: LicensePlan.DAYS_14,
    customDays: null,
    sortOrder: 30,
    badgeText: '',
    ctaText: '',
    icon: 'fa-calendar-week',
    themeColor: '#10b981',
    features: [],
    tags: [],
  },
  DAYS_30: {
    name: '30 Jours',
    price: 999,
    originalPrice: 0,
    active: true,
    popular: false,
    stripePrice: '',
    description: 'Ideal pour tester et progresser rapidement sur Fortnite.',
    licensePlan: LicensePlan.DAYS_30,
    customDays: null,
    sortOrder: 40,
    badgeText: '',
    ctaText: '',
    icon: 'fa-calendar',
    themeColor: '#06b6d4',
    features: [],
    tags: [],
  },
  DAYS_90: {
    name: '90 Jours',
    price: 1999,
    originalPrice: 0,
    active: true,
    popular: true,
    stripePrice: '',
    description: 'Le choix des joueurs reguliers. 3 mois d optimisation complete.',
    licensePlan: LicensePlan.DAYS_90,
    customDays: null,
    sortOrder: 50,
    badgeText: 'Populaire',
    ctaText: '',
    icon: 'fa-calendar-days',
    themeColor: '#8b5cf6',
    features: [],
    tags: [],
  },
  DAYS_365: {
    name: '1 An',
    price: 2499,
    originalPrice: 0,
    active: true,
    popular: false,
    stripePrice: '',
    description: 'Acces 1 an a toutes les mises a jour et nouveaux tweaks.',
    licensePlan: LicensePlan.DAYS_365,
    customDays: null,
    sortOrder: 60,
    badgeText: '',
    ctaText: '',
    icon: 'fa-star',
    themeColor: '#10b981',
    features: [],
    tags: [],
  },
  LIFETIME: {
    name: 'Lifetime',
    price: 2999,
    originalPrice: 0,
    active: true,
    popular: false,
    stripePrice: '',
    description: 'Acces illimite a vie - le meilleur rapport qualite/prix.',
    licensePlan: LicensePlan.LIFETIME,
    customDays: null,
    sortOrder: 70,
    badgeText: '',
    ctaText: '',
    icon: 'fa-infinity',
    themeColor: '#f59e0b',
    features: [],
    tags: [],
  },
};

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private ngStripe: Stripe;
  private webhookSecret: string;
  private readonly logger = new Logger(PaymentService.name);
  private storefrontUrl: string;
  private ngStorefrontUrl: string;
  private shopStorefrontUrl: string;
  private nowpaymentsApiKey: string;
  private nowpaymentsIpnSecret: string;
  private apiPublicUrl: string;

  constructor(
    private config: ConfigService,
    private licenseService: LicenseService,
    private prisma: PrismaService,
    private redis: RedisService,
    private mail: MailService,
    private discordRole: DiscordRoleService,
    private botNotify: BotNotifyService,
    private affiliateService: AffiliateService,
    private resellerService: ResellerService,
  ) {
    const secretKey = config.get<string>('stripe.secretKey', '');
    this.webhookSecret = config.get<string>('stripe.webhookSecret', '');
    this.storefrontUrl = config.get<string>('storefrontUrl', 'http://localhost:3002');
    this.ngStorefrontUrl = config.get<string>('ngStorefrontUrl', 'https://404tweaks.tech/404Client');
    this.shopStorefrontUrl = config.get<string>('shopStorefrontUrl', 'https://shop.404tweaks.tech');
    this.nowpaymentsApiKey = config.get<string>('nowpayments.apiKey', '');
    this.nowpaymentsIpnSecret = config.get<string>('nowpayments.ipnSecret', '');
    this.apiPublicUrl = config.get<string>('apiPublicUrl', 'https://api.404tweaks.tech/api/v1');

    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    }

    const ngSecretKey = config.get<string>('ngStripe.secretKey', '');
    if (ngSecretKey) {
      this.ngStripe = new Stripe(ngSecretKey, { apiVersion: '2023-10-16' });
    }
  }

  private getStripeForProduct(product: string): Stripe {
    if (product === 'NG_LOADER' && this.ngStripe) return this.ngStripe;
    return this.stripe;
  }

  private getStripeForSession(sessionId: string): Stripe {
    if (sessionId.startsWith('cs_test_') && this.ngStripe) return this.ngStripe;
    return this.stripe;
  }

  async getPublicStats(): Promise<{ activeThisMonth: number }> {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const count = await this.prisma.order.count({
      where: { status: 'COMPLETED', completedAt: { gte: start } },
    });
    return { activeThisMonth: count };
  }

  async validatePromoCode(code: string): Promise<{ type: 'percent' | 'fixed'; amount: number; label: string }> {
    if (!code) throw new BadRequestException('Code requis');
    const raw = await this.redis.get(PROMO_CODES_KEY);
    const codes: Record<string, any> = raw ? JSON.parse(raw) : {};
    const promo = codes[code.toUpperCase()];
    if (!promo || !promo.active) throw new BadRequestException('Code promo invalide ou expire');
    if (promo.maxUses > 0 && promo.uses >= promo.maxUses) throw new BadRequestException('Code promo epuise');
    const label = promo.type === 'percent' ? `-${promo.amount}%` : `-${(promo.amount / 100).toFixed(2)} EUR`;
    return { type: promo.type, amount: promo.amount, label };
  }

  private sanitizePlanKey(rawKey: string): string {
    return String(rawKey || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .replace(/_+/g, '_');
  }

  private normalizeTextList(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    return [...new Set(input
      .map(item => String(item ?? '').trim())
      .filter(Boolean)
      .slice(0, 20))];
  }

  private defaultLicensePlanFromKey(key: string): LicensePlan {
    const normalized = this.sanitizePlanKey(key);
    const map: Record<string, LicensePlan> = {
      DAYS_1: LicensePlan.DAYS_1,
      DAYS_7: LicensePlan.DAYS_7,
      DAYS_14: LicensePlan.DAYS_14,
      DAYS_30: LicensePlan.DAYS_30,
      DAYS_90: LicensePlan.DAYS_90,
      DAYS_365: LicensePlan.DAYS_365,
      LIFETIME: LicensePlan.LIFETIME,
      '1D': LicensePlan.DAYS_1,
      '7D': LicensePlan.DAYS_7,
      '14D': LicensePlan.DAYS_14,
      '30D': LicensePlan.DAYS_30,
      '90D': LicensePlan.DAYS_90,
      '365D': LicensePlan.DAYS_365,
    };
    return map[normalized] || LicensePlan.DAYS_30;
  }

  private normalizePlanConfig(key: string, input: Partial<PlanConfig> = {}, fallback: Partial<PlanConfig> = {}): PlanConfig {
    const source = { ...fallback, ...input } as Record<string, any>;
    const requestedLicensePlan = String(source.licensePlan || '').toUpperCase() as LicensePlan;
    const fallbackLicensePlan = fallback.licensePlan || this.defaultLicensePlanFromKey(key);
    const parsedCustomDays = Number(source.customDays);

    return {
      name: String(source.name || key).trim() || key,
      price: Math.max(0, Math.round(Number(source.price) || 0)),
      originalPrice: Math.max(0, Math.round(Number(source.originalPrice) || 0)),
      active: source.active !== undefined ? Boolean(source.active) : true,
      popular: source.popular !== undefined ? Boolean(source.popular) : false,
      stripePrice: String(source.stripePrice || '').trim(),
      description: String(source.description || '').trim(),
      licensePlan: LICENSE_PLAN_VALUES.has(requestedLicensePlan) ? requestedLicensePlan : fallbackLicensePlan,
      customDays: Number.isFinite(parsedCustomDays) && parsedCustomDays >= 1 && parsedCustomDays <= 3650
        ? Math.floor(parsedCustomDays)
        : null,
      sortOrder: Math.max(0, Math.floor(Number(source.sortOrder) || fallback.sortOrder || 999)),
      badgeText: String(source.badgeText || '').trim(),
      ctaText: String(source.ctaText || '').trim(),
      icon: String(source.icon || '').trim() || 'fa-key',
      themeColor: String(source.themeColor || '').trim() || '#06b6d4',
      features: this.normalizeTextList(source.features),
      tags: this.normalizeTextList(source.tags),
    };
  }

  private sortPlans(plans: Record<string, PlanConfig>): Record<string, PlanConfig> {
    return Object.fromEntries(
      Object.entries(plans).sort((a, b) => {
        const byOrder = a[1].sortOrder - b[1].sortOrder;
        if (byOrder !== 0) return byOrder;
        return a[0].localeCompare(b[0]);
      }),
    );
  }

  private async loadMenoriaPlans(): Promise<Record<string, PlanConfig>> {
    const raw = await this.redis.get(MENORIA_PLANS_CONFIG_KEY);
    let source: Record<string, any> = DEFAULT_PLANS;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
          source = parsed;
        }
      } catch {
        source = DEFAULT_PLANS;
      }
    }

    const normalized: Record<string, PlanConfig> = {};
    let autoSort = 10;

    for (const [rawKey, value] of Object.entries(source)) {
      const key = this.sanitizePlanKey(rawKey);
      if (!key) continue;
      const fallback = DEFAULT_PLANS[key] || { sortOrder: autoSort, licensePlan: this.defaultLicensePlanFromKey(key) };
      normalized[key] = this.normalizePlanConfig(key, value as Partial<PlanConfig>, fallback);
      autoSort += 10;
    }

    return Object.keys(normalized).length > 0 ? this.sortPlans(normalized) : this.sortPlans(DEFAULT_PLANS);
  }

  private async loadVeltharPlans(): Promise<Record<string, PlanConfig>> {
    const raw = await this.redis.get(VELTHAR_PLANS_CONFIG_KEY);
    let source: Record<string, any> = DEFAULT_PLANS;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
          source = parsed;
        }
      } catch {
        source = DEFAULT_PLANS;
      }
    }

    const normalized: Record<string, PlanConfig> = {};
    let autoSort = 10;

    for (const [rawKey, value] of Object.entries(source)) {
      const key = this.sanitizePlanKey(rawKey);
      if (!key) continue;
      const fallback = DEFAULT_PLANS[key] || { sortOrder: autoSort, licensePlan: this.defaultLicensePlanFromKey(key) };
      normalized[key] = this.normalizePlanConfig(key, value as Partial<PlanConfig>, fallback);
      autoSort += 10;
    }

    return Object.keys(normalized).length > 0 ? this.sortPlans(normalized) : this.sortPlans(DEFAULT_PLANS);
  }

  private async loadNgPlans(): Promise<Record<string, PlanConfig>> {
    const raw = await this.redis.get(NG_PLANS_CONFIG_KEY);
    let source: Record<string, any> = DEFAULT_PLANS;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
          source = parsed;
        }
      } catch {
        source = DEFAULT_PLANS;
      }
    }

    const normalized: Record<string, PlanConfig> = {};
    let autoSort = 10;

    for (const [rawKey, value] of Object.entries(source)) {
      const key = this.sanitizePlanKey(rawKey);
      if (!key) continue;
      const fallback = DEFAULT_PLANS[key] || { sortOrder: autoSort, licensePlan: this.defaultLicensePlanFromKey(key) };
      normalized[key] = this.normalizePlanConfig(key, value as Partial<PlanConfig>, fallback);
      autoSort += 10;
    }

    return Object.keys(normalized).length > 0 ? this.sortPlans(normalized) : this.sortPlans(DEFAULT_PLANS);
  }

  private async loadPlans(): Promise<Record<string, PlanConfig>> {
    const raw = await this.redis.get(PLANS_CONFIG_KEY);
    let source: Record<string, any> = DEFAULT_PLANS;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
          source = parsed;
        }
      } catch {
        source = DEFAULT_PLANS;
      }
    }

    const normalized: Record<string, PlanConfig> = {};
    let autoSort = 10;

    for (const [rawKey, value] of Object.entries(source)) {
      const key = this.sanitizePlanKey(rawKey);
      if (!key) continue;

      const fallback = DEFAULT_PLANS[key] || {
        sortOrder: autoSort,
        licensePlan: this.defaultLicensePlanFromKey(key),
      };
      normalized[key] = this.normalizePlanConfig(key, value as Partial<PlanConfig>, fallback);
      autoSort += 10;
    }

    return Object.keys(normalized).length > 0
      ? this.sortPlans(normalized)
      : this.sortPlans(DEFAULT_PLANS);
  }

  private resolveLicenseFromPlan(planKey: string, planCfg?: PlanConfig): { plan: LicensePlan; customDays?: number } {
    const plan = planCfg?.licensePlan || this.defaultLicensePlanFromKey(planKey);
    const customDays = planCfg?.customDays && planCfg.customDays > 0 ? planCfg.customDays : undefined;
    return customDays ? { plan, customDays } : { plan };
  }

  async getActivePlans(product?: string) {
    const prod = product?.toUpperCase();
    const plans = prod === 'NG_LOADER' ? await this.loadNgPlans()
      : prod === 'MENORIA' ? await this.loadMenoriaPlans()
      : prod === 'VELTHAR_LOADER' ? await this.loadVeltharPlans()
      : await this.loadPlans();
    return Object.entries(plans)
      .filter(([, cfg]) => cfg.active)
      .map(([key, cfg]) => ({
        key,
        name: cfg.name,
        price: cfg.price,
        originalPrice: cfg.originalPrice,
        popular: cfg.popular,
        description: cfg.description,
        badgeText: cfg.badgeText,
        ctaText: cfg.ctaText,
        icon: cfg.icon,
        themeColor: cfg.themeColor,
        features: cfg.features,
        tags: cfg.tags,
        sortOrder: cfg.sortOrder,
      }));
  }

  async confirmPayment(customerId: string, sessionId: string): Promise<{ licenseKey: string; licenseKeys?: string[] }> {
    const stripeInstance = this.getStripeForSession(sessionId);
    if (!stripeInstance) {
      throw new BadRequestException('Stripe not configured');
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripeInstance.checkout.sessions.retrieve(sessionId);
    } catch {
      throw new BadRequestException('Session de paiement invalide');
    }

    if (session.payment_status !== 'paid') {
      throw new BadRequestException('Le paiement n\'est pas encore complete');
    }

    const order = await this.prisma.order.findFirst({
      where: { customerId, stripeSessionId: sessionId },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    if (order.status === OrderStatus.COMPLETED && order.licenseId) {
      if (session.metadata?.product === 'SHOP') {
        const full = await this.prisma.order.findUnique({ where: { id: order.id } });
        const items: any[] = Array.isArray(full?.items) ? (full!.items as any[]) : [];
        const gamesSlugs = items.map((it: any) => String(it.game || '')).filter(Boolean);
        const productKeys = gamesSlugs.map(g =>
          g.toLowerCase() === 'fortnite' ? 'FORTNITE_CLIENT'
            : 'SHOP_' + g.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
        );
        if (productKeys.length) {
          const licenses = await this.prisma.license.findMany({
            where: { product: { in: productKeys }, email: (await this.prisma.customer.findUnique({ where: { id: customerId } }))?.email },
            orderBy: { createdAt: 'desc' },
            take: items.reduce((s: number, it: any) => s + Math.max(1, Number(it.qty) || 1), 0),
          });
          if (licenses.length) {
            return { licenseKey: licenses[0].licenseKey, licenseKeys: licenses.map(l => l.licenseKey) };
          }
        }
      }
      const existing = await this.prisma.license.findUnique({ where: { id: order.licenseId } });
      if (existing) {
        return { licenseKey: existing.licenseKey };
      }
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });

    // ── Boutique 404 GG ──
    if (session.metadata?.product === 'SHOP') {
      return this.completeShopOrder(session, order, customer);
    }

    const sessionProduct = session.metadata?.product === 'NG_LOADER' ? 'NG_LOADER'
      : session.metadata?.product === 'MENORIA' ? 'MENORIA'
      : session.metadata?.product === 'VELTHAR_LOADER' ? 'VELTHAR_LOADER'
      : 'FTN_OPTIMIZER';
    const allPlans = sessionProduct === 'NG_LOADER' ? await this.loadNgPlans()
      : sessionProduct === 'MENORIA' ? await this.loadMenoriaPlans()
      : sessionProduct === 'VELTHAR_LOADER' ? await this.loadVeltharPlans()
      : await this.loadPlans();
    const planKey = this.sanitizePlanKey(session.metadata?.plan || 'LIFETIME');
    const planCfg = allPlans[planKey];
    const resolvedLicense = this.resolveLicenseFromPlan(planKey, planCfg);
    const license = await this.licenseService.create({
      ...resolvedLicense,
      email: customer?.email,
      product: sessionProduct,
    });

    if (session.customer) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { stripeCustomerId: session.customer as string },
      });
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.COMPLETED,
        licenseId: license.id,
        stripePaymentId: (session.payment_intent as string) || undefined,
        completedAt: new Date(),
      },
    });

    if (customer?.email) {
      const planName = planCfg?.name || planKey;
      const profileUrl = (sessionProduct === 'NG_LOADER' || sessionProduct === 'MENORIA' || sessionProduct === 'VELTHAR_LOADER')
        ? `${this.ngStorefrontUrl}/profile.html`
        : `${this.storefrontUrl}/profile`;
      const mailBrand = sessionProduct === 'NG_LOADER' ? 'ng' : sessionProduct === 'MENORIA' ? 'ng' : sessionProduct === 'VELTHAR_LOADER' ? 'ng' : 'ftn';

      try {
        await this.mail.sendLicenseKey(customer.email, license.licenseKey, planName, profileUrl, mailBrand as any);
      } catch (err) {
        this.logger.error(`Failed to send license email to ${customer.email}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`License assigned on confirm: ${license.licenseKey} for customer ${customerId}`);
    this.botNotify.notifySale(planKey, order.amount).catch(() => {});

    if (sessionProduct === 'NG_LOADER' && customer?.discordId) {
      this.discordRole.assignNgLicensedRole(customer.discordId).catch(() => {});
    }

    return { licenseKey: license.licenseKey };
  }

  // ── Boutique 404 GG : map d'un plan boutique (slug) vers une licence ──
  private shopPlanToLicense(slug: string): { plan: LicensePlan; customDays?: number } {
    switch (slug) {
      case '1d':   return { plan: LicensePlan.DAYS_1 };
      case '3d':   return { plan: LicensePlan.DAYS_3 };
      case '1w':   return { plan: LicensePlan.DAYS_7 };
      case '1m':   return { plan: LicensePlan.DAYS_30 };
      case 'life': return { plan: LicensePlan.LIFETIME };
      default:     return { plan: LicensePlan.DAYS_30 };
    }
  }

  // remise dégressive sur la quantité totale du panier (modérée)
  private shopBulkDiscountPct(totalQty: number): number {
    if (totalQty >= 5) return 0.15;
    if (totalQty >= 3) return 0.10;
    if (totalQty >= 2) return 0.05;
    return 0;
  }

  // ── Boutique 404 GG : article unique (compat) → délègue au panier ──
  async createShopCheckoutSession(
    customerId: string,
    gameSlug: string,
    planSlug: string,
    promoCode?: string,
  ): Promise<{ url: string }> {
    return this.createShopCartCheckoutSession(customerId, [{ game: gameSlug, plan: planSlug, qty: 1 }], promoCode);
  }

  // ── Boutique 404 GG : résout le panier (prix + remise), crée l'Order PENDING ──
  private async prepareShopOrder(
    customerId: string,
    items: Array<{ game: string; plan: string; qty?: number }>,
    promoCode?: string,
  ): Promise<{ order: any; customer: any; lineItems: any[]; amountTotal: number }> {
    if (!Array.isArray(items) || items.length === 0) throw new BadRequestException('Panier vide');

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.emailVerified) {
      throw new ForbiddenException('Veuillez verifier votre adresse email avant d\'effectuer un achat');
    }

    const resolved: Array<{ game: string; gameName: string; plan: string; planName: string; qty: number; unitBase: number; licensePlan: LicensePlan; customDays?: number }> = [];
    let totalQty = 0;
    for (const it of items) {
      const qty = Math.min(50, Math.max(1, Math.floor(Number(it.qty) || 1)));
      const game = await this.prisma.game.findUnique({ where: { slug: String(it.game) } });
      if (!game || !game.visible) throw new BadRequestException(`Jeu introuvable: ${it.game}`);
      const plan = await this.prisma.shopPlan.findUnique({ where: { slug: String(it.plan) } });
      if (!plan || !plan.visible) throw new BadRequestException(`Plan introuvable: ${it.plan}`);
      const { plan: licensePlan, customDays } = this.shopPlanToLicense(plan.slug);
      resolved.push({ game: game.slug, gameName: game.name, plan: plan.slug, planName: plan.nameFr, qty, unitBase: plan.price, licensePlan, customDays });
      totalQty += qty;
    }

    const bulkPct = this.shopBulkDiscountPct(totalQty);

    let promoPct = 0;
    if (promoCode) {
      try {
        const raw = await this.redis.get(PROMO_CODES_KEY);
        const codes: Record<string, any> = raw ? JSON.parse(raw) : {};
        const promo = codes[promoCode.toUpperCase()];
        if (promo?.active) {
          if (promo.maxUses > 0 && promo.uses >= promo.maxUses) throw new BadRequestException('Code promo épuisé');
          if (promo.type === 'percent') promoPct = promo.amount / 100;
          promo.uses = (promo.uses || 0) + 1;
          codes[promoCode.toUpperCase()] = promo;
          await this.redis.set(PROMO_CODES_KEY, JSON.stringify(codes));
        }
      } catch (err: any) { if (err?.status === 400) throw err; }
    }

    const lineItems: any[] = [];
    const orderItems: any[] = [];
    let amountTotal = 0;
    for (const r of resolved) {
      const unitCents = Math.max(1, Math.round(r.unitBase * (1 - bulkPct) * (1 - promoPct) * 100));
      amountTotal += unitCents * r.qty;
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `404 GG — ${r.gameName} · ${r.planName}`,
            description: `Accès premium ${r.gameName} (${r.planName}). Clé de licence livrée par email. Aucun remboursement une fois la clé activée.`,
          },
          unit_amount: unitCents,
        },
        quantity: r.qty,
      });
      orderItems.push({ game: r.game, gameName: r.gameName, plan: r.plan, planName: r.planName, qty: r.qty, licensePlan: r.licensePlan, customDays: r.customDays ?? null, unit: unitCents });
    }

    const order = await this.prisma.order.create({
      data: {
        customerId,
        plan: resolved[0].licensePlan,
        amount: amountTotal,
        currency: 'EUR',
        status: OrderStatus.PENDING,
        items: orderItems as any,
      },
    });

    return { order, customer, lineItems, amountTotal };
  }

  // ── Boutique 404 GG : panier multi-articles via Stripe (carte) ──
  async createShopCartCheckoutSession(
    customerId: string,
    items: Array<{ game: string; plan: string; qty?: number }>,
    promoCode?: string,
  ): Promise<{ url: string }> {
    const stripeInstance = this.stripe;
    if (!stripeInstance) throw new BadRequestException('Stripe not configured');

    const { order, customer, lineItems } = await this.prepareShopOrder(customerId, items, promoCode);

    const session = await stripeInstance.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customer.email,
      line_items: lineItems,
      metadata: { product: 'SHOP', customerId, orderId: order.id },
      success_url: `${this.shopStorefrontUrl}/?session_id={CHECKOUT_SESSION_ID}#success`,
      cancel_url: `${this.shopStorefrontUrl}/#cart`,
    });

    await this.prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    return { url: session.url! };
  }

  // ── Boutique 404 GG : panier via NOWPayments (crypto) ──
  async createShopCryptoCheckout(
    customerId: string,
    items: Array<{ game: string; plan: string; qty?: number }>,
    promoCode?: string,
  ): Promise<{ url: string }> {
    if (!this.nowpaymentsApiKey) throw new BadRequestException('Paiement crypto non configuré');

    const { order, amountTotal } = await this.prepareShopOrder(customerId, items, promoCode);
    const amountEur = Math.max(0.5, amountTotal / 100);

    try {
      const res = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: { 'x-api-key': this.nowpaymentsApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_amount: Number(amountEur.toFixed(2)),
          price_currency: 'eur',
          order_id: order.id,
          order_description: '404 GG — licence(s) de jeu',
          ipn_callback_url: `${this.apiPublicUrl}/payment/webhook/nowpayments`,
          success_url: `${this.shopStorefrontUrl}/#profile`,
          cancel_url: `${this.shopStorefrontUrl}/#cart`,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        this.logger.error(`NOWPayments invoice failed: ${res.status} ${txt}`);
        throw new BadRequestException('Création du paiement crypto échouée');
      }
      const data: any = await res.json();
      await this.prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: String(data.id || '') } });
      if (!data.invoice_url) throw new BadRequestException('NOWPayments: pas d\'URL de paiement');
      return { url: data.invoice_url };
    } catch (err: any) {
      if (err?.status === 400) throw err;
      this.logger.error(`NOWPayments error: ${(err as Error).message}`);
      throw new BadRequestException('Paiement crypto indisponible pour le moment');
    }
  }

  // tri récursif des clés (pour la signature HMAC NOWPayments)
  private sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) return obj.map((o) => this.sortObjectKeys(o));
    if (obj && typeof obj === 'object') {
      return Object.keys(obj).sort().reduce((acc: any, k) => { acc[k] = this.sortObjectKeys(obj[k]); return acc; }, {});
    }
    return obj;
  }

  // ── Webhook NOWPayments (IPN) ──
  async handleNowpaymentsIpn(body: any, signature?: string): Promise<void> {
    if (!this.nowpaymentsIpnSecret) { this.logger.warn('NOWPayments IPN reçu mais secret non configuré'); return; }
    const expected = crypto.createHmac('sha512', this.nowpaymentsIpnSecret)
      .update(JSON.stringify(this.sortObjectKeys(body)))
      .digest('hex');
    if (!signature || signature !== expected) {
      this.logger.warn('NOWPayments IPN: signature invalide');
      throw new BadRequestException('Invalid signature');
    }
    const status = String(body.payment_status || '');
    const orderId = String(body.order_id || '');
    if (!orderId) return;
    if (status === 'finished' || status === 'confirmed') {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) { this.logger.warn(`NOWPayments IPN: order ${orderId} introuvable`); return; }
      const customer = await this.prisma.customer.findUnique({ where: { id: order.customerId } });
      await this.fulfillShopOrder({ id: order.id, status: order.status, amount: order.amount }, customer, String(body.payment_id || ''));
    }
  }

  // ── Boutique 404 GG : confirmer le paiement Stripe (carte) ──
  private async completeShopOrder(
    session: Stripe.Checkout.Session,
    order: { id: string; status: OrderStatus; amount: number },
    customer: { id: string; email: string; discordId?: string | null } | null,
  ): Promise<{ licenseKey: string; licenseKeys: string[] }> {
    const meta = session.metadata || {};
    const full = await this.prisma.order.findUnique({ where: { id: order.id } });
    let items: any[] = Array.isArray(full?.items) ? (full!.items as any[]) : [];

    // compat ancien format : article unique transporté dans les metadata Stripe
    if (!items.length && meta.shopGame) {
      const requested = String(meta.licensePlan || '').toUpperCase() as LicensePlan;
      const licensePlan = LICENSE_PLAN_VALUES.has(requested) ? requested : LicensePlan.DAYS_30;
      const customDays = Number(meta.customDays) > 0 ? Number(meta.customDays) : null;
      items = [{ game: String(meta.shopGame || ''), gameName: String(meta.shopGameName || ''), plan: String(meta.shopPlan || ''), planName: String(meta.shopPlanName || ''), qty: 1, licensePlan, customDays }];
      await this.prisma.order.update({ where: { id: order.id }, data: { items: items as any } });
    }

    return this.fulfillShopOrder(order, customer, (session.payment_intent as string) || undefined);
  }

  // ── Boutique 404 GG : génère les clés depuis Order.items (idempotent) ──
  private async fulfillShopOrder(
    order: { id: string; status: OrderStatus; amount: number },
    customer: { id: string; email: string } | null,
    paymentId?: string,
  ): Promise<{ licenseKey: string; licenseKeys: string[] }> {
    const fresh = await this.prisma.order.findUnique({ where: { id: order.id } });
    if (!fresh) return { licenseKey: '', licenseKeys: [] };
    if (fresh.status === OrderStatus.COMPLETED) return { licenseKey: '', licenseKeys: [] }; // déjà traité
    const items: any[] = Array.isArray(fresh.items) ? (fresh.items as any[]) : [];
    if (!items.length) return { licenseKey: '', licenseKeys: [] };

    const keys: string[] = [];
    let firstLicenseId: string | null = null;
    for (const it of items) {
      const gameSlug = String(it.game || '').trim();
      const productKey = gameSlug.toLowerCase() === 'fortnite'
        ? 'FORTNITE_CLIENT'
        : gameSlug ? 'SHOP_' + gameSlug.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') : 'SHOP';
      const requested = String(it.licensePlan || '').toUpperCase() as LicensePlan;
      const licensePlan = LICENSE_PLAN_VALUES.has(requested) ? requested : LicensePlan.DAYS_30;
      const customDays = Number(it.customDays) > 0 ? Number(it.customDays) : undefined;
      const qty = Math.min(50, Math.max(1, Math.floor(Number(it.qty) || 1)));
      for (let i = 0; i < qty; i++) {
        const license = await this.licenseService.create({
          plan: licensePlan, customDays, email: customer?.email, product: productKey,
          metadata: { shopGame: it.game, shopGameName: it.gameName, shopPlan: it.plan },
        });
        if (!firstLicenseId) firstLicenseId = license.id;
        keys.push(license.licenseKey);
        if (customer?.email) {
          try {
            await this.mail.sendLicenseKey(customer.email, license.licenseKey, `${it.gameName || ''} · ${it.planName || it.plan || ''}`.trim(), `${this.shopStorefrontUrl}/#profile`, 'shop');
          } catch (err) {
            this.logger.error(`Failed to send shop license email to ${customer.email}: ${(err as Error).message}`);
          }
        }
      }
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.COMPLETED,
        licenseId: firstLicenseId || undefined,
        stripePaymentId: paymentId || undefined,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Shop order ${order.id} fulfilled: ${keys.length} licence(s)`);
    this.botNotify.notifySale(`SHOP x${keys.length}`, fresh.amount).catch(() => {});

    if (customer?.id) {
      this.affiliateService.createConversion(customer.id, order.id, fresh.amount).catch((e) => {
        this.logger.warn(`Affiliate conversion tracking failed: ${e.message}`);
      });
    }

    return { licenseKey: keys[0] || '', licenseKeys: keys };
  }

  // ══════════════════════════════════════════════════════
  //  Boutique Pokémon (kits de rénovation — produit physique)
  // ══════════════════════════════════════════════════════

  private async preparePokemonOrder(
    customerId: string,
    dto: {
      items: Array<{ slug: string; qty: number }>;
      shippingName: string; shippingLine1: string; shippingLine2?: string;
      shippingCity: string; shippingPostalCode: string; shippingCountry: string; shippingPhone?: string;
    },
  ): Promise<{ order: any; customer: any; lineItems: any[]; amountTotal: number }> {
    if (!Array.isArray(dto.items) || dto.items.length === 0) throw new BadRequestException('Panier vide');

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.emailVerified) {
      throw new ForbiddenException('Veuillez verifier votre adresse email avant d\'effectuer un achat');
    }

    const settings = await this.prisma.pokemonSetting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    if (settings.allowedCountries.length && !settings.allowedCountries.includes(dto.shippingCountry.toUpperCase())) {
      throw new BadRequestException(`Livraison non disponible pour "${dto.shippingCountry}"`);
    }

    const orderItems: any[] = [];
    const lineItems: any[] = [];
    let subtotal = 0;
    for (const it of dto.items) {
      const qty = Math.min(20, Math.max(1, Math.floor(Number(it.qty) || 1)));
      const product = await this.prisma.pokemonProduct.findUnique({ where: { slug: String(it.slug) } });
      if (!product || !product.visible) throw new BadRequestException(`Produit introuvable: ${it.slug}`);
      if (product.stock < qty) throw new BadRequestException(`Stock insuffisant pour "${product.nameFr}"`);
      subtotal += product.price * qty;
      orderItems.push({ productId: product.id, slug: product.slug, nameFr: product.nameFr, qty, unitCents: product.price });
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `404 GG Pokemon — ${product.nameFr}`,
            description: 'Kit de renovation de cartes Pokemon — produit physique, expedie sous quelques jours.',
          },
          unit_amount: product.price,
        },
        quantity: qty,
      });
    }

    const shippingCents = settings.freeShippingThresholdCents > 0 && subtotal >= settings.freeShippingThresholdCents
      ? 0
      : settings.flatShippingCents;

    if (shippingCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Frais de livraison' },
          unit_amount: shippingCents,
        },
        quantity: 1,
      });
    }

    const order = await this.prisma.pokemonOrder.create({
      data: {
        customerId,
        items: orderItems as any,
        amount: subtotal + shippingCents,
        shippingCents,
        status: 'PENDING',
        shippingName: dto.shippingName,
        shippingLine1: dto.shippingLine1,
        shippingLine2: dto.shippingLine2 ?? '',
        shippingCity: dto.shippingCity,
        shippingPostalCode: dto.shippingPostalCode,
        shippingCountry: dto.shippingCountry.toUpperCase(),
        shippingPhone: dto.shippingPhone,
      },
    });

    return { order, customer, lineItems, amountTotal: subtotal + shippingCents };
  }

  async createPokemonCheckoutSession(
    customerId: string,
    dto: {
      items: Array<{ slug: string; qty: number }>;
      shippingName: string; shippingLine1: string; shippingLine2?: string;
      shippingCity: string; shippingPostalCode: string; shippingCountry: string; shippingPhone?: string;
    },
  ): Promise<{ url: string }> {
    if (!this.stripe) throw new BadRequestException('Stripe not configured');

    const { order, customer, lineItems } = await this.preparePokemonOrder(customerId, dto);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customer.email,
      line_items: lineItems,
      metadata: { product: 'POKEMON', customerId, orderId: order.id },
      success_url: `${this.storefrontUrl}/pokemon?session_id={CHECKOUT_SESSION_ID}#success`,
      cancel_url: `${this.storefrontUrl}/pokemon#cart`,
    });

    await this.prisma.pokemonOrder.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    return { url: session.url! };
  }

  // ── Génère la commande Pokémon confirmée (idempotent) ──
  private async fulfillPokemonOrder(orderId: string, paymentId?: string): Promise<void> {
    const order = await this.prisma.pokemonOrder.findUnique({ where: { id: orderId }, include: { customer: true } });
    if (!order || order.status !== 'PENDING') return; // déjà traité ou introuvable

    const items: any[] = Array.isArray(order.items) ? (order.items as any[]) : [];

    for (const it of items) {
      // décrément atomique : jamais de stock négatif, même en cas de commandes concurrentes
      const res = await this.prisma.pokemonProduct.updateMany({
        where: { id: it.productId, stock: { gte: it.qty } },
        data: { stock: { decrement: it.qty } },
      });
      if (res.count === 0) {
        this.logger.warn(`Pokemon order ${order.id}: stock insuffisant pour ${it.slug}, vérification manuelle requise`);
      }
    }

    await this.prisma.pokemonOrder.update({
      where: { id: order.id },
      data: { status: 'PAID', stripePaymentId: paymentId || undefined, completedAt: new Date() },
    });

    if (order.customer?.email) {
      const summary = items.map((it) => `${it.nameFr} x${it.qty}`).join(', ');
      const profileUrl = `${this.storefrontUrl}/pokemon#orders`;
      this.mail.sendPokemonOrderConfirmation(order.customer.email, summary, profileUrl).catch((err) => {
        this.logger.error(`Failed to send Pokemon order confirmation to ${order.customer!.email}: ${err.message}`);
      });
    }

    this.logger.log(`Pokemon order ${order.id} paid, ${items.length} line item(s)`);
    this.botNotify.notifySale(`POKEMON x${items.reduce((s, it) => s + it.qty, 0)}`, order.amount).catch(() => {});

    this.affiliateService.createConversion(order.customerId, order.id, order.amount).catch((e) => {
      this.logger.warn(`Affiliate conversion tracking failed: ${e.message}`);
    });
  }

  async createCheckoutSession(customerId: string, planKey = 'LIFETIME', promoCode?: string, product = 'FTN_OPTIMIZER'): Promise<{ url: string }> {
    const stripeInstance = this.getStripeForProduct(product);
    if (!stripeInstance) {
      throw new BadRequestException('Stripe not configured');
    }

    const normalizedProduct = product?.toUpperCase() || 'FTN_OPTIMIZER';
    const allPlans = normalizedProduct === 'NG_LOADER' ? await this.loadNgPlans()
      : normalizedProduct === 'MENORIA' ? await this.loadMenoriaPlans()
      : normalizedProduct === 'VELTHAR_LOADER' ? await this.loadVeltharPlans()
      : await this.loadPlans();
    const selectedPlanKey = this.sanitizePlanKey(planKey || 'LIFETIME');
    const planCfg = allPlans[selectedPlanKey];

    if (!planCfg) throw new BadRequestException(`Plan "${selectedPlanKey}" introuvable`);
    if (!planCfg.active) throw new BadRequestException(`Le plan "${planCfg.name}" n'est pas disponible`);

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.emailVerified) {
      throw new ForbiddenException('Veuillez verifier votre adresse email avant d\'effectuer un achat');
    }

    const resolvedLicense = this.resolveLicenseFromPlan(selectedPlanKey, planCfg);

    const order = await this.prisma.order.create({
      data: {
        customerId,
        plan: resolvedLicense.plan,
        amount: planCfg.price,
        currency: 'EUR',
        status: OrderStatus.PENDING,
      },
    });

    let discountedPrice: number | undefined;
    if (promoCode) {
      try {
        const raw = await this.redis.get(PROMO_CODES_KEY);
        const codes: Record<string, any> = raw ? JSON.parse(raw) : {};
        const promo = codes[promoCode.toUpperCase()];
        if (promo?.active) {
          if (promo.maxUses > 0 && promo.uses >= promo.maxUses) {
            throw new BadRequestException('Code promo épuisé');
          }
          const base = planCfg.price;
          discountedPrice = promo.type === 'percent'
            ? Math.max(1, Math.round(base * (1 - promo.amount / 100)))
            : Math.max(1, base - promo.amount);
          promo.uses = (promo.uses || 0) + 1;
          codes[promoCode.toUpperCase()] = promo;
          await this.redis.set(PROMO_CODES_KEY, JSON.stringify(codes));
        }
      } catch (err: any) {
        if (err?.status === 400) throw err;
        // ignore other promo errors
      }
    }

    const finalPrice = discountedPrice ?? planCfg.price;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customer.email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `404 Tweaks - ${planCfg.name}`,
            description: 'Accès premium • Mises à jour incluses • Support prioritaire • Canal privé Discord • Aucun remboursement une fois la clé activée',
          },
          unit_amount: finalPrice,
        },
        quantity: 1,
      }],
      metadata: {
        plan: selectedPlanKey,
        customerId,
        orderId: order.id,
        product: normalizedProduct === 'NG_LOADER' ? 'NG_LOADER'
          : normalizedProduct === 'MENORIA' ? 'MENORIA'
          : normalizedProduct === 'VELTHAR_LOADER' ? 'VELTHAR_LOADER'
          : 'FTN_OPTIMIZER',
      },
      success_url: (normalizedProduct === 'NG_LOADER' || normalizedProduct === 'MENORIA' || normalizedProduct === 'VELTHAR_LOADER')
        ? `${this.ngStorefrontUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`
        : `${this.storefrontUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: normalizedProduct === 'NG_LOADER'
        ? `${this.ngStorefrontUrl}/checkout.html`
        : normalizedProduct === 'MENORIA'
        ? `${this.ngStorefrontUrl}/menoria-checkout.html`
        : normalizedProduct === 'VELTHAR_LOADER'
        ? `${this.ngStorefrontUrl}/checkout.html?server=velthar`
        : `${this.storefrontUrl}/payment`,
    };

    const session = await stripeInstance.checkout.sessions.create(sessionParams);

    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return { url: session.url! };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    // Reseller wallet topup
    if (session.metadata?.type === 'RESELLER_TOPUP') {
      const topupId = session.metadata.topupId;
      if (topupId) {
        const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
        await this.resellerService.completeTopup(topupId, pi || undefined);
        this.logger.log(`Reseller wallet topup completed: ${topupId}`);
      }
      return;
    }

    const orderId = session.metadata?.orderId;

    // Idempotency: skip if order already completed
    if (orderId) {
      const existing = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (existing?.status === OrderStatus.COMPLETED) {
        this.logger.log(`Webhook skipped: order ${orderId} already completed`);
        return;
      }
    }

    // Shop orders → delegate to fulfillShopOrder (handles multi-item, correct product keys, shop email)
    if (session.metadata?.product === 'SHOP') {
      if (!orderId) return;
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return;
      const customer = order.customerId
        ? await this.prisma.customer.findUnique({ where: { id: order.customerId } })
        : null;
      await this.completeShopOrder(session, order, customer);
      return;
    }

    // Pokemon orders → produit physique, pas de licence (décrément stock + email de confirmation)
    if (session.metadata?.product === 'POKEMON') {
      if (!orderId) return;
      const paymentId = (session.payment_intent as string) || undefined;
      await this.fulfillPokemonOrder(orderId, paymentId);
      return;
    }

    const email = session.customer_email || session.customer_details?.email;
    const planKey = this.sanitizePlanKey(session.metadata?.plan || 'DAYS_30');
    const webhookProduct = session.metadata?.product === 'NG_LOADER' ? 'NG_LOADER'
      : session.metadata?.product === 'MENORIA' ? 'MENORIA'
      : session.metadata?.product === 'VELTHAR_LOADER' ? 'VELTHAR_LOADER'
      : 'FTN_OPTIMIZER';

    const allPlans = webhookProduct === 'NG_LOADER' ? await this.loadNgPlans()
      : webhookProduct === 'MENORIA' ? await this.loadMenoriaPlans()
      : webhookProduct === 'VELTHAR_LOADER' ? await this.loadVeltharPlans()
      : await this.loadPlans();
    const planCfg = allPlans[planKey];
    const resolvedLicense = this.resolveLicenseFromPlan(planKey, planCfg);

    const license = await this.licenseService.create({
      ...resolvedLicense,
      email: email || undefined,
      product: webhookProduct,
    });

    await this.prisma.license.update({
      where: { id: license.id },
      data: {
        stripeSubId: (session.subscription as string) || undefined,
        stripeCustomerId: (session.customer as string) || undefined,
      },
    });

    if (orderId) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.COMPLETED,
          licenseId: license.id,
          stripePaymentId: (session.payment_intent as string) || undefined,
          completedAt: new Date(),
        },
      });
    }

    this.logger.log(`License created via Stripe: ${license.licenseKey} for ${email}`);

    const amount = typeof session.amount_total === 'number' ? session.amount_total : 0;
    this.botNotify.notifySale(planKey, amount).catch(() => {});

    if (orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (order?.customerId) {
        this.affiliateService.createConversion(order.customerId, orderId, amount).catch((e) => {
          this.logger.warn(`Affiliate conversion tracking failed: ${e.message}`);
        });
      }
    }

    if (webhookProduct === 'NG_LOADER' && email) {
      this.prisma.customer.findUnique({ where: { email }, select: { discordId: true } })
        .then(c => { if (c?.discordId) this.discordRole.assignNgLicensedRole(c.discordId).catch(() => {}); })
        .catch(() => {});
    }

    if (email) {
      const planName = planCfg?.name || planKey;
      const profileUrl = (webhookProduct === 'NG_LOADER' || webhookProduct === 'MENORIA' || webhookProduct === 'VELTHAR_LOADER')
        ? `${this.ngStorefrontUrl}/profile.html`
        : `${this.storefrontUrl}/profile`;
      const mailBrand = webhookProduct === 'NG_LOADER' ? 'ng' : webhookProduct === 'MENORIA' ? 'ng' : webhookProduct === 'VELTHAR_LOADER' ? 'ng' : 'ftn';
      try {
        await this.mail.sendLicenseKey(email, license.licenseKey, planName, profileUrl, mailBrand as any);
      } catch (err) {
        this.logger.error(`Failed to send license email to ${email}: ${(err as Error).message}`);
      }
    }
  }

  private async handleSubscriptionCancelled(sub: Stripe.Subscription): Promise<void> {
    const license = await this.prisma.license.findFirst({
      where: { stripeSubId: sub.id },
    });

    if (license) {
      await this.licenseService.ban(license.id, 'Subscription cancelled');
      this.logger.log(`License suspended: ${license.licenseKey} (subscription cancelled)`);
    }
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const paymentIntent = charge.payment_intent as string;
    if (!paymentIntent) return;

    const order = await this.prisma.order.findFirst({ where: { stripePaymentId: paymentIntent } });
    if (!order?.customerId) return;

    this.affiliateService.handleRefund(order.customerId).catch((e) => {
      this.logger.warn(`Affiliate refund handling failed: ${e.message}`);
    });

    this.resellerService.handleChargeback(paymentIntent).catch((e) => {
      this.logger.warn(`Reseller chargeback handling failed: ${e.message}`);
    });

    this.logger.log(`Charge refunded for order ${order.id}, affiliate commission clawed back`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subId = invoice.subscription as string;
    if (!subId) return;

    const license = await this.prisma.license.findFirst({
      where: { stripeSubId: subId },
    });

    if (license) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: 'SUSPENDED' },
      });
      this.logger.warn(`License suspended: ${license.licenseKey} (payment failed)`);
    }
  }
}
