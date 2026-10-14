import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';

@Injectable()
export class MetricsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getOverview() {
    const cacheKey = 'metrics:overview';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const h24ago = new Date(now.getTime() - 86400_000);

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);
    const prevThirtyStart = new Date(now.getTime() - 60 * 86400_000);
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = new Date(yesterday); startOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday); endOfYesterday.setHours(23, 59, 59, 999);

    const [dau, dauYesterday, signupsToday, activeKills, totalErrors, totalRequests, activeLicenses, mrr30, mrrPrev30] = await Promise.all([
      this.prisma.telemetryEvent.findMany({
        where: { event: 'load_success', ts: { gte: startOfDay } },
        select: { hwidShort: true },
        distinct: ['hwidShort'],
      }).then(r => r.length),
      this.prisma.telemetryEvent.findMany({
        where: { event: 'load_success', ts: { gte: startOfYesterday, lte: endOfYesterday } },
        select: { hwidShort: true },
        distinct: ['hwidShort'],
      }).then(r => r.length),
      this.prisma.customer.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.kill.count({ where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
      this.prisma.requestLog.count({ where: { status: { gte: 500 }, ts: { gte: h24ago } } }),
      this.prisma.requestLog.count({ where: { ts: { gte: h24ago } } }),
      this.prisma.license.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.aggregate({ where: { currency: 'EUR', status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { currency: 'EUR', status: 'COMPLETED', createdAt: { gte: prevThirtyStart, lt: thirtyDaysAgo } }, _sum: { amount: true } }),
    ]);

    const errorRate24h = totalRequests > 0 ? +(totalErrors / totalRequests * 100).toFixed(2) : 0;
    const mrrCurrent = mrr30._sum.amount || 0;
    const mrrPrevious = mrrPrev30._sum.amount || 0;
    const mrrDelta = mrrPrevious > 0 ? +((mrrCurrent - mrrPrevious) / mrrPrevious * 100).toFixed(1) : 0;
    const dauDelta = dauYesterday > 0 ? dau - dauYesterday : 0;

    const result = { dau, dauDelta, signupsToday, activeKills, errorRate24h, activeLicenses, mrr: mrrCurrent, mrrDelta };
    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async getDau(days: number, productId?: string) {
    const series: { date: string; dau: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      const start = new Date(dayStr + 'T00:00:00Z');
      const end = new Date(dayStr + 'T23:59:59.999Z');

      const where: any = { event: 'load_success', ts: { gte: start, lte: end } };
      if (productId) where.productId = productId;

      const distinct = await this.prisma.telemetryEvent.findMany({
        where,
        select: { hwidShort: true },
        distinct: ['hwidShort'],
      });
      series.push({ date: dayStr, dau: distinct.length });
    }
    return { series };
  }

  async getErrors(hours: number) {
    const since = new Date(Date.now() - hours * 3600_000);
    const rows = await this.prisma.requestLog.groupBy({
      by: ['endpoint', 'status'],
      where: { status: { gte: 400 }, ts: { gte: since } },
      _count: true,
      orderBy: { _count: { endpoint: 'desc' } },
      take: 50,
    });
    return rows.map(r => ({ endpoint: r.endpoint, status: r.status, count: r._count }));
  }

  async getTopUsers(limit: number, days: number) {
    const since = new Date(Date.now() - days * 86400_000);
    const rows = await this.prisma.telemetryEvent.groupBy({
      by: ['userId'],
      where: { event: 'load_success', ts: { gte: since }, userId: { not: null } },
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
      take: limit,
    });

    const result = [];
    for (const r of rows) {
      if (!r.userId) continue;
      const distinctHwids = await this.prisma.telemetryEvent.findMany({
        where: { userId: r.userId, event: 'load_success', ts: { gte: since } },
        select: { hwidShort: true },
        distinct: ['hwidShort'],
      });
      const license = await this.prisma.license.findUnique({
        where: { id: r.userId },
        select: { email: true, lastHeartbeat: true },
      }).catch(() => null);
      result.push({
        userId: r.userId,
        email: license?.email || null,
        fetches: r._count,
        distinctHwids: distinctHwids.length,
        lastActivity: license?.lastHeartbeat || null,
      });
    }
    return result;
  }

  async getMrr(days: number) {
    const series: { date: string; mrr: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      const end = new Date(dayStr + 'T23:59:59.999Z');

      const result = await this.prisma.order.aggregate({
        where: { currency: 'EUR', status: 'COMPLETED', createdAt: { lte: end } },
        _sum: { amount: true },
      });
      const last30 = await this.prisma.order.aggregate({
        where: {
          currency: 'EUR',
          status: 'COMPLETED',
          createdAt: { gte: new Date(end.getTime() - 30 * 86400_000), lte: end },
        },
        _sum: { amount: true },
      });
      series.push({ date: dayStr, mrr: (last30._sum.amount || 0) });
    }
    return { series };
  }

  async getSignupsCancels(days: number) {
    const series: { date: string; signups: number; cancels: number; net: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      const start = new Date(dayStr + 'T00:00:00Z');
      const end = new Date(dayStr + 'T23:59:59.999Z');

      const [signups, cancels] = await Promise.all([
        this.prisma.customer.count({ where: { createdAt: { gte: start, lte: end } } }),
        this.prisma.license.count({ where: { status: 'BANNED', bannedAt: { gte: start, lte: end } } }),
      ]);
      series.push({ date: dayStr, signups, cancels, net: signups - cancels });
    }
    return { series };
  }

  // ── Revenue breakdown per product/site ──
  // Order rows don't carry a productId directly: single-product checkouts (FTN/NG/Velthar/Menoria)
  // are attributed via the License they created (License.product); multi-item cart orders (no
  // licenseId, `items` json set) are the boutique 404 GG (SHOP), broken down further by game.
  // Pokemon lives in its own table entirely.
  async getRevenueByProduct() {
    const cacheKey = 'metrics:revenue-by-product';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const dayMs = 86400_000;
    const since60 = new Date(now.getTime() - 60 * dayMs);
    const since30 = new Date(now.getTime() - 30 * dayMs);

    const [orders, pokemonOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: { currency: 'EUR', status: 'COMPLETED', completedAt: { gte: since60 } },
        select: { amount: true, completedAt: true, licenseId: true, items: true },
      }),
      this.prisma.pokemonOrder.findMany({
        where: {
          status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: since60 },
        },
        select: { amount: true, shippingCents: true, createdAt: true, status: true },
      }),
    ]);

    const licenseIds = [...new Set(orders.map(o => o.licenseId).filter((id): id is string => !!id))];
    const licenses = licenseIds.length
      ? await this.prisma.license.findMany({ where: { id: { in: licenseIds } }, select: { id: true, product: true } })
      : [];
    const licenseProduct = new Map(licenses.map(l => [l.id, l.product]));

    const LABELS: Record<string, string> = {
      FTN_OPTIMIZER: 'FTN Optimizer',
      NG_LOADER: 'NG Loader',
      NG_LAUNCHER: 'NG Launcher',
      VELTHAR_LOADER: 'Velthar',
      MENORIA: 'Menoria',
      SHOP: 'Boutique 404 GG',
      POKEMON: 'Pokémon',
      OTHER: 'Autre',
    };

    type Bucket = { revenue30d: number; revenuePrev30d: number; orders30d: number; trend: Record<string, number> };
    const buckets = new Map<string, Bucket>();
    const byGame = new Map<string, { revenue: number; count: number }>();
    const emptyBucket = (): Bucket => ({ revenue30d: 0, revenuePrev30d: 0, orders30d: 0, trend: {} });

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const addToBucket = (key: string, amount: number, date: Date) => {
      if (!buckets.has(key)) buckets.set(key, emptyBucket());
      const b = buckets.get(key)!;
      if (date >= since30) {
        b.revenue30d += amount;
        b.orders30d += 1;
        const dk = dayKey(date);
        b.trend[dk] = (b.trend[dk] || 0) + amount;
      } else {
        b.revenuePrev30d += amount;
      }
    };

    for (const o of orders) {
      const date = o.completedAt as Date;
      const items = o.items as any[] | null;
      if (Array.isArray(items) && items.length) {
        addToBucket('SHOP', o.amount, date);
        if (date >= since30) {
          for (const it of items) {
            const g = it.gameName || it.game || 'inconnu';
            if (!byGame.has(g)) byGame.set(g, { revenue: 0, count: 0 });
            const gb = byGame.get(g)!;
            gb.revenue += it.unit ? it.unit * (it.qty || 1) : Math.round(o.amount / items.length);
            gb.count += it.qty || 1;
          }
        }
      } else {
        const product = (o.licenseId && licenseProduct.get(o.licenseId)) || 'OTHER';
        addToBucket(product, o.amount, date);
      }
    }

    const pokemonByStatus = new Map<string, number>();
    for (const p of pokemonOrders) {
      const total = p.amount + (p.shippingCents || 0);
      addToBucket('POKEMON', total, p.createdAt);
      pokemonByStatus.set(p.status, (pokemonByStatus.get(p.status) || 0) + 1);
    }

    // Build a continuous 30-day trend array (0-filled) per bucket
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) days.push(dayKey(new Date(now.getTime() - i * dayMs)));

    const products = [...buckets.entries()].map(([key, b]) => ({
      key,
      label: LABELS[key] || key,
      revenue30d: b.revenue30d,
      revenuePrev30d: b.revenuePrev30d,
      deltaPct: b.revenuePrev30d > 0 ? +(((b.revenue30d - b.revenuePrev30d) / b.revenuePrev30d) * 100).toFixed(1) : 0,
      orders30d: b.orders30d,
      trend: days.map(d => ({ date: d, amount: b.trend[d] || 0 })),
    })).sort((a, b) => b.revenue30d - a.revenue30d);

    const result = {
      products,
      byGame: [...byGame.entries()].map(([game, v]) => ({ game, ...v })).sort((a, b) => b.revenue - a.revenue),
      pokemonByStatus: [...pokemonByStatus.entries()].map(([status, count]) => ({ status, count })),
      totalRevenue30d: products.reduce((a, p) => a + p.revenue30d, 0),
      totalRevenuePrev30d: products.reduce((a, p) => a + p.revenuePrev30d, 0),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }
}
