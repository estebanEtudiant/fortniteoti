import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { AlertsService } from '../alerts/alerts.service';
import { KillService } from '../kill-switch/kill.service';

@Injectable()
export class MetricsCronService {
  private readonly logger = new Logger(MetricsCronService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private alerts: AlertsService,
    private killService: KillService,
  ) {}

  // Every 5 min: check 5xx error rate
  @Cron('*/5 * * * *')
  async checkErrorRate() {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000);
    const [total, errors] = await Promise.all([
      this.prisma.requestLog.count({ where: { ts: { gte: fiveMinAgo } } }),
      this.prisma.requestLog.count({ where: { status: { gte: 500 }, ts: { gte: fiveMinAgo } } }),
    ]);

    if (total >= 10 && (errors / total) > 0.05) {
      const rate = ((errors / total) * 100).toFixed(1);
      this.alerts.sendCriticalAlert(
        'API Error Spike',
        `**${rate}%** 5xx error rate in the last 5 min (${errors}/${total} requests)`,
      ).catch(() => {});
      this.logger.warn(`Error spike: ${rate}% (${errors}/${total})`);
    }
  }

  // Every 15 min: cleanup expired kills
  @Cron('*/15 * * * *')
  async cleanupExpiredKills() {
    await this.killService.cleanupExpired();
  }

  // Daily 09:00: cleanup old request logs (> 30 days)
  @Cron('0 9 * * *')
  async cleanupOldLogs() {
    const cutoff = new Date(Date.now() - 30 * 86400_000);
    const deleted = await this.prisma.requestLog.deleteMany({ where: { ts: { lt: cutoff } } });
    if (deleted.count > 0) {
      this.logger.log(`Cleaned up ${deleted.count} old request logs`);
    }

    const telemetryCutoff = new Date(Date.now() - 90 * 86400_000);
    const deletedTelemetry = await this.prisma.telemetryEvent.deleteMany({ where: { ts: { lt: telemetryCutoff } } });
    if (deletedTelemetry.count > 0) {
      this.logger.log(`Cleaned up ${deletedTelemetry.count} old telemetry events`);
    }
  }
}
