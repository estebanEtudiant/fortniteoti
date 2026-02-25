import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { LicensePlan, LicenseStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { generateLicenseKey } from '../../common/utils/crypto.utils';
import { Cron, CronExpression } from '@nestjs/schedule';

// ── DTOs ──
export interface CreateLicenseDto {
  plan: LicensePlan;
  customDays?: number;
  email?: string;
  discordId?: string;
  maxActivations?: number;
  metadata?: Record<string, any>;
}

export interface GenerateBatchDto {
  plan: LicensePlan;
  customDays?: number;
  count: number;
  prefix?: string;
}

export interface LicenseFilters {
  status?: LicenseStatus;
  plan?: LicensePlan;
  search?: string;        // Search by key, email, HWID
  page?: number;
  limit?: number;
}

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  constructor(private prisma: PrismaService) {}

  // ── Create single license ──
  async create(dto: CreateLicenseDto): Promise<any> {
    const licenseKey = generateLicenseKey();
    const expiresAt = this.calculateExpiry(dto.plan, dto.customDays);

    const license = await this.prisma.license.create({
      data: {
        licenseKey,
        plan: dto.plan,
        email: dto.email,
        discordId: dto.discordId,
        maxActivations: dto.maxActivations || 1,
        expiresAt,
        metadata: dto.metadata,
      },
    });

    await this.prisma.activationLog.create({
      data: {
        licenseId: license.id,
        action: 'license:created',
        details: { plan: dto.plan, expiresAt: expiresAt?.toISOString() },
      },
    });

    this.logger.log(`License created: ${licenseKey} [${dto.plan}]`);
    return license;
  }

  // ── Generate batch of keys ──
  async generateBatch(dto: GenerateBatchDto): Promise<string[]> {
    const keys: string[] = [];
    const expiresAt = this.calculateExpiry(dto.plan, dto.customDays);

    for (let i = 0; i < dto.count; i++) {
      const licenseKey = generateLicenseKey();
      await this.prisma.license.create({
        data: {
          licenseKey,
          plan: dto.plan,
          expiresAt,
        },
      });
      keys.push(licenseKey);
    }

    this.logger.log(`Batch generated: ${dto.count} keys [${dto.plan}]`);
    return keys;
  }

  // ── List licenses with filters ──
  async findAll(filters: LicenseFilters) {
    const { status, plan, search, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;
    if (search) {
      where.OR = [
        { licenseKey: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { hwid: { startsWith: search } },
      ];
    }

    const [licenses, total] = await Promise.all([
      this.prisma.license.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          licenseKey: true,
          plan: true,
          status: true,
          hwid: true,
          email: true,
          createdAt: true,
          expiresAt: true,
          lastHeartbeat: true,
          activationCount: true,
          lastIp: true,
        },
      }),
      this.prisma.license.count({ where }),
    ]);

    return {
      data: licenses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get single license with details ──
  async findOne(id: string) {
    const license = await this.prisma.license.findUnique({
      where: { id },
      include: {
        activations: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!license) throw new NotFoundException('License not found');
    return license;
  }

  // ── Ban a license ──
  async ban(id: string, reason: string): Promise<any> {
    const license = await this.prisma.license.update({
      where: { id },
      data: {
        status: LicenseStatus.BANNED,
        bannedAt: new Date(),
        banReason: reason,
      },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { licenseId: id },
      data: { revoked: true },
    });

    await this.prisma.activationLog.create({
      data: {
        licenseId: id,
        action: 'license:banned',
        details: { reason },
      },
    });

    this.logger.warn(`License BANNED: ${license.licenseKey} — ${reason}`);
    return license;
  }

  // ── Unban a license ──
  async unban(id: string): Promise<any> {
    const license = await this.prisma.license.update({
      where: { id },
      data: {
        status: LicenseStatus.ACTIVE,
        bannedAt: null,
        banReason: null,
      },
    });

    await this.prisma.activationLog.create({
      data: { licenseId: id, action: 'license:unbanned' },
    });

    return license;
  }

  // ── Reset HWID (allow new machine) ──
  async resetHwid(id: string): Promise<any> {
    const license = await this.prisma.license.update({
      where: { id },
      data: {
        hwid: null,
        hwidBoundAt: null,
      },
    });

    // Revoke refresh tokens (force re-activation)
    await this.prisma.refreshToken.updateMany({
      where: { licenseId: id },
      data: { revoked: true },
    });

    await this.prisma.activationLog.create({
      data: { licenseId: id, action: 'hwid:reset' },
    });

    this.logger.log(`HWID reset for license: ${license.licenseKey}`);
    return license;
  }

  // ── Extend license ──
  async extend(id: string, days: number): Promise<any> {
    const license = await this.prisma.license.findUnique({ where: { id } });
    if (!license) throw new NotFoundException('License not found');

    const baseDate = license.expiresAt && license.expiresAt > new Date()
      ? license.expiresAt
      : new Date();

    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + days);

    const updated = await this.prisma.license.update({
      where: { id },
      data: {
        expiresAt: newExpiry,
        status: LicenseStatus.ACTIVE, // Reactivate if expired
      },
    });

    await this.prisma.activationLog.create({
      data: {
        licenseId: id,
        action: 'license:extended',
        details: { addedDays: days, newExpiry: newExpiry.toISOString() },
      },
    });

    return updated;
  }

  // ── Delete license ──
  async delete(id: string): Promise<void> {
    await this.prisma.license.delete({ where: { id } });
    this.logger.log(`License deleted: ${id}`);
  }

  // ── Dashboard statistics ──
  async getStats() {
    const [total, active, expired, banned, recentActivations, planBreakdown] = await Promise.all([
      this.prisma.license.count(),
      this.prisma.license.count({ where: { status: LicenseStatus.ACTIVE } }),
      this.prisma.license.count({ where: { status: LicenseStatus.EXPIRED } }),
      this.prisma.license.count({ where: { status: LicenseStatus.BANNED } }),
      this.prisma.activation.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.license.groupBy({
        by: ['plan'],
        _count: true,
      }),
    ]);

    // Active in last 24h (heartbeat)
    const activeToday = await this.prisma.license.count({
      where: {
        lastHeartbeat: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    return {
      total, active, expired, banned,
      activeToday,
      recentActivations,
      planBreakdown: planBreakdown.map(p => ({ plan: p.plan, count: p._count })),
    };
  }

  // ── Cron: auto-expire licenses ──
  @Cron(CronExpression.EVERY_HOUR)
  async expireLicenses() {
    const result = await this.prisma.license.updateMany({
      where: {
        status: LicenseStatus.ACTIVE,
        expiresAt: { lt: new Date(), not: null },
      },
      data: { status: LicenseStatus.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.log(`Auto-expired ${result.count} licenses`);
    }
  }

  // ── Private helpers ──

  private calculateExpiry(plan: LicensePlan, customDays?: number): Date | null {
    const now = new Date();
    if (customDays && customDays > 0) {
      return new Date(now.setDate(now.getDate() + customDays));
    }
    switch (plan) {
      case LicensePlan.DAYS_1:   return new Date(now.setDate(now.getDate() + 1));
      case LicensePlan.DAYS_7:   return new Date(now.setDate(now.getDate() + 7));
      case LicensePlan.DAYS_14:  return new Date(now.setDate(now.getDate() + 14));
      case LicensePlan.DAYS_30:  return new Date(now.setDate(now.getDate() + 30));
      case LicensePlan.DAYS_90:  return new Date(now.setDate(now.getDate() + 90));
      case LicensePlan.DAYS_365: return new Date(now.setDate(now.getDate() + 365));
      case LicensePlan.LIFETIME: return null;
    }
  }
}
