import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { AlertsService } from '../alerts/alerts.service';
import { KillService } from '../kill-switch/kill.service';
import { randomBytes } from 'crypto';
import Stripe from 'stripe';
import { LicensePlan } from '@prisma/client';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CURRENT_TERMS_VERSION = '1.0';
const BATCH_EXPIRY_MONTHS = 12;
const GRACE_PERIOD_DAYS = 90;

const SLUG_TO_LICENSE_PLAN: Record<string, LicensePlan> = {
  '1d': LicensePlan.DAYS_1,
  '3d': LicensePlan.DAYS_3,
  '1w': LicensePlan.DAYS_7,
  '1m': LicensePlan.DAYS_30,
  'life': LicensePlan.LIFETIME,
};

function gameSlugToProduct(slug: string): string {
  if (slug === 'fortnite') return 'FORTNITE_CLIENT';
  return 'SHOP_' + slug.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function generateResellerKey(prefix?: string): string {
  const segments = 4;
  const segLen = 5;
  const parts: string[] = [];
  for (let s = 0; s < segments; s++) {
    const bytes = randomBytes(segLen);
    let seg = '';
    for (let i = 0; i < segLen; i++) seg += CHARS[bytes[i] % CHARS.length];
    parts.push(seg);
  }
  const pfx = prefix ? `R${prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}` : 'R404';
  return `${pfx}-${parts.join('-')}`;
}

@Injectable()
export class ResellerService {
  private readonly logger = new Logger(ResellerService.name);
  private stripe: Stripe | null = null;
  private shopUrl: string;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private alerts: AlertsService,
    private killService: KillService,
    private config: ConfigService,
  ) {
    const sk = config.get<string>('stripe.secretKey', '');
    if (sk) this.stripe = new Stripe(sk, { apiVersion: '2023-10-16' });
    this.shopUrl = config.get<string>('shopStorefrontUrl', 'https://shop.404tweaks.tech');
  }

  // ══════════════ Customer endpoints ══════════════

  async enroll(customerId: string, dto: {
    companyName: string; shopUrl: string; country: string;
    activity: string; telegram?: string; monthlyVolume?: string;
  }) {
    const existing = await this.prisma.reseller.findUnique({ where: { customerId } });
    if (existing) throw new BadRequestException('Vous êtes déjà inscrit comme reseller');

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Compte introuvable');
    if (!customer.emailVerified) throw new BadRequestException('Email non vérifié');

    const bronzeTier = await this.prisma.resellerTier.findUnique({ where: { name: 'bronze' } });
    if (!bronzeTier) throw new BadRequestException('Configuration tiers manquante');

    const reseller = await this.prisma.reseller.create({
      data: {
        customerId,
        tierId: bronzeTier.id,
        companyName: dto.companyName.trim(),
        shopUrl: dto.shopUrl.trim(),
        country: dto.country.trim(),
        activity: dto.activity.trim(),
        telegram: dto.telegram?.trim() || null,
        monthlyVolume: dto.monthlyVolume?.trim() || null,
      },
    });

    this.alerts.sendAdminNotification('New Reseller Application',
      `**${customer.username}** (${customer.email}) a demandé un compte reseller`,
      [
        { name: 'Company', value: dto.companyName, inline: true },
        { name: 'Shop URL', value: dto.shopUrl, inline: true },
        { name: 'Country', value: dto.country, inline: true },
        { name: 'Activity', value: dto.activity.slice(0, 200), inline: false },
        { name: 'Telegram', value: dto.telegram || '—', inline: true },
        { name: 'Volume', value: dto.monthlyVolume || '—', inline: true },
      ],
    ).catch(() => {});

    return { resellerId: reseller.id, status: reseller.status };
  }

  async getMe(customerId: string) {
    const r = await this.prisma.reseller.findUnique({
      where: { customerId },
      include: { tier: true, customer: { select: { email: true, username: true } } },
    });
    if (!r) throw new NotFoundException('Vous n\'êtes pas reseller');

    return {
      id: r.id, status: r.status, tier: r.tier.name,
      discount: r.discountOverride ?? r.tier.discount,
      companyName: r.companyName, shopUrl: r.shopUrl,
      customPrefix: r.customPrefix,
      wallet: r.walletCents,
      totalSpent: r.totalSpentCents,
      totalKeys: r.totalKeysGenerated,
      totalActivated: r.totalKeysActivated,
      kycVerified: r.kycVerified,
      termsVersion: r.termsVersion,
      termsAcceptedAt: r.termsAcceptedAt,
      currentTermsVersion: CURRENT_TERMS_VERSION,
      minBatchKeys: r.tier.minBatchKeys,
      requiresKyc: r.tier.requiresKyc,
    };
  }

  async acceptTerms(customerId: string) {
    const r = await this.requireReseller(customerId);
    await this.prisma.reseller.update({
      where: { id: r.id },
      data: { termsVersion: CURRENT_TERMS_VERSION, termsAcceptedAt: new Date() },
    });
    return { success: true, version: CURRENT_TERMS_VERSION };
  }

  // ── Wallet ──

  async topupWallet(customerId: string, amountCents: number, method: string) {
    const r = await this.requireActiveReseller(customerId);
    if (amountCents < 1000) throw new BadRequestException('Minimum topup : 10€');
    if (!this.stripe) throw new BadRequestException('Stripe non configuré');

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });

    const topup = await this.prisma.walletTopup.create({
      data: { resellerId: r.id, amountCents, method: 'stripe' },
    });

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customer?.email,
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: amountCents,
          product_data: { name: `Reseller Wallet Top-up (${(amountCents / 100).toFixed(2)}€)` },
        },
        quantity: 1,
      }],
      metadata: { type: 'RESELLER_TOPUP', topupId: topup.id, resellerId: r.id, customerId },
      success_url: `${this.shopUrl}/#profile`,
      cancel_url: `${this.shopUrl}/#profile`,
    });

    await this.prisma.walletTopup.update({
      where: { id: topup.id },
      data: { stripeSessionId: session.id },
    });

    return { topupId: topup.id, url: session.url };
  }

  async completeTopup(topupId: string, stripePaymentId?: string) {
    const topup = await this.prisma.walletTopup.findUnique({ where: { id: topupId } });
    if (!topup || topup.status !== 'pending') return;

    await this.prisma.$transaction([
      this.prisma.walletTopup.update({
        where: { id: topupId },
        data: { status: 'completed', completedAt: new Date(), stripePaymentId },
      }),
      this.prisma.reseller.update({
        where: { id: topup.resellerId },
        data: { walletCents: { increment: topup.amountCents } },
      }),
    ]);

    this.logger.log(`Reseller wallet topped up: ${topup.resellerId} +${topup.amountCents}c`);
  }

  async getWalletHistory(customerId: string, limit = 50) {
    const r = await this.requireReseller(customerId);
    return this.prisma.walletTopup.findMany({
      where: { resellerId: r.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Batches ──

  async orderBatch(customerId: string, productId: string, plan: string, keyCount: number) {
    const r = await this.requireActiveReseller(customerId);

    if (r.termsVersion !== CURRENT_TERMS_VERSION) {
      throw new BadRequestException('Vous devez accepter les conditions avant de commander');
    }

    const tier = await this.prisma.resellerTier.findUnique({ where: { id: r.tierId } });
    if (!tier) throw new BadRequestException('Tier introuvable');

    if (keyCount < tier.minBatchKeys) {
      throw new BadRequestException(`Minimum ${tier.minBatchKeys} clés pour votre tier`);
    }

    if (tier.requiresKyc && !r.kycVerified) {
      throw new BadRequestException('KYC requis pour votre tier. Uploadez vos documents.');
    }

    // Resolve game slug → product string
    const game = await this.prisma.game.findUnique({ where: { slug: productId } });
    if (!game) throw new BadRequestException('Produit introuvable');
    const productKey = gameSlugToProduct(game.slug);

    // Resolve plan slug → LicensePlan enum
    const shopPlan = await this.prisma.shopPlan.findUnique({ where: { slug: plan } });
    if (!shopPlan) throw new BadRequestException('Plan introuvable');
    const licensePlan = SLUG_TO_LICENSE_PLAN[shopPlan.slug];
    if (!licensePlan) throw new BadRequestException(`Plan "${shopPlan.slug}" non supporté pour le reselling`);

    const retailCents = Math.round(shopPlan.price * 100);

    const discount = r.discountOverride ?? tier.discount;
    const unitPrice = Math.round(retailCents * (1 - discount));
    const totalCents = unitPrice * keyCount;

    if (totalCents > r.walletCents) {
      throw new BadRequestException(`Solde insuffisant : ${r.walletCents / 100}€ disponible, ${totalCents / 100}€ requis`);
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + BATCH_EXPIRY_MONTHS);

    const prefix = (tier.order >= 1 && r.customPrefix) ? r.customPrefix : undefined;

    // Generate unique keys
    const keys: string[] = [];
    for (let i = 0; i < keyCount; i++) {
      let key: string;
      let attempts = 0;
      do {
        key = generateResellerKey(prefix);
        attempts++;
        if (attempts > 100) throw new BadRequestException('Key generation failed — retry');
      } while (await this.prisma.license.findUnique({ where: { licenseKey: key } }));
      keys.push(key);
    }

    // Create batch + keys + debit wallet in transaction
    const batch = await this.prisma.$transaction(async (tx) => {
      const b = await tx.keyBatch.create({
        data: {
          resellerId: r.id, productId: productKey, plan: licensePlan,
          keyCount, unitPriceCents: unitPrice, totalCents, discountRate: discount,
          expiresAt,
        },
      });

      const licenseExpiry = this.calculateLicenseExpiry(licensePlan);

      for (const key of keys) {
        await tx.license.create({
          data: {
            licenseKey: key, plan: licensePlan, product: productKey,
            expiresAt: licenseExpiry, resellerId: r.id, batchId: b.id,
            metadata: { source: 'reseller', batchId: b.id, shopGame: game.slug, shopPlan: shopPlan.slug },
          },
        });
      }

      await tx.reseller.update({
        where: { id: r.id },
        data: {
          walletCents: { decrement: totalCents },
          totalSpentCents: { increment: totalCents },
          totalKeysGenerated: { increment: keyCount },
        },
      });

      return b;
    });

    this.alerts.sendAdminNotification('Reseller Batch Order',
      `Reseller **${r.companyName || r.id.slice(0, 8)}** a commandé **${keyCount}** clés ${game.slug}/${shopPlan.slug}`,
      [
        { name: 'Total', value: `${totalCents / 100}€`, inline: true },
        { name: 'Discount', value: `${(discount * 100).toFixed(0)}%`, inline: true },
        { name: 'Batch ID', value: batch.id, inline: true },
      ],
    ).catch(() => {});

    return { batchId: batch.id, keyCount, totalCents, unitPriceCents: unitPrice, discount };
  }

  async listBatches(customerId: string, limit = 50, offset = 0) {
    const r = await this.requireReseller(customerId);
    const [batches, total] = await Promise.all([
      this.prisma.keyBatch.findMany({
        where: { resellerId: r.id },
        orderBy: { createdAt: 'desc' },
        take: limit, skip: offset,
      }),
      this.prisma.keyBatch.count({ where: { resellerId: r.id } }),
    ]);
    return { batches, total };
  }

  async getBatch(customerId: string, batchId: string) {
    const r = await this.requireReseller(customerId);
    const batch = await this.prisma.keyBatch.findUnique({ where: { id: batchId } });
    if (!batch || batch.resellerId !== r.id) throw new NotFoundException('Batch introuvable');

    const keys = await this.prisma.license.findMany({
      where: { batchId },
      select: { licenseKey: true, status: true, activatedHwid: true, activatedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return { ...batch, keys };
  }

  async getBatchCsv(customerId: string, batchId: string): Promise<string> {
    const data = await this.getBatch(customerId, batchId);
    const header = 'key,status,activated,activated_at,expires_at';
    const rows = data.keys.map(k =>
      `${k.licenseKey},${k.status},${k.activatedHwid ? 'yes' : 'no'},${k.activatedAt?.toISOString() || ''},${k.expiresAt?.toISOString() || 'lifetime'}`,
    );
    return [header, ...rows].join('\n');
  }

  async getStats(customerId: string) {
    const r = await this.requireReseller(customerId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

    const [totalKeys, activatedKeys, activatedLast30] = await Promise.all([
      this.prisma.license.count({ where: { resellerId: r.id } }),
      this.prisma.license.count({ where: { resellerId: r.id, activatedHwid: { not: null } } }),
      this.prisma.license.count({ where: { resellerId: r.id, activatedAt: { gte: thirtyDaysAgo } } }),
    ]);

    const activationRate = totalKeys > 0 ? +(activatedKeys / totalKeys).toFixed(4) : 0;

    // Calculate avg time to activate using SQL instead of raw aggregation
    const avgResult = await this.prisma.$queryRawUnsafe<{ avg_hours: number }[]>(
      `SELECT EXTRACT(EPOCH FROM AVG(activated_at - created_at)) / 3600 as avg_hours
       FROM licenses WHERE reseller_id = $1 AND activated_at IS NOT NULL`, r.id,
    ).catch(() => [{ avg_hours: 0 }]);

    return {
      totalKeys, activatedKeys, activationRate,
      activatedLast30,
      avgTimeToActivateHours: Math.round(avgResult[0]?.avg_hours || 0),
      totalSpent: r.totalSpentCents,
      walletBalance: r.walletCents,
    };
  }

  // ── KYC ──

  async uploadKycDoc(customerId: string, filePath: string) {
    const r = await this.requireReseller(customerId);
    await this.prisma.reseller.update({
      where: { id: r.id },
      data: { kycDocPath: filePath },
    });
    this.alerts.sendAdminNotification('KYC Document Uploaded',
      `Reseller **${r.companyName || r.id.slice(0, 8)}** a uploadé un document KYC`,
    ).catch(() => {});
    return { success: true };
  }

  // ══════════════ Admin endpoints ══════════════

  async adminList(filters: { status?: string; tier?: string }) {
    const where: any = {};
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    if (filters.tier && filters.tier !== 'all') where.tier = { name: filters.tier };

    return this.prisma.reseller.findMany({
      where, orderBy: { totalSpentCents: 'desc' }, take: 200,
      include: {
        customer: { select: { email: true, username: true } },
        tier: { select: { name: true, discount: true } },
      },
    });
  }

  async adminApprove(id: string) {
    const r = await this.prisma.reseller.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reseller introuvable');
    await this.prisma.reseller.update({ where: { id }, data: { status: 'active' } });
    this.alerts.sendAdminNotification('Reseller Approved', `Reseller \`${id.slice(0, 8)}\` approuvé`).catch(() => {});
  }

  async adminSuspend(id: string, reason: string) {
    await this.prisma.reseller.update({
      where: { id }, data: { status: 'suspended', suspendReason: reason },
    });
    this.alerts.sendAdminNotification('Reseller Suspended', `Reseller \`${id.slice(0, 8)}\` suspendu: ${reason}`).catch(() => {});
  }

  async adminSetTier(id: string, tierName: string, discountOverride?: number) {
    const tier = await this.prisma.resellerTier.findUnique({ where: { name: tierName } });
    if (!tier) throw new BadRequestException('Tier invalide');
    await this.prisma.reseller.update({
      where: { id },
      data: { tierId: tier.id, discountOverride: discountOverride ?? null, belowThresholdSince: null },
    });
  }

  async adminCredit(id: string, amountCents: number, reason: string) {
    await this.prisma.$transaction([
      this.prisma.reseller.update({
        where: { id }, data: { walletCents: { increment: amountCents } },
      }),
      this.prisma.walletTopup.create({
        data: { resellerId: id, amountCents, method: 'manual', status: 'completed', completedAt: new Date() },
      }),
    ]);
    this.alerts.sendAdminNotification('Reseller Manual Credit',
      `Reseller \`${id.slice(0, 8)}\` credited **${amountCents / 100}€** — ${reason}`,
    ).catch(() => {});
  }

  async adminListBatches(resellerId: string) {
    return this.prisma.keyBatch.findMany({
      where: { resellerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async adminRevokeBatch(batchId: string, reason: string, adminUsername: string) {
    const batch = await this.prisma.keyBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Batch introuvable');
    if (batch.revokedAt) throw new BadRequestException('Batch déjà révoqué');

    // Revoke via KillSwitch — ban all licenses in this batch
    const licenses = await this.prisma.license.findMany({
      where: { batchId },
      select: { id: true, product: true },
    });

    await this.prisma.$transaction([
      this.prisma.keyBatch.update({
        where: { id: batchId },
        data: { revokedAt: new Date(), revokedReason: reason },
      }),
      this.prisma.license.updateMany({
        where: { batchId },
        data: { status: 'BANNED', bannedAt: new Date(), banReason: `Batch revoked: ${reason}` },
      }),
    ]);

    // Activate kill switch for each product in the batch
    const products = [...new Set(licenses.map(l => l.product))];
    for (const prod of products) {
      await this.killService.activate(
        prod, 'all', `Reseller batch ${batchId.slice(0, 8)} revoked: ${reason}`,
        adminUsername, undefined, 1,
      ).catch(() => {});
    }

    this.alerts.sendCriticalAlert('Reseller Batch Revoked',
      `Batch \`${batchId.slice(0, 8)}\` — **${batch.keyCount}** clés bannies — ${reason}`,
    ).catch(() => {});

    return { revoked: licenses.length };
  }

  // ══════════════ Chargeback handling ══════════════

  async handleChargeback(stripeRef: string) {
    const topup = await this.prisma.walletTopup.findFirst({
      where: {
        OR: [
          { stripeSessionId: stripeRef },
          { stripePaymentId: stripeRef },
        ],
        status: 'completed',
      },
    });
    if (!topup) return;

    await this.prisma.walletTopup.update({
      where: { id: topup.id }, data: { status: 'chargebacked' },
    });

    // Find batches ordered after this topup
    const batches = await this.prisma.keyBatch.findMany({
      where: { resellerId: topup.resellerId, createdAt: { gte: topup.completedAt || topup.createdAt }, revokedAt: null },
    });

    for (const batch of batches) {
      await this.adminRevokeBatch(batch.id, 'Chargeback on wallet topup', 'system:chargeback');
    }

    await this.prisma.reseller.update({
      where: { id: topup.resellerId },
      data: { status: 'suspended', suspendReason: 'Chargeback detected' },
    });

    this.alerts.sendCriticalAlert('Reseller Chargeback',
      `Reseller \`${topup.resellerId.slice(0, 8)}\` — chargeback **${topup.amountCents / 100}€** — account suspended, ${batches.length} batches revoked`,
    ).catch(() => {});
  }

  // ══════════════ Cron jobs ══════════════

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async expireUnactivatedBatchKeys() {
    const now = new Date();
    const expired = await this.prisma.license.updateMany({
      where: {
        batchId: { not: null },
        activatedHwid: null,
        status: 'ACTIVE',
        batch: { expiresAt: { lt: now } },
      },
      data: { status: 'EXPIRED' },
    });
    if (expired.count > 0) this.logger.log(`Expired ${expired.count} unactivated reseller keys`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async flagLowActivationResellers() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000);
    const resellers = await this.prisma.reseller.findMany({
      where: { status: 'active' },
      select: { id: true, companyName: true, totalKeysGenerated: true, totalKeysActivated: true, createdAt: true },
    });

    for (const r of resellers) {
      if (r.createdAt > ninetyDaysAgo || r.totalKeysGenerated < 20) continue;
      const rate = r.totalKeysActivated / r.totalKeysGenerated;
      if (rate < 0.3) {
        this.alerts.sendAdminNotification('Low Activation Rate',
          `Reseller **${r.companyName || r.id.slice(0, 8)}** — ${(rate * 100).toFixed(0)}% activation rate (${r.totalKeysActivated}/${r.totalKeysGenerated})`,
        ).catch(() => {});
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async recalcTiers() {
    const resellers = await this.prisma.reseller.findMany({
      where: { status: 'active' },
      include: { tier: true },
    });
    const tiers = await this.prisma.resellerTier.findMany({ orderBy: { order: 'desc' } });
    let upgraded = 0, downgraded = 0;

    for (const r of resellers) {
      let deservedTier = tiers[tiers.length - 1]; // bronze (lowest)
      for (const t of tiers) {
        if (r.totalSpentCents >= t.minSpentCents) { deservedTier = t; break; }
      }

      const currentOrder = r.tier.order;
      const deservedOrder = deservedTier.order;

      if (deservedOrder > currentOrder) {
        await this.prisma.reseller.update({
          where: { id: r.id },
          data: { tierId: deservedTier.id, belowThresholdSince: null },
        });
        upgraded++;
      } else if (deservedOrder < currentOrder) {
        if (!r.belowThresholdSince) {
          await this.prisma.reseller.update({
            where: { id: r.id }, data: { belowThresholdSince: new Date() },
          });
        } else {
          const daysBelowThreshold = (Date.now() - r.belowThresholdSince.getTime()) / 86400_000;
          if (daysBelowThreshold >= GRACE_PERIOD_DAYS) {
            await this.prisma.reseller.update({
              where: { id: r.id },
              data: { tierId: deservedTier.id, belowThresholdSince: null },
            });
            downgraded++;
          }
        }
      } else if (r.belowThresholdSince) {
        await this.prisma.reseller.update({
          where: { id: r.id }, data: { belowThresholdSince: null },
        });
      }
    }

    if (upgraded) this.logger.log(`Upgraded ${upgraded} resellers`);
    if (downgraded) this.logger.log(`Downgraded ${downgraded} resellers after grace period`);
  }

  // ══════════════ Anti-fraud on activation ══════════════

  async checkResellerActivation(licenseId: string, hwid: string): Promise<boolean> {
    const license = await this.prisma.license.findUnique({ where: { id: licenseId } });
    if (!license?.resellerId) return true;

    const reseller = await this.prisma.reseller.findUnique({ where: { id: license.resellerId } });
    if (!reseller) return true;

    // Check if HWID belongs to the reseller themselves
    const resellerCustomer = await this.prisma.customer.findUnique({ where: { id: reseller.customerId } });
    if (resellerCustomer) {
      const resellerLicenses = await this.prisma.license.findMany({
        where: { email: resellerCustomer.email, resellerId: null },
        select: { hwid: true },
      });
      if (resellerLicenses.some(l => l.hwid === hwid)) {
        return false; // Block — reseller trying to use their own keys
      }
    }

    // Mark activation
    if (!license.activatedHwid) {
      await this.prisma.license.update({
        where: { id: licenseId },
        data: { activatedHwid: hwid, activatedAt: new Date() },
      });
      await this.prisma.reseller.update({
        where: { id: reseller.id },
        data: { totalKeysActivated: { increment: 1 } },
      });
      // Update batch activated count
      if (license.batchId) {
        await this.prisma.keyBatch.update({
          where: { id: license.batchId },
          data: { activatedCount: { increment: 1 } },
        });
      }
    }

    return true;
  }

  // ══════════════ Helpers ══════════════

  private async requireReseller(customerId: string) {
    const r = await this.prisma.reseller.findUnique({ where: { customerId } });
    if (!r) throw new NotFoundException('Vous n\'êtes pas reseller');
    return r;
  }

  private async requireActiveReseller(customerId: string) {
    const r = await this.requireReseller(customerId);
    if (r.status !== 'active') throw new ForbiddenException('Compte reseller non actif');
    return r;
  }

  private async getRetailPrice(productId: string, plan: string): Promise<number | null> {
    // Try shop plans from DB first
    const shopPlan = await this.prisma.shopPlan.findFirst({
      where: { slug: { contains: plan.toLowerCase() }, visible: true },
    });
    if (shopPlan) return Math.round(shopPlan.price * 100);

    // Fall back to Redis plan configs
    const configKeys = ['admin:plans_config', 'admin:ng_plans_config', 'admin:shop_plans_config'];
    for (const key of configKeys) {
      const raw = await this.redis.get(key);
      if (!raw) continue;
      try {
        const plans = JSON.parse(raw);
        const match = plans.find((p: any) =>
          (p.plan === plan || p.licensePlan === plan) &&
          (!p.product || p.product === productId),
        );
        if (match) return Math.round((match.price || match.amount || 0) * 100);
      } catch { continue; }
    }

    return null;
  }

  private calculateLicenseExpiry(plan: string): Date | null {
    const days: Record<string, number> = {
      DAYS_1: 1, DAYS_3: 3, DAYS_7: 7, DAYS_14: 14, DAYS_30: 30,
      DAYS_90: 90, DAYS_365: 365,
    };
    if (plan === 'LIFETIME') return null;
    const d = days[plan];
    if (!d) return null;
    return new Date(Date.now() + d * 86400_000);
  }
}
