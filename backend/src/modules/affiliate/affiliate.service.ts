import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { AlertsService } from '../alerts/alerts.service';
import * as crypto from 'crypto';

// renewalIndex 0 = first purchase (full rate), 1-3 = renewals (50% rate), >=4 = no commission
const MAX_RENEWAL_INDEX = 3;
const RENEWAL_RATE_MULTIPLIER = 0.5;
const GRACE_PERIOD_DAYS = 60;

const DEFAULT_TIER_CONFIG: Record<string, { minRevenueCents: number; rate: number; approvalDays: number }> = {
  bronze:  { minRevenueCents: 0,      rate: 0.20, approvalDays: 30 },
  silver:  { minRevenueCents: 50000,  rate: 0.25, approvalDays: 21 },
  gold:    { minRevenueCents: 200000, rate: 0.30, approvalDays: 14 },
  diamond: { minRevenueCents: 500000, rate: 0.35, approvalDays: 7  },
};

const DEFAULT_MIN_PAYOUT: Record<string, number> = {
  crypto_btc: 7500,
  crypto_xmr: 7500,
  crypto_usdt: 5000,
  sepa: 10000,
  stripe_balance: 5000,
  store_credit: 2000,
};

const TIER_CONFIG_KEY = 'affiliate:tier_config';
const MIN_PAYOUT_KEY = 'affiliate:min_payout';

@Injectable()
export class AffiliateService {
  private readonly logger = new Logger(AffiliateService.name);
  private tierConfig: Record<string, { minRevenueCents: number; rate: number; approvalDays: number }> = { ...DEFAULT_TIER_CONFIG };
  private minPayout: Record<string, number> = { ...DEFAULT_MIN_PAYOUT };

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private alerts: AlertsService,
  ) {
    this.loadTierConfig();
  }

  private async loadTierConfig() {
    try {
      const raw = await this.redis.get(TIER_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.bronze?.minRevenueCents !== undefined) {
          this.tierConfig = parsed;
        }
      }
      const mp = await this.redis.get(MIN_PAYOUT_KEY);
      if (mp) this.minPayout = { ...DEFAULT_MIN_PAYOUT, ...JSON.parse(mp) };
    } catch { /* use defaults */ }
  }

  async getTierConfig() {
    return { tiers: this.tierConfig, minPayout: this.minPayout };
  }

  async updateTierConfig(
    tiers: Record<string, { minRevenueCents: number; rate: number; approvalDays: number }>,
    minPayout?: Record<string, number>,
  ) {
    for (const key of ['bronze', 'silver', 'gold', 'diamond']) {
      if (!tiers[key]) throw new BadRequestException(`Tier "${key}" manquant`);
      const t = tiers[key];
      if (typeof t.minRevenueCents !== 'number' || typeof t.rate !== 'number' || typeof t.approvalDays !== 'number') {
        throw new BadRequestException(`Tier "${key}" invalide`);
      }
    }
    this.tierConfig = tiers;
    await this.redis.set(TIER_CONFIG_KEY, JSON.stringify(tiers));
    if (minPayout) {
      this.minPayout = { ...DEFAULT_MIN_PAYOUT, ...minPayout };
      await this.redis.set(MIN_PAYOUT_KEY, JSON.stringify(this.minPayout));
    }
    this.logger.log('Tier config updated');
    return this.getTierConfig();
  }

  // ── Enroll ──
  async enroll(customerId: string, requestedCode?: string) {
    const existing = await this.prisma.affiliate.findUnique({ where: { customerId } });
    if (existing) throw new BadRequestException('Vous êtes déjà affilié');

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Compte introuvable');

    let code = requestedCode?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code) {
      if (code.length < 4 || code.length > 15) throw new BadRequestException('Le code doit faire entre 4 et 15 caractères alphanumériques');
      const taken = await this.prisma.affiliate.findUnique({ where: { code } });
      if (taken) throw new BadRequestException('Ce code est déjà pris');
    } else {
      code = await this.generateUniqueCode(customer.username);
    }

    const aff = await this.prisma.affiliate.create({
      data: { customerId, code, tier: 'bronze', commissionRate: this.tierConfig.bronze.rate },
    });

    this.alerts.sendAdminNotification('New Affiliate', `**${customer.username}** enrolled with code \`${code}\``).catch(() => {});
    return { affiliateId: aff.id, code: aff.code, tier: aff.tier, commissionRate: aff.commissionRate };
  }

  // ── Get my affiliate data ──
  async getMe(customerId: string) {
    const aff = await this.prisma.affiliate.findUnique({ where: { customerId } });
    if (!aff) throw new NotFoundException('Vous n\'êtes pas affilié');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
    const [clicks30d, conv30d, revenue30d] = await Promise.all([
      this.prisma.referralClick.count({ where: { affiliateId: aff.id, ts: { gte: thirtyDaysAgo } } }),
      this.prisma.referralConversion.count({ where: { affiliateId: aff.id, createdAt: { gte: thirtyDaysAgo }, status: { not: 'rejected' } } }),
      this.prisma.referralConversion.aggregate({
        where: { affiliateId: aff.id, status: { in: ['approved', 'pending'] }, createdAt: { gte: thirtyDaysAgo } },
        _sum: { amountCents: true, commissionCents: true },
      }),
    ]);

    const rev30d = revenue30d._sum.amountCents || 0;
    const earnings30d = revenue30d._sum.commissionCents || 0;

    const nextTier = this.getNextTier(aff.tier);
    const revenueNeeded = nextTier ? this.tierConfig[nextTier].minRevenueCents - rev30d : 0;

    return {
      code: aff.code, status: aff.status, tier: aff.tier, commissionRate: aff.commissionRate,
      stats: {
        clicks30d, conversions30d: conv30d,
        revenue30d: rev30d,
        earnings30d,
        totalEarned: aff.totalEarnedCents, totalPaid: aff.totalPaidCents,
        pending: aff.pendingCents,
        conversionRate: clicks30d > 0 ? +(conv30d / clicks30d).toFixed(4) : 0,
      },
      tierProgress: {
        current: aff.tier,
        next: nextTier,
        revenueNeeded: Math.max(0, revenueNeeded),
        belowThresholdSince: aff.belowThresholdSince,
      },
    };
  }

  // ── Clicks ──
  async getClicks(customerId: string, days = 30, limit = 100) {
    const aff = await this.requireAffiliate(customerId);
    const since = new Date(Date.now() - days * 86400_000);
    return this.prisma.referralClick.findMany({
      where: { affiliateId: aff.id, ts: { gte: since } },
      select: { landingPath: true, referer: true, country: true, ts: true },
      orderBy: { ts: 'desc' }, take: limit,
    });
  }

  // ── Conversions ──
  async getConversions(customerId: string, status?: string, limit = 50) {
    const aff = await this.requireAffiliate(customerId);
    const where: any = { affiliateId: aff.id };
    if (status && status !== 'all') where.status = status;
    const rows = await this.prisma.referralConversion.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit,
      select: {
        id: true, amountCents: true, commissionCents: true, commissionRate: true,
        renewalIndex: true, status: true, createdAt: true, referredCustomerId: true,
      },
    });
    return rows.map(r => ({ ...r, referredCustomerId: undefined, referredEmail: '***' }));
  }

  // ── Payouts ──
  async requestPayout(customerId: string, amountCents: number, method: string, destination: string) {
    const aff = await this.requireAffiliate(customerId);
    if (aff.status !== 'active') throw new ForbiddenException('Affiliate account suspended');

    const validMethods = ['crypto_btc', 'crypto_usdt', 'crypto_xmr', 'stripe_balance', 'sepa', 'store_credit'];
    if (!validMethods.includes(method)) throw new BadRequestException('Méthode de paiement invalide');

    const minCents = this.minPayout[method] || 5000;
    if (amountCents < minCents) throw new BadRequestException(`Minimum payout ${method} : ${minCents / 100}€`);
    if (amountCents > aff.pendingCents) throw new BadRequestException(`Solde insuffisant : ${aff.pendingCents / 100}€ disponible`);
    if (!destination || destination.length < 3) throw new BadRequestException('Destination invalide');

    const payout = await this.prisma.affiliatePayout.create({
      data: { affiliateId: aff.id, amountCents, method, destination },
    });

    if (amountCents >= 50000) {
      this.alerts.sendCriticalAlert('High Payout Request',
        `Affiliate \`${aff.code}\` requested **${amountCents / 100}€** payout via ${method}`).catch(() => {});
    }

    return { payoutId: payout.id, status: 'requested' };
  }

  async getPayouts(customerId: string, limit = 50) {
    const aff = await this.requireAffiliate(customerId);
    return this.prisma.affiliatePayout.findMany({
      where: { affiliateId: aff.id },
      orderBy: { requestedAt: 'desc' }, take: limit,
    });
  }

  async getMinPayouts() {
    return this.minPayout;
  }

  // ── Click tracking (public) ──
  async trackClick(code: string, ip: string, ua: string, landingPath: string, referer?: string) {
    const aff = await this.prisma.affiliate.findUnique({ where: { code: code.toUpperCase() } });
    if (!aff || aff.status !== 'active') return;

    const salt = process.env.AFFILIATE_HASH_SALT || 'aff-salt-2026';
    const dayStr = new Date().toISOString().split('T')[0];
    const visitorHash = crypto.createHash('sha256').update(`${ip}:${ua}:${salt}:${dayStr}`).digest('hex').slice(0, 16);

    const existing = await this.prisma.referralClick.findFirst({
      where: { affiliateId: aff.id, visitorHash, ts: { gte: new Date(dayStr + 'T00:00:00Z') } },
    });
    if (existing) return;

    await this.prisma.referralClick.create({
      data: { affiliateId: aff.id, visitorHash, landingPath: landingPath || '/', referer: referer?.slice(0, 500) },
    });
    await this.prisma.affiliate.update({ where: { id: aff.id }, data: { clickCount: { increment: 1 } } });
  }

  // ── Conversion creation (called from payment webhook) ──
  // renewalIndex 0 = first purchase (full commission rate)
  // renewalIndex 1-3 = renewals (50% of commission rate)
  // renewalIndex >=4 = no commission
  async createConversion(customerId: string, orderId: string, amountCents: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer?.referredByAffiliateId) return;

    const aff = await this.prisma.affiliate.findUnique({ where: { id: customer.referredByAffiliateId } });
    if (!aff || aff.status !== 'active') return;

    if (aff.customerId === customerId) return;

    const existingCount = await this.prisma.referralConversion.count({
      where: { affiliateId: aff.id, referredCustomerId: customerId },
    });

    if (existingCount > MAX_RENEWAL_INDEX) return;

    const renewalIndex = existingCount;
    let effectiveRate = aff.commissionRate;
    if (renewalIndex > 0) {
      effectiveRate = aff.commissionRate * RENEWAL_RATE_MULTIPLIER;
    }

    const commissionCents = Math.round(amountCents * effectiveRate);
    const fraudFlags = await this.checkFraud(aff, customerId);

    const status = fraudFlags.sameHwid ? 'rejected' : 'pending';

    await this.prisma.referralConversion.create({
      data: {
        affiliateId: aff.id, referredCustomerId: customerId, orderId,
        renewalIndex,
        amountCents, commissionCents, commissionRate: effectiveRate,
        status, fraudFlags, rejectedAt: status === 'rejected' ? new Date() : undefined,
        rejectionReason: status === 'rejected' ? 'Self-referral detected (same HWID)' : undefined,
      },
    });

    await this.prisma.affiliate.update({
      where: { id: aff.id }, data: { conversionCount: { increment: 1 } },
    });

    if (status === 'pending') {
      const label = renewalIndex === 0 ? 'first purchase' : `renewal #${renewalIndex}`;
      this.alerts.sendAdminNotification('New Affiliate Conversion',
        `Affiliate **${aff.code}** — ${label} — **${commissionCents / 100}€** commission (${(effectiveRate * 100).toFixed(0)}%) on **${amountCents / 100}€** sale`,
        [{ name: 'Fraud Flags', value: JSON.stringify(fraudFlags), inline: false }],
      ).catch(() => {});
    }
  }

  // ── Auto-approve cron ──
  async autoApproveConversions() {
    const affiliates = await this.prisma.affiliate.findMany({ where: { status: 'active' } });
    let approved = 0;

    for (const aff of affiliates) {
      const tierCfg = this.tierConfig[aff.tier] || this.tierConfig.bronze;
      const cutoff = new Date(Date.now() - tierCfg.approvalDays * 86400_000);

      const pending = await this.prisma.referralConversion.findMany({
        where: { affiliateId: aff.id, status: 'pending', createdAt: { lt: cutoff } },
      });

      for (const conv of pending) {
        await this.prisma.referralConversion.update({
          where: { id: conv.id },
          data: { status: 'approved', approvedAt: new Date() },
        });
        await this.prisma.affiliate.update({
          where: { id: aff.id },
          data: {
            pendingCents: { increment: conv.commissionCents },
            totalEarnedCents: { increment: conv.commissionCents },
          },
        });
        approved++;
      }
    }

    if (approved > 0) this.logger.log(`Auto-approved ${approved} affiliate conversions`);
    return approved;
  }

  // ── Tier recalc cron ──
  // Revenue-based tiers with 60-day grace period before downgrade
  async recalcTiers() {
    const affiliates = await this.prisma.affiliate.findMany({ where: { status: 'active' } });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
    let upgraded = 0;
    let downgraded = 0;

    for (const aff of affiliates) {
      const revenue30d = await this.prisma.referralConversion.aggregate({
        where: { affiliateId: aff.id, createdAt: { gte: thirtyDaysAgo }, status: { in: ['approved', 'pending'] } },
        _sum: { amountCents: true },
      });
      const rev = revenue30d._sum.amountCents || 0;

      let deservedTier = 'bronze';
      if (rev >= this.tierConfig.diamond.minRevenueCents) deservedTier = 'diamond';
      else if (rev >= this.tierConfig.gold.minRevenueCents) deservedTier = 'gold';
      else if (rev >= this.tierConfig.silver.minRevenueCents) deservedTier = 'silver';

      const tierOrder = ['bronze', 'silver', 'gold', 'diamond'];
      const currentIdx = tierOrder.indexOf(aff.tier);
      const deservedIdx = tierOrder.indexOf(deservedTier);

      if (deservedIdx > currentIdx) {
        // Upgrade immediately
        const newRate = this.tierConfig[deservedTier].rate;
        await this.prisma.affiliate.update({
          where: { id: aff.id },
          data: { tier: deservedTier, commissionRate: newRate, belowThresholdSince: null },
        });
        upgraded++;
      } else if (deservedIdx < currentIdx) {
        // Downgrade only after 60-day grace period
        if (!aff.belowThresholdSince) {
          await this.prisma.affiliate.update({
            where: { id: aff.id },
            data: { belowThresholdSince: new Date() },
          });
        } else {
          const daysBelowThreshold = (Date.now() - aff.belowThresholdSince.getTime()) / 86400_000;
          if (daysBelowThreshold >= GRACE_PERIOD_DAYS) {
            const newRate = this.tierConfig[deservedTier].rate;
            await this.prisma.affiliate.update({
              where: { id: aff.id },
              data: { tier: deservedTier, commissionRate: newRate, belowThresholdSince: null },
            });
            downgraded++;
          }
        }
      } else {
        // At correct tier — clear grace timer if it was set
        if (aff.belowThresholdSince) {
          await this.prisma.affiliate.update({
            where: { id: aff.id },
            data: { belowThresholdSince: null },
          });
        }
      }
    }

    if (upgraded > 0) this.logger.log(`Upgraded ${upgraded} affiliates`);
    if (downgraded > 0) this.logger.log(`Downgraded ${downgraded} affiliates after grace period`);
  }

  // ── Refund handling ──
  async handleRefund(customerId: string) {
    const convs = await this.prisma.referralConversion.findMany({
      where: { referredCustomerId: customerId, status: { not: 'refunded' } },
    });
    if (convs.length === 0) return;

    for (const conv of convs) {
      const wasApproved = conv.status === 'approved';
      await this.prisma.referralConversion.update({
        where: { id: conv.id },
        data: { status: 'refunded', refundedAt: new Date() },
      });

      if (wasApproved) {
        await this.prisma.affiliate.update({
          where: { id: conv.affiliateId },
          data: { pendingCents: { decrement: conv.commissionCents } },
        });
      }

      this.alerts.sendAdminNotification('Affiliate Commission Refunded',
        `Conversion \`${conv.id.slice(0, 8)}\` refunded — commission **${conv.commissionCents / 100}€** clawed back`).catch(() => {});
    }
  }

  // ── Admin ──
  async adminList(filters: { tier?: string; status?: string; sortBy?: string }) {
    const where: any = {};
    if (filters.tier && filters.tier !== 'all') where.tier = filters.tier;
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    const orderBy = filters.sortBy === 'conversions' ? { conversionCount: 'desc' as const }
      : filters.sortBy === 'clicks' ? { clickCount: 'desc' as const }
      : { totalEarnedCents: 'desc' as const };

    return this.prisma.affiliate.findMany({
      where, orderBy, take: 200,
      include: { customer: { select: { email: true, username: true } } },
    });
  }

  async adminSuspend(id: string, reason: string) {
    await this.prisma.affiliate.update({ where: { id }, data: { status: 'suspended' } });
    this.alerts.sendAdminNotification('Affiliate Suspended', `Affiliate \`${id.slice(0, 8)}\` suspended: ${reason}`).catch(() => {});
  }

  async adminUnsuspend(id: string) {
    await this.prisma.affiliate.update({ where: { id }, data: { status: 'active' } });
  }

  async adminSetTier(id: string, tier: string, commissionRate?: number) {
    if (!this.tierConfig[tier]) throw new BadRequestException('Tier invalide');
    const rate = commissionRate ?? this.tierConfig[tier].rate;
    await this.prisma.affiliate.update({ where: { id }, data: { tier, commissionRate: rate, belowThresholdSince: null } });
  }

  async adminApproveConversion(id: string) {
    const conv = await this.prisma.referralConversion.findUnique({ where: { id } });
    if (!conv || conv.status !== 'pending') throw new BadRequestException('Conversion non pending');
    await this.prisma.referralConversion.update({
      where: { id }, data: { status: 'approved', approvedAt: new Date() },
    });
    await this.prisma.affiliate.update({
      where: { id: conv.affiliateId },
      data: { pendingCents: { increment: conv.commissionCents }, totalEarnedCents: { increment: conv.commissionCents } },
    });
  }

  async adminRejectConversion(id: string, reason: string) {
    const conv = await this.prisma.referralConversion.findUnique({ where: { id } });
    if (!conv || conv.status !== 'pending') throw new BadRequestException('Conversion non pending');
    await this.prisma.referralConversion.update({
      where: { id }, data: { status: 'rejected', rejectedAt: new Date(), rejectionReason: reason },
    });
  }

  async adminListConversions(status?: string) {
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    return this.prisma.referralConversion.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 200,
      include: { affiliate: { select: { code: true, tier: true } } },
    });
  }

  async adminListPayouts(status?: string) {
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    return this.prisma.affiliatePayout.findMany({
      where, orderBy: { requestedAt: 'desc' }, take: 200,
      include: { affiliate: { select: { code: true, customerId: true } } },
    });
  }

  async adminApprovePayout(id: string) {
    await this.prisma.affiliatePayout.update({ where: { id }, data: { status: 'approved', approvedAt: new Date() } });
  }

  async adminMarkPaid(id: string, txHash: string) {
    const payout = await this.prisma.affiliatePayout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    await this.prisma.affiliatePayout.update({
      where: { id }, data: { status: 'paid', paidAt: new Date(), txHash },
    });
    await this.prisma.affiliate.update({
      where: { id: payout.affiliateId },
      data: { pendingCents: { decrement: payout.amountCents }, totalPaidCents: { increment: payout.amountCents } },
    });
  }

  async adminRejectPayout(id: string, reason: string) {
    await this.prisma.affiliatePayout.update({
      where: { id }, data: { status: 'failed', failureReason: reason },
    });
  }

  async adminDeleteAffiliate(id: string) {
    await this.prisma.affiliatePayout.deleteMany({ where: { affiliateId: id } });
    await this.prisma.referralConversion.deleteMany({ where: { affiliateId: id } });
    await this.prisma.referralClick.deleteMany({ where: { affiliateId: id } });
    await this.prisma.affiliate.delete({ where: { id } });
  }

  async adminDeleteConversion(id: string) {
    await this.prisma.referralConversion.delete({ where: { id } });
  }

  async adminDeletePayout(id: string) {
    await this.prisma.affiliatePayout.delete({ where: { id } });
  }

  // ── Helpers ──
  private async requireAffiliate(customerId: string) {
    const aff = await this.prisma.affiliate.findUnique({ where: { customerId } });
    if (!aff) throw new NotFoundException('Vous n\'êtes pas affilié');
    return aff;
  }

  private async generateUniqueCode(username: string): Promise<string> {
    const base = username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `${base}${suffix}`.slice(0, 15);
    const existing = await this.prisma.affiliate.findUnique({ where: { code } });
    if (existing) return this.generateUniqueCode(username);
    return code;
  }

  private getNextTier(current: string): string | null {
    const order = ['bronze', 'silver', 'gold', 'diamond'];
    const idx = order.indexOf(current);
    return idx < order.length - 1 ? order[idx + 1] : null;
  }

  private async checkFraud(aff: any, customerId: string): Promise<any> {
    const affCustomer = await this.prisma.customer.findUnique({ where: { id: aff.customerId } });
    const referred = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!affCustomer || !referred) return {};

    const affLicenses = await this.prisma.license.findMany({
      where: { email: affCustomer.email }, select: { hwid: true, lastIp: true },
    });
    const refLicenses = await this.prisma.license.findMany({
      where: { email: referred.email }, select: { hwid: true, lastIp: true },
    });

    const affHwids = new Set(affLicenses.map(l => l.hwid).filter(Boolean));
    const refHwids = new Set(refLicenses.map(l => l.hwid).filter(Boolean));
    const sameHwid = [...refHwids].some(h => affHwids.has(h));

    const affIps = new Set(affLicenses.map(l => l.lastIp).filter(Boolean));
    const refIps = new Set(refLicenses.map(l => l.lastIp).filter(Boolean));
    const sameIp = [...refIps].some(ip => affIps.has(ip));

    const sameEmailDomain = affCustomer.email.split('@')[1] === referred.email.split('@')[1];

    const recentBurst = await this.prisma.referralConversion.count({
      where: { affiliateId: aff.id, createdAt: { gte: new Date(Date.now() - 3600_000) } },
    });

    return { sameHwid, sameIp, sameEmailDomain, affiliateRecentConvBurst: recentBurst > 5 };
  }
}
