import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService }  from '../../database/redis.service';
import { LicenseStatus, LicensePlan, OrderStatus } from '@prisma/client';
import { LicenseService } from '../license/license.service';

@Injectable()
export class BotService {
  private readonly SETTINGS_KEY = 'admin:settings';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis:  RedisService,
    private readonly licenseService: LicenseService,
  ) {}

  /**
   * Vérifie la validité d'une licence et l'associe à un Discord ID.
   * Le champ Prisma est `licenseKey` (colonne license_key).
   */
  async verifyLicense(key: string, discordId: string) {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey: key },
    });

    if (!license) {
      return { valid: false, reason: 'Clé de licence introuvable.' };
    }
    if (license.status === LicenseStatus.BANNED || license.status === LicenseStatus.SUSPENDED) {
      return { valid: false, reason: 'Cette licence est suspendue ou bannie.' };
    }
    if (license.expiresAt && license.expiresAt < new Date()) {
      return { valid: false, reason: 'Cette licence a expiré.' };
    }

    // Associe le Discord ID à la licence
    await this.prisma.license.update({
      where: { licenseKey: key },
      data:  { discordId },
    });

    // Tente de retrouver le nom du customer via Order
    const order = await this.prisma.order.findFirst({
      where:   { licenseId: license.id },
      include: { customer: { select: { displayName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const customerName = order?.customer?.displayName ?? order?.customer?.username ?? null;

    return {
      valid:        true,
      plan:         license.plan,
      expiresAt:    license.expiresAt?.toISOString() ?? null,
      customerName,
    };
  }

  /**
   * Retourne le statut temps réel de la licence liée au Discord ID.
   */
  async getLicenseStatus(discordId: string) {
    const license = await this.prisma.license.findFirst({
      where:   { discordId },
      orderBy: { createdAt: 'desc' },
    });

    if (!license) return { valid: false };
    if (license.status === LicenseStatus.BANNED || license.status === LicenseStatus.SUSPENDED) {
      return { valid: false };
    }
    if (license.expiresAt && license.expiresAt < new Date()) {
      return { valid: false };
    }

    return {
      valid:      true,
      plan:       license.plan,
      expiresAt:  license.expiresAt?.toISOString() ?? null,
      licenseKey: license.licenseKey,
    };
  }

  /**
   * Génère count clés de licence pour le plan donné.
   */
  async generateKeys(plan: string, count: number) {
    const licensePlan = LicensePlan[plan as keyof typeof LicensePlan];
    if (!licensePlan) {
      return { success: false, reason: `Plan inconnu : ${plan}` };
    }

    const keys: string[] = [];
    for (let i = 0; i < count; i++) {
      const license = await this.licenseService.create({ plan: licensePlan });
      keys.push(license.licenseKey);
    }

    return { success: true, keys };
  }

  /** KPIs pour /dashboard Discord. */
  async getDashboard() {
    const now         = new Date();
    const startOfDay  = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [salesToday, salesMonth, revDay, revMonth] = await Promise.all([
      this.prisma.order.count({ where: { status: OrderStatus.COMPLETED, completedAt: { gte: startOfDay } } }),
      this.prisma.order.count({ where: { status: OrderStatus.COMPLETED, completedAt: { gte: startOfMonth } } }),
      this.prisma.order.aggregate({ where: { status: OrderStatus.COMPLETED, completedAt: { gte: startOfDay } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: OrderStatus.COMPLETED, completedAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    ]);

    return {
      salesToday,
      salesMonth,
      revenueToday:  revDay._sum.amount  ?? 0,
      revenueMonth:  revMonth._sum.amount ?? 0,
    };
  }

  private readonly REVIEWS_KEY = 'reviews:list';

  /** Enregistre ou met à jour un avis client (un seul par discordId). */
  async submitReview(review: {
    discordId: string;
    username: string;
    description: string;
    text: string;
    stars: number;
  }) {
    const raw  = await this.redis.get(this.REVIEWS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];

    // Remplacer si déjà un avis de ce discordId
    const filtered = list.filter((r) => r.discordId !== review.discordId);
    filtered.unshift({ ...review, createdAt: new Date().toISOString() });

    await this.redis.set(this.REVIEWS_KEY, JSON.stringify(filtered.slice(0, 50)));
    return { success: true };
  }

  /** Retourne la liste des avis (triés du plus récent au plus ancien). */
  async getReviews() {
    const raw = await this.redis.get(this.REVIEWS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as any[];
    } catch {
      return [];
    }
  }

  /** Active ou désactive le mode maintenance (clé Redis admin:settings). */
  async setMaintenance(enabled: boolean, raison: string | null) {
    const raw      = await this.redis.get(this.SETTINGS_KEY);
    const settings = raw ? JSON.parse(raw) : {};
    const updated  = { ...settings, maintenanceMode: enabled };
    if (raison) updated.maintenanceAnnouncement = raison;
    await this.redis.set(this.SETTINGS_KEY, JSON.stringify(updated));
    return { success: true, enabled };
  }
}
