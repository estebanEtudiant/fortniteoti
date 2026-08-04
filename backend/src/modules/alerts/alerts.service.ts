import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private readonly adminWebhook: string;
  private readonly alertsWebhook: string;

  constructor(config: ConfigService) {
    this.adminWebhook = config.get<string>('DISCORD_WEBHOOK_ADMIN_URL', '');
    this.alertsWebhook = config.get<string>('DISCORD_WEBHOOK_ALERTS_URL', '');
  }

  async sendAdminNotification(title: string, description: string, fields?: EmbedField[]): Promise<void> {
    if (!this.adminWebhook) return;
    await this.send(this.adminWebhook, 0x3b82f6, title, description, fields);
  }

  async sendCriticalAlert(title: string, description: string, fields?: EmbedField[]): Promise<void> {
    const url = this.alertsWebhook || this.adminWebhook;
    if (!url) return;
    await this.send(url, 0xef4444, `🚨 ${title}`, description, fields);
  }

  private async send(url: string, color: number, title: string, description: string, fields?: EmbedField[]): Promise<void> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title,
            description,
            color,
            fields: fields || [],
            timestamp: new Date().toISOString(),
          }],
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
    } catch (err) {
      this.logger.warn(`Discord webhook failed: ${(err as Error).message}`);
    }
  }
}
