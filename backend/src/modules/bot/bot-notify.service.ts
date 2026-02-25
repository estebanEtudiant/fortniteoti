import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { OrderStatus } from '@prisma/client';

/**
 * Service qui notifie le bot Discord lors d'événements business.
 * Le bot expose un serveur HTTP interne (BOT_WEBHOOK_URL) pour recevoir ces notifications.
 */
@Injectable()
export class BotNotifyService {
  private readonly logger = new Logger(BotNotifyService.name);
  private readonly webhookUrl: string;
  private readonly secret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.webhookUrl = config.get<string>('BOT_WEBHOOK_URL', 'http://127.0.0.1:3001');
    this.secret     = config.get<string>('BOT_API_SECRET', '');
  }

  /**
   * Notifie le bot d'une nouvelle vente confirmée.
   */
  async notifySale(plan: string, amountCents: number): Promise<void> {
    if (!this.secret) return;

    // Compte les ventes du jour pour l'affichage
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const totalToday = await this.prisma.order.count({
      where: { status: OrderStatus.COMPLETED, completedAt: { gte: startOfDay } },
    }).catch(() => 0);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);

      await fetch(`${this.webhookUrl}/webhook/sale`, {
        method:  'POST',
        headers: { 'x-bot-secret': this.secret, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan, amount: amountCents, totalToday }),
        signal:  controller.signal,
      }).finally(() => clearTimeout(timer));
    } catch (err) {
      // Non bloquant : le bot peut être offline
      this.logger.warn(`BotNotify.notifySale failed: ${(err as Error).message}`);
    }
  }
}
