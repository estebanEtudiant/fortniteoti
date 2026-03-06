import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { LicensePlan, OrderStatus } from '@prisma/client';
import { LicenseService } from '../license/license.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { MailService } from '../customer/mail.service';
import { BotNotifyService } from '../bot/bot-notify.service';

const PLANS_CONFIG_KEY = 'admin:plans_config';
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
  private webhookSecret: string;
  private readonly logger = new Logger(PaymentService.name);
  private storefrontUrl: string;

  constructor(
    private config: ConfigService,
    private licenseService: LicenseService,
    private prisma: PrismaService,
    private redis: RedisService,
    private mail: MailService,
    private botNotify: BotNotifyService,
  ) {
    const secretKey = config.get<string>('stripe.secretKey', '');
    this.webhookSecret = config.get<string>('stripe.webhookSecret', '');
    this.storefrontUrl = config.get<string>('storefrontUrl', 'http://localhost:3002');

    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    }
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

  async getActivePlans() {
    const plans = await this.loadPlans();
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

  async confirmPayment(customerId: string, sessionId: string): Promise<{ licenseKey: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.retrieve(sessionId);
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
      const existing = await this.prisma.license.findUnique({ where: { id: order.licenseId } });
      if (existing) {
        return { licenseKey: existing.licenseKey };
      }
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });

    const allPlans = await this.loadPlans();
    const planKey = this.sanitizePlanKey(session.metadata?.plan || 'LIFETIME');
    const planCfg = allPlans[planKey];
    const resolvedLicense = this.resolveLicenseFromPlan(planKey, planCfg);

    const license = await this.licenseService.create({
      ...resolvedLicense,
      email: customer?.email,
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
      const profileUrl = `${this.storefrontUrl}/profile`;
      try {
        await this.mail.sendLicenseKey(customer.email, license.licenseKey, planName, profileUrl);
      } catch (err) {
        this.logger.error(`Failed to send license email to ${customer.email}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`License assigned on confirm: ${license.licenseKey} for customer ${customerId}`);
    this.botNotify.notifySale(planKey, order.amount).catch(() => {});

    return { licenseKey: license.licenseKey };
  }

  async createCheckoutSession(customerId: string, planKey = 'LIFETIME', promoCode?: string): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    const allPlans = await this.loadPlans();
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

    let stripeCouponId: string | undefined;
    if (promoCode) {
      try {
        const raw = await this.redis.get(PROMO_CODES_KEY);
        const codes: Record<string, any> = raw ? JSON.parse(raw) : {};
        const promo = codes[promoCode.toUpperCase()];
        if (promo?.active && promo.stripeId) {
          stripeCouponId = promo.stripeId;
          promo.uses = (promo.uses || 0) + 1;
          codes[promoCode.toUpperCase()] = promo;
          await this.redis.set(PROMO_CODES_KEY, JSON.stringify(codes));
        }
      } catch {
        // ignore promo errors
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customer.email,
      line_items: planCfg.stripePrice
        ? [{ price: planCfg.stripePrice, quantity: 1 }]
        : [{
            price_data: {
              currency: 'eur',
              product_data: {
                name: `404 Tweaks - ${planCfg.name}`,
                description: planCfg.description || '98 optimisations Fortnite, Discord VIP, mises a jour incluses',
              },
              unit_amount: planCfg.price,
            },
            quantity: 1,
          }],
      metadata: {
        plan: selectedPlanKey,
        customerId,
        orderId: order.id,
      },
      success_url: `${this.storefrontUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.storefrontUrl}/payment`,
    };

    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

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
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const email = session.customer_email || session.customer_details?.email;
    const planKey = this.sanitizePlanKey(session.metadata?.plan || 'DAYS_30');
    const orderId = session.metadata?.orderId;

    const allPlans = await this.loadPlans();
    const planCfg = allPlans[planKey];
    const resolvedLicense = this.resolveLicenseFromPlan(planKey, planCfg);

    const license = await this.licenseService.create({
      ...resolvedLicense,
      email: email || undefined,
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

    if (email) {
      const planName = planCfg?.name || planKey;
      const profileUrl = `${this.storefrontUrl}/profile`;
      try {
        await this.mail.sendLicenseKey(email, license.licenseKey, planName, profileUrl);
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
