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
      this.prisma.order.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: prevThirtyStart, lt: thirtyDaysAgo } }, _sum: { amount: true } }),
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
        where: { status: 'COMPLETED', createdAt: { lte: end } },
        _sum: { amount: true },
      });
      const last30 = await this.prisma.order.aggregate({
        where: {
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
}
