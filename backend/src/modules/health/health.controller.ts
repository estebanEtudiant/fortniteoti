import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma:  PrismaService,
    private readonly redis:   RedisService,
    private readonly config:  ConfigService,
  ) {}

  /** GET /api/v1/health — check rapide (DB only) */
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'error', database: 'disconnected', timestamp: new Date().toISOString() };
    }
  }

  /**
   * GET /api/v1/health/detailed — statut complet pour le bot Discord.
   * Route publique : ne retourne aucune donnée sensible.
   */
  @Get('detailed')
  async detailed() {
    const result: Record<string, { status: string; latencyMs?: number }> = {};

    // ── Base de données (PostgreSQL) ────────────────────────────────
    try {
      const t0 = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      result.database = { status: 'ok', latencyMs: Date.now() - t0 };
    } catch {
      result.database = { status: 'error' };
    }

    // ── Cache (Redis) ────────────────────────────────────────────────
    try {
      const t0 = Date.now();
      await this.redis.get('__health_ping__');
      result.redis = { status: 'ok', latencyMs: Date.now() - t0 };
    } catch {
      result.redis = { status: 'error' };
    }

    // ── Stripe ───────────────────────────────────────────────────────
    const stripeKey = this.config.get<string>('stripe.secretKey', '');
    result.stripe = {
      status: stripeKey.startsWith('sk_') ? 'configured' : 'not_configured',
    };

    return { timestamp: new Date().toISOString(), services: result };
  }
}
