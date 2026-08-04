import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { AlertsService } from '../alerts/alerts.service';

const VALID_SCOPES = ['all', 'hwid', 'user', 'version'] as const;
type KillScope = (typeof VALID_SCOPES)[number];

interface ActiveKill {
  id: string;
  scope: string;
  target: string | null;
  reason: string;
  expiresAt: string | null;
}

@Injectable()
export class KillService {
  private readonly logger = new Logger(KillService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private alerts: AlertsService,
  ) {}

  async activate(
    productId: string,
    scope: KillScope,
    reason: string,
    activatedBy: string,
    target?: string,
    ttlHours?: number,
  ) {
    if (scope !== 'all' && !target) {
      throw new Error('target is required when scope is not "all"');
    }

    const expiresAt = ttlHours ? new Date(Date.now() + ttlHours * 3600_000) : null;

    const kill = await this.prisma.kill.create({
      data: { productId, scope, target: scope === 'all' ? null : target, reason, activatedBy, expiresAt },
    });

    await this.refreshCache(productId);

    const estimated = await this.estimateAffected(productId, scope, target);

    this.alerts.sendAdminNotification('Kill Switch Activated', `**${productId}** — scope: \`${scope}\``, [
      { name: 'Reason', value: reason, inline: true },
      { name: 'Target', value: target || 'all', inline: true },
      { name: 'Activated By', value: activatedBy, inline: true },
      { name: 'Estimated Sessions', value: String(estimated), inline: true },
      { name: 'Expires', value: expiresAt ? expiresAt.toISOString() : 'Never', inline: true },
    ]).catch(() => {});

    this.logger.warn(`Kill switch activated: ${kill.id} [${productId}/${scope}/${target || '*'}]`);
    return { killId: kill.id, activated_at: kill.activatedAt, killed_sessions_estimated: estimated };
  }

  async revoke(killId: string, revokedBy: string, reason: string) {
    const kill = await this.prisma.kill.update({
      where: { id: killId },
      data: { revokedAt: new Date(), revokedBy },
    });

    await this.refreshCache(kill.productId);

    this.alerts.sendAdminNotification('Kill Switch Revoked', `Kill \`${killId}\` on **${kill.productId}**`, [
      { name: 'Original Reason', value: kill.reason, inline: true },
      { name: 'Revoke Reason', value: reason, inline: true },
      { name: 'Revoked By', value: revokedBy, inline: true },
    ]).catch(() => {});

    this.logger.log(`Kill switch revoked: ${killId}`);
    return { revoked_at: kill.revokedAt };
  }

  async list(productId: string, active?: boolean, limit = 50) {
    const where: any = { productId };
    if (active === true) {
      where.revokedAt = null;
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
    } else if (active === false) {
      where.OR = [{ revokedAt: { not: null } }, { expiresAt: { lt: new Date() } }];
    }
    return this.prisma.kill.findMany({ where, orderBy: { activatedAt: 'desc' }, take: limit });
  }

  async isKilled(productId: string, hwid?: string, userId?: string): Promise<ActiveKill | null> {
    const cacheKey = `kill:active:${productId}`;
    let kills: ActiveKill[];

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      kills = JSON.parse(cached);
    } else {
      kills = await this.loadActiveKills(productId);
      await this.redis.set(cacheKey, JSON.stringify(kills), 30);
    }

    for (const k of kills) {
      if (k.expiresAt && new Date(k.expiresAt) < new Date()) continue;
      if (k.scope === 'all') return k;
      if (k.scope === 'hwid' && hwid && k.target === hwid) return k;
      if (k.scope === 'user' && userId && k.target === userId) return k;
    }
    return null;
  }

  async refreshCache(productId: string): Promise<void> {
    const kills = await this.loadActiveKills(productId);
    await this.redis.set(`kill:active:${productId}`, JSON.stringify(kills), 30);
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.kill.updateMany({
      where: {
        revokedAt: null,
        expiresAt: { lt: new Date(), not: null },
      },
      data: { revokedAt: new Date(), revokedBy: 'system:auto-expire' },
    });
    if (result.count > 0) {
      this.logger.log(`Auto-revoked ${result.count} expired kills`);
      const products = await this.prisma.kill.findMany({
        where: { revokedBy: 'system:auto-expire' },
        select: { productId: true },
        distinct: ['productId'],
      });
      for (const p of products) await this.refreshCache(p.productId);
    }
    return result.count;
  }

  private async loadActiveKills(productId: string): Promise<ActiveKill[]> {
    const rows = await this.prisma.kill.findMany({
      where: {
        productId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true, scope: true, target: true, reason: true, expiresAt: true },
    });
    return rows.map(r => ({
      id: r.id,
      scope: r.scope,
      target: r.target,
      reason: r.reason,
      expiresAt: r.expiresAt?.toISOString() || null,
    }));
  }

  private async estimateAffected(productId: string, scope: string, target?: string): Promise<number> {
    if (scope === 'all') {
      return this.prisma.license.count({ where: { product: productId.toUpperCase(), status: 'ACTIVE' } });
    }
    if (scope === 'hwid' && target) {
      return this.prisma.license.count({ where: { hwid: target, status: 'ACTIVE' } });
    }
    return 0;
  }
}
