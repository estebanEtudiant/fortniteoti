import { BadRequestException, Injectable } from '@nestjs/common';
import { LicensePlan, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export const SPOOFER_PLANS: Record<string, LicensePlan> = {
  '1d': LicensePlan.DAYS_1,
  '1w': LicensePlan.DAYS_7,
  '14d': LicensePlan.DAYS_14,
  '1m': LicensePlan.DAYS_30,
};

@Injectable()
export class SpooferService {
  constructor(private prisma: PrismaService) {}

  async plans() {
    const plans = await this.prisma.spooferPlan.findMany();
    return Promise.all(Object.entries(SPOOFER_PLANS).map(async ([slug, plan]) => {
      const config = plans.find((entry) => entry.plan === plan);
      const [available, reserved, sold] = await Promise.all([
        this.prisma.spooferKey.count({ where: { plan, orderId: null, licenseId: null } }),
        this.prisma.spooferKey.count({ where: { plan, orderId: { not: null }, licenseId: null } }),
        this.prisma.spooferKey.count({ where: { plan, licenseId: { not: null } } }),
      ]);
      return { slug, plan, price: config?.price ?? 0, enabled: config?.enabled ?? false, available, reserved, sold };
    }));
  }

  async publicPlans() {
    return (await this.plans()).filter((entry) => entry.enabled && entry.price > 0).map((entry) => {
      const days = Number(entry.plan.slice(5));
      return {
        id: entry.slug, name: { fr: `${days} jour${days > 1 ? 's' : ''}`, en: `${days} day${days > 1 ? 's' : ''}` },
        price: entry.price / 100, currency: 'EUR', stock: entry.available + entry.reserved,
        per: { fr: 'Paiement unique', en: 'One-time payment' }, perks: { fr: [], en: [] }, featured: false,
      };
    });
  }

  async updatePlan(slug: string, price: number, enabled: boolean) {
    const plan = SPOOFER_PLANS[slug];
    if (!plan || !Number.isSafeInteger(price) || price < 0 || price > 1000000 || typeof enabled !== 'boolean' || (enabled && price === 0)) {
      throw new BadRequestException('Prix en centimes EUR et durée valides requis');
    }
    return this.prisma.spooferPlan.upsert({ where: { plan }, create: { plan, price, enabled }, update: { price, enabled } });
  }

  async importKeys(slug: string, input: string) {
    const plan = SPOOFER_PLANS[slug];
    if (!plan || typeof input !== 'string' || input.length > 50000) throw new BadRequestException('Import invalide');
    const keys = [...new Set(input.split(/\s+/).map((key) => key.trim().toUpperCase()).filter(Boolean))];
    if (!keys.length || keys.length > 1000 || keys.some((key) => !/^404-[A-Z0-9]{12,25}$/.test(key))) {
      throw new BadRequestException('Une clé fournisseur 404-… par ligne (12 à 25 caractères après le préfixe, 1 à 1000 clés)');
    }
    const result = await this.prisma.spooferKey.createMany({ data: keys.map((key) => ({ key, plan })), skipDuplicates: true });
    return { imported: result.count, duplicates: keys.length - result.count };
  }

  async listKeys(filters: { plan?: string; status?: string; search?: string; page?: string }) {
    const page = Number(filters.page || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new BadRequestException('Page invalide');
    if (filters.plan && !SPOOFER_PLANS[filters.plan]) throw new BadRequestException('Durée invalide');
    if (filters.status && !['available', 'reserved', 'delivered'].includes(filters.status)) throw new BadRequestException('Statut invalide');
    const search = String(filters.search || '').trim().slice(0, 120);
    const where: Prisma.SpooferKeyWhereInput = {
      ...(filters.plan ? { plan: SPOOFER_PLANS[filters.plan] } : {}),
      ...(filters.status === 'available' ? { orderId: null, licenseId: null } : {}),
      ...(filters.status === 'reserved' ? { orderId: { not: null }, licenseId: null } : {}),
      ...(filters.status === 'delivered' ? { licenseId: { not: null } } : {}),
      ...(search ? { OR: [
        { key: { contains: search, mode: 'insensitive' as const } },
        { order: { customer: { email: { contains: search, mode: 'insensitive' as const } } } },
        { order: { customer: { username: { contains: search, mode: 'insensitive' as const } } } },
        ...(/^[0-9a-f-]{36}$/i.test(search) ? [{ orderId: search }] : []),
      ] } : {}),
    };
    const limit = 50;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.spooferKey.findMany({ where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          order: { select: { id: true, status: true, createdAt: true, completedAt: true, amount: true, currency: true,
            customer: { select: { id: true, username: true, email: true, displayName: true } },
          } },
          license: { select: { id: true, status: true } },
        },
      }),
      this.prisma.spooferKey.count({ where }),
    ]);
    return {
      data: rows.map((row) => ({ ...row, status: row.licenseId ? 'delivered' : row.orderId ? 'reserved' : 'available' })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async reserve(tx: Prisma.TransactionClient, orderId: string, items: any[]) {
    for (const item of items.filter((entry) => entry.game === 'spoofer')) {
      const plan = SPOOFER_PLANS[item.plan];
      if (!plan) throw new BadRequestException('Durée spoofer non disponible');
      const keys = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM spoofer_keys WHERE plan = ${plan}::"LicensePlan"
        AND order_id IS NULL AND license_id IS NULL
        ORDER BY created_at, id LIMIT ${item.qty} FOR UPDATE SKIP LOCKED`;
      if (keys.length !== item.qty) throw new BadRequestException(`Stock insuffisant pour Temp Spoofer (${item.plan})`);
      await tx.spooferKey.updateMany({ where: { id: { in: keys.map((key) => key.id) } }, data: { orderId } });
    }
  }

  async release(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.status !== 'PENDING') return;
      await tx.spooferKey.updateMany({ where: { orderId, licenseId: null }, data: { orderId: null } });
      await tx.order.update({ where: { id: orderId }, data: { status: 'FAILED' } });
    });
  }

  async deliver(tx: Prisma.TransactionClient, orderId: string, item: any, email: string) {
    const plan = SPOOFER_PLANS[item.plan];
    if (!plan) throw new BadRequestException('Durée spoofer non disponible');
    let key = await tx.spooferKey.findFirst({ where: { orderId, plan, licenseId: null }, orderBy: { createdAt: 'asc' } });
    if (!key) {
      await this.reserve(tx, orderId, [{ ...item, qty: 1 }]);
      key = await tx.spooferKey.findFirstOrThrow({ where: { orderId, plan, licenseId: null } });
    }
    const license = await tx.license.create({ data: {
      licenseKey: key.key, plan, product: 'SHOP_SPOOFER', email, expiresAt: null,
      metadata: { shopGame: 'spoofer', shopGameName: item.gameName, shopPlan: item.plan, orderId, externalActivation: true },
    } });
    await tx.spooferKey.update({ where: { id: key.id }, data: { licenseId: license.id, soldAt: new Date() } });
    return license;
  }
}
