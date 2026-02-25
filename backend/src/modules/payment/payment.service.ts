// ── payment.service.ts ──
import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { LicensePlan, OrderStatus } from '@prisma/client';
import { LicenseService } from '../license/license.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { MailService } from '../customer/mail.service';

const PLANS_CONFIG_KEY = 'admin:plans_config';
const DEFAULT_PLANS: Record<string, { name: string; price: number; active: boolean; stripePrice: string }> = {
  DAYS_1:   { name: '1 Jour',   price: 199,  active: false, stripePrice: '' },
  DAYS_7:   { name: '7 Jours',  price: 499,  active: false, stripePrice: '' },
  DAYS_14:  { name: '14 Jours', price: 799,  active: false, stripePrice: '' },
  DAYS_30:  { name: '30 Jours', price: 999,  active: true,  stripePrice: '' },
  DAYS_90:  { name: '90 Jours', price: 1999, active: true,  stripePrice: '' },
  DAYS_365: { name: '1 An',     price: 2499, active: true,  stripePrice: '' },
  LIFETIME: { name: 'Lifetime', price: 2999, active: true,  stripePrice: '' },
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
  ) {
    const secretKey = config.get<string>('stripe.secretKey', '');
    this.webhookSecret = config.get<string>('stripe.webhookSecret', '');
    this.storefrontUrl = config.get<string>('storefrontUrl', 'http://localhost:3002');

    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    }
  }

  // ── Public: returns active plans with prices ──
  async getActivePlans() {
    let plans = { ...DEFAULT_PLANS };
    const raw = await this.redis.get(PLANS_CONFIG_KEY);
    if (raw) {
      try { plans = { ...plans, ...JSON.parse(raw) }; } catch { /* use defaults */ }
    }
    return Object.entries(plans)
      .filter(([, cfg]) => cfg.active)
      .map(([key, cfg]) => ({ key, name: cfg.name, price: cfg.price, originalPrice: (cfg as any).originalPrice || 0, popular: (cfg as any).popular || false }));
  }

  async confirmPayment(customerId: string, sessionId: string): Promise<{ licenseKey: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    // Retrieve and verify the Stripe session
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      throw new BadRequestException('Le paiement n\'est pas encore complete');
    }

    // Find the order linked to this session for this customer
    const order = await this.prisma.order.findFirst({
      where: { customerId, stripeSessionId: sessionId },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    // Idempotency: payment already confirmed, return existing key
    if (order.status === OrderStatus.COMPLETED && order.licenseId) {
      const existing = await this.prisma.license.findUnique({ where: { id: order.licenseId } });
      if (existing) {
        return { licenseKey: existing.licenseKey };
      }
    }

    // Get customer email for the license
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });

    // Load plan config for the name
    const planKey = session.metadata?.plan || 'LIFETIME';
    let allPlans = { ...DEFAULT_PLANS };
    const rawPlans = await this.redis.get(PLANS_CONFIG_KEY);
    if (rawPlans) {
      try { allPlans = { ...allPlans, ...JSON.parse(rawPlans) }; } catch { /* use defaults */ }
    }

    // Create a fresh unactivated license key
    const plan = this.mapPlan(planKey);
    const license = await this.licenseService.create({
      plan,
      email: customer?.email,
    });

    // Link Stripe customer ID to the license
    if (session.customer) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { stripeCustomerId: session.customer as string },
      });
    }

    // Mark order as completed and link the license
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.COMPLETED,
        licenseId: license.id,
        stripePaymentId: (session.payment_intent as string) || undefined,
        completedAt: new Date(),
      },
    });

    // Send license key by email
    if (customer?.email) {
      const planName = allPlans[planKey]?.name || planKey;
      const profileUrl = `${this.storefrontUrl}/#/profile`;
      try {
        await this.mail.sendLicenseKey(customer.email, license.licenseKey, planName, profileUrl);
      } catch (err) {
        this.logger.error(`Failed to send license email to ${customer.email}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`License assigned on confirm: ${license.licenseKey} for customer ${customerId}`);
    return { licenseKey: license.licenseKey };
  }

  async createCheckoutSession(customerId: string, planKey = 'LIFETIME'): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    // Load plan config from Redis (or defaults)
    let allPlans = { ...DEFAULT_PLANS };
    const raw = await this.redis.get(PLANS_CONFIG_KEY);
    if (raw) {
      try { allPlans = { ...allPlans, ...JSON.parse(raw) }; } catch { /* use defaults */ }
    }

    const planCfg = allPlans[planKey];
    if (!planCfg) throw new BadRequestException(`Plan "${planKey}" introuvable`);
    if (!planCfg.active) throw new BadRequestException(`Le plan "${planCfg.name}" n'est pas disponible`);

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.emailVerified) {
      throw new ForbiddenException('Veuillez verifier votre adresse email avant d\'effectuer un achat');
    }

    const prismaplan = this.mapPlan(planKey);

    // Create a pending order
    const order = await this.prisma.order.create({
      data: {
        customerId,
        plan: prismaplan,
        amount: planCfg.price,
        currency: 'EUR',
        status: OrderStatus.PENDING,
      },
    });

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customer.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Guide FortniteOpti — ${planCfg.name}`,
              description: '100+ pages d\'optimisation Fortnite, Discord VIP, mises à jour incluses',
            },
            unit_amount: planCfg.price,
          },
          quantity: 1,
        },
      ],
      metadata: { plan: planKey, customerId, orderId: order.id },
      success_url: `${this.storefrontUrl}/#/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.storefrontUrl}/#/payment`,
    });

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
    const planId = session.metadata?.plan || 'DAYS_30';
    const orderId = session.metadata?.orderId;

    let allPlans = { ...DEFAULT_PLANS };
    const rawPlans = await this.redis.get(PLANS_CONFIG_KEY);
    if (rawPlans) {
      try { allPlans = { ...allPlans, ...JSON.parse(rawPlans) }; } catch { /* use defaults */ }
    }

    const plan = this.mapPlan(planId);

    const license = await this.licenseService.create({
      plan,
      email: email || undefined,
    });

    // Link Stripe IDs
    await this.prisma.license.update({
      where: { id: license.id },
      data: {
        stripeSubId: (session.subscription as string) || undefined,
        stripeCustomerId: (session.customer as string) || undefined,
      },
    });

    // Complete the pending order and link the license
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

    // Send license key by email
    if (email) {
      const planName = allPlans[planId]?.name || planId;
      const profileUrl = `${this.storefrontUrl}/#/profile`;
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

  private mapPlan(planId: string): LicensePlan {
    const map: Record<string, LicensePlan> = {
      'DAYS_1':   LicensePlan.DAYS_1,
      'DAYS_7':   LicensePlan.DAYS_7,
      'DAYS_14':  LicensePlan.DAYS_14,
      'DAYS_30':  LicensePlan.DAYS_30,
      'DAYS_90':  LicensePlan.DAYS_90,
      'DAYS_365': LicensePlan.DAYS_365,
      'LIFETIME': LicensePlan.LIFETIME,
      '1d':       LicensePlan.DAYS_1,
      '7d':       LicensePlan.DAYS_7,
      '14d':      LicensePlan.DAYS_14,
      '30d':      LicensePlan.DAYS_30,
      '90d':      LicensePlan.DAYS_90,
      '365d':     LicensePlan.DAYS_365,
      'lifetime': LicensePlan.LIFETIME,
    };
    return map[planId] || LicensePlan.DAYS_30;
  }
}
