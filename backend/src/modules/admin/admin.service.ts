import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { LicenseService } from '../license/license.service';
import { MailService } from '../customer/mail.service';

export interface AdminLoginDto { username: string; password: string; }
export interface CreateAdminDto { username: string; password: string; role?: 'SUPERADMIN' | 'ADMIN' | 'VIEWER'; }

const PLANS_CONFIG_KEY  = 'admin:plans_config';
const SETTINGS_KEY      = 'admin:settings';
const REVIEWS_KEY       = 'reviews:list';
const BOT_CONFIG_KEY    = 'bot:config';

const DEFAULT_BOT_CONFIG = {
  welcome_channel_title: "👋 Bienvenue sur 404 Tweaks, {username} !",
  welcome_channel_desc:  "Heureux de t'accueillir sur le serveur officiel **404 Tweaks** !\nNous sommes le **{memberCount}ème membre** à nous rejoindre.\n\n**Premiers pas :**\n> 🛒 **Pas encore client ?** Achète ta licence sur [**404tweaks.tech**](https://404tweaks.tech/)\n> 🔑 **Déjà client ?** Utilise `/verify <clé>` pour activer tes rôles\n> 📖 **Comment acheter ?** Utilise `/tuto` pour voir le guide complet\n> 🎫 **Besoin d'aide ?** Ouvre un ticket avec `/ticket`",
  welcome_dm_title:      "👋 Bienvenue sur 404 Tweaks !",
  welcome_dm_desc:       "Merci de nous rejoindre sur le serveur **404 Tweaks** !\n\n🛒 **Acheter une licence :** [404tweaks.tech](https://404tweaks.tech/)\n\n🔑 **Déjà client ?** Reviens sur le serveur et utilise `/verify <ta-clé>` pour activer tes rôles.\n\n🎫 **Besoin d'aide ?** Ouvre un ticket avec `/ticket` sur le serveur.",
  setup_avis_title:      "💬 Partagez votre expérience 404 Tweaks",
  setup_avis_desc:       "Tu utilises **404 Tweaks** et tu es satisfait de tes résultats ?\nLaisse un avis pour aider la communauté !\n\n> ⭐ **Clique sur le bouton ci-dessous** pour partager ton expérience en quelques secondes.\n> 🔒 *Ton avis sera visible sur le site officiel.*",
  tuto_title:            "🛒 Comment acheter une licence 404 Tweaks ?",
  tuto_intro:            "Suis ces étapes simples pour obtenir et activer ta licence en moins de 5 minutes.",
};

const DEFAULT_PLANS = {
  DAYS_1:   { name: '1 Jour',   price: 199,  active: false, stripePrice: '', description: '' },
  DAYS_7:   { name: '7 Jours',  price: 499,  active: false, stripePrice: '', description: '' },
  DAYS_14:  { name: '14 Jours', price: 799,  active: false, stripePrice: '', description: '' },
  DAYS_30:  { name: '30 Jours', price: 999,  active: true,  stripePrice: '', description: 'Idéal pour tester et progresser rapidement sur Fortnite.' },
  DAYS_90:  { name: '90 Jours', price: 1999, active: true,  stripePrice: '', description: 'Le choix des joueurs réguliers. 3 mois d\'optimisation complète.' },
  DAYS_365: { name: '1 An',     price: 2499, active: true,  stripePrice: '', description: 'Accès 1 an à toutes les mises à jour et nouveaux tweaks.' },
  LIFETIME: { name: 'Lifetime',  price: 2999, active: true, stripePrice: '', description: 'Accès illimité à vie — le meilleur rapport qualité/prix.' },
};

const DEFAULT_SETTINGS = {
  downloadUrl: '',
  maintenanceMode: false,
  announcement: '',
  screenshotUrl: '',
  discordInviteUrl: '',
};

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwt: JwtService,
    private config: ConfigService,
    private licenseService: LicenseService,
    private mail: MailService,
  ) {}

  // ══════════════════════════════════════════════════
  //  AUTH
  // ══════════════════════════════════════════════════
  async login(dto: AdminLoginDto): Promise<{ token: string; admin: any }> {
    const admin = await this.prisma.admin.findUnique({ where: { username: dto.username } });
    if (!admin || !(await bcrypt.compare(dto.password, admin.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.prisma.admin.update({ where: { id: admin.id }, data: { lastLogin: new Date() } });
    const token = await this.jwt.signAsync(
      { adminId: admin.id, username: admin.username, role: admin.role },
      { secret: this.config.get<string>('jwt.secret'), expiresIn: '8h' },
    );
    this.logger.log(`Admin login: ${admin.username}`);
    return { token, admin: { id: admin.id, username: admin.username, role: admin.role } };
  }

  async createAdmin(dto: CreateAdminDto): Promise<any> {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.admin.create({
      data: { username: dto.username, passwordHash, role: dto.role || 'ADMIN' },
      select: { id: true, username: true, role: true, createdAt: true },
    });
  }

  async changeAdminPassword(adminId: string, currentPassword: string, newPassword: string): Promise<void> {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.admin.update({ where: { id: adminId }, data: { passwordHash } });
    this.logger.log(`Admin password changed: ${admin.username}`);
  }

  // ══════════════════════════════════════════════════
  //  ENHANCED STATS (Dashboard)
  // ══════════════════════════════════════════════════
  async getEnhancedStats() {
    const licenseStats = await this.licenseService.getStats();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const [
      totalCustomers,
      newCustomers30d,
      revenueResult,
      revenue30dResult,
      recentOrders,
      ordersByDay,
      expiringIn7d,
      hwidMismatches24h,
      activeNow,
      blockedIpCount,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: 'COMPLETED', completedAt: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
      this.prisma.order.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true, plan: true, amount: true, currency: true, createdAt: true,
          customer: { select: { username: true, email: true } },
        },
      }),
      this.prisma.order.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: thirtyDaysAgo } },
        select: { amount: true, completedAt: true },
        orderBy: { completedAt: 'asc' },
      }),
      this.prisma.license.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.activation.count({
        where: {
          status: 'HWID_MISMATCH',
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.license.count({ where: { lastHeartbeat: { gte: fiveMinutesAgo } } }),
      this.prisma.blockedIp.count({ where: { expiresAt: { gte: now } } }),
    ]);

    // Group revenue by day (last 30d)
    const revenueByDay: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      revenueByDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (const o of ordersByDay) {
      if (o.completedAt) {
        const key = o.completedAt.toISOString().slice(0, 10);
        if (key in revenueByDay) revenueByDay[key] += o.amount;
      }
    }
    const revenueChart = Object.entries(revenueByDay).map(([date, amount]) => ({ date, amount }));

    return {
      ...licenseStats,
      customers: { total: totalCustomers, new30d: newCustomers30d },
      revenue: { total: revenueResult._sum.amount || 0, last30d: revenue30dResult._sum.amount || 0 },
      recentOrders,
      revenueChart,
      alerts: { expiringIn7d, hwidMismatches24h, activeNow, blockedIpCount },
    };
  }

  // ══════════════════════════════════════════════════
  //  ORDERS
  // ══════════════════════════════════════════════════
  async listOrders(page = 1, limit = 25, status?: string, plan?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, plan: true, amount: true, currency: true,
          status: true, createdAt: true, completedAt: true,
          stripeSessionId: true, stripePaymentId: true,
          customer: { select: { id: true, email: true, username: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data: orders, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ══════════════════════════════════════════════════
  //  ANALYTICS
  // ══════════════════════════════════════════════════
  async getAnalytics() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [salesByPlan, monthlyOrders, activationsByDay, successCount] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['plan'],
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.order.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: sixMonthsAgo } },
        select: { amount: true, completedAt: true },
        orderBy: { completedAt: 'asc' },
      }),
      this.prisma.activation.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { status: true, createdAt: true },
      }),
      this.prisma.activation.count({
        where: { status: 'SUCCESS', createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    // Monthly revenue (last 6 months)
    const monthlyRevenue: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyRevenue[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    for (const o of monthlyOrders) {
      if (o.completedAt) {
        const d = new Date(o.completedAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key in monthlyRevenue) monthlyRevenue[key] += o.amount;
      }
    }

    // Daily activations (last 7 days)
    const dailyAct: Record<string, { success: number; failed: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dailyAct[d.toISOString().slice(0, 10)] = { success: 0, failed: 0 };
    }
    for (const a of activationsByDay) {
      const key = new Date(a.createdAt).toISOString().slice(0, 10);
      if (key in dailyAct) {
        if (a.status === 'SUCCESS') dailyAct[key].success++;
        else dailyAct[key].failed++;
      }
    }

    return {
      salesByPlan: salesByPlan.map(s => ({
        plan: s.plan,
        count: s._count.id,
        revenue: s._sum.amount || 0,
      })),
      monthlyRevenueChart: Object.entries(monthlyRevenue).map(([month, amount]) => ({ month, amount })),
      activationChart: Object.entries(dailyAct).map(([date, v]) => ({ date, ...v })),
      activationSuccessRate: activationsByDay.length > 0
        ? Math.round((successCount / activationsByDay.length) * 100)
        : 100,
      totalActivations7d: activationsByDay.length,
      successCount,
    };
  }

  // ══════════════════════════════════════════════════
  //  SETTINGS
  // ══════════════════════════════════════════════════
  async getSettings() {
    const raw = await this.redis.get(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }; } catch { return DEFAULT_SETTINGS; }
  }

  async updateSettings(settings: Partial<typeof DEFAULT_SETTINGS>) {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await this.redis.set(SETTINGS_KEY, JSON.stringify(updated));
    this.logger.log('Site settings updated');
    return updated;
  }

  // ══════════════════════════════════════════════════
  //  BLOCKED IPs
  // ══════════════════════════════════════════════════
  async listBlockedIps(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const now = new Date();
    const [ips, total] = await Promise.all([
      this.prisma.blockedIp.findMany({
        skip, take: limit,
        orderBy: { blockedAt: 'desc' },
      }),
      this.prisma.blockedIp.count(),
    ]);
    return {
      data: ips.map(ip => ({ ...ip, expired: ip.expiresAt < now })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async unblockIp(id: string) {
    return this.prisma.blockedIp.delete({ where: { id } });
  }

  // ══════════════════════════════════════════════════
  //  REVIEWS
  // ══════════════════════════════════════════════════
  async getReviews() {
    const raw = await this.redis.get(REVIEWS_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as any[]; } catch { return []; }
  }

  async deleteReview(discordId: string) {
    const raw  = await this.redis.get(REVIEWS_KEY);
    const list = raw ? (JSON.parse(raw) as any[]) : [];
    const updated = list.filter((r) => r.discordId !== discordId);
    await this.redis.set(REVIEWS_KEY, JSON.stringify(updated));
    return { success: true, remaining: updated.length };
  }

  // ══════════════════════════════════════════════════
  //  BOT CONFIG
  // ══════════════════════════════════════════════════
  async getBotConfig() {
    const raw = await this.redis.get(BOT_CONFIG_KEY);
    if (!raw) return DEFAULT_BOT_CONFIG;
    try { return { ...DEFAULT_BOT_CONFIG, ...JSON.parse(raw) }; } catch { return DEFAULT_BOT_CONFIG; }
  }

  async updateBotConfig(config: Partial<typeof DEFAULT_BOT_CONFIG>) {
    const current = await this.getBotConfig();
    const updated = { ...current, ...config };
    await this.redis.set(BOT_CONFIG_KEY, JSON.stringify(updated));
    this.logger.log('Bot config updated');
    return updated;
  }

  // ══════════════════════════════════════════════════
  //  CUSTOMERS
  // ══════════════════════════════════════════════════
  async listCustomers(page = 1, limit = 25, search = '') {
    const skip = (page - 1) * limit;
    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { username: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, username: true, displayName: true,
          banned: true, createdAt: true, lastLogin: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data: customers, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getCustomer(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true, email: true, username: true, displayName: true,
        discordId: true, banned: true, emailVerified: true,
        createdAt: true, lastLogin: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, plan: true, amount: true, currency: true,
            status: true, createdAt: true, completedAt: true, licenseId: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const licenseIds = customer.orders
      .filter(o => o.status === 'COMPLETED' && o.licenseId)
      .map(o => o.licenseId as string);

    const licenses = licenseIds.length > 0
      ? await this.prisma.license.findMany({
          where: { id: { in: licenseIds } },
          select: { id: true, licenseKey: true, plan: true, status: true, expiresAt: true, hwid: true },
        })
      : [];

    return { ...customer, licenses };
  }

  async banCustomer(id: string): Promise<any> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    return this.prisma.customer.update({ where: { id }, data: { banned: true } });
  }

  async unbanCustomer(id: string): Promise<any> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    return this.prisma.customer.update({ where: { id }, data: { banned: false } });
  }

  async deleteCustomer(id: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    await this.prisma.customer.delete({ where: { id } });
    this.logger.log(`Customer deleted: ${customer.email}`);
  }

  async sendPasswordResetToCustomer(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const token = crypto.randomBytes(32).toString('hex');
    await this.redis.set(`pwd_reset:${token}`, customer.id, 3600);
    const storefrontUrl = this.config.get<string>('storefrontUrl', 'http://localhost:3002');
    const resetUrl = `${storefrontUrl}/reset-password?token=${token}`;
    await this.mail.sendPasswordReset(customer.email, resetUrl);
    this.logger.log(`Admin sent password reset to ${customer.email}`);
    return { success: true };
  }

  async revokeCustomerLicenses(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const orders = await this.prisma.order.findMany({
      where: { customerId, status: 'COMPLETED', licenseId: { not: null } },
      select: { licenseId: true },
    });

    const licenseIds = orders.map(o => o.licenseId as string);
    if (licenseIds.length === 0) return { revoked: 0 };

    const result = await this.prisma.license.updateMany({
      where: { id: { in: licenseIds }, status: { not: 'BANNED' } },
      data: { status: 'BANNED', banReason: 'Revoked by admin', bannedAt: new Date() },
    });

    this.logger.log(`Revoked ${result.count} licenses for ${customer.email}`);
    return { revoked: result.count };
  }

  // ══════════════════════════════════════════════════
  //  PLANS CONFIG (Redis)
  // ══════════════════════════════════════════════════
  async getPlans(): Promise<typeof DEFAULT_PLANS> {
    const raw = await this.redis.get(PLANS_CONFIG_KEY);
    if (!raw) return DEFAULT_PLANS;
    try { return { ...DEFAULT_PLANS, ...JSON.parse(raw) }; } catch { return DEFAULT_PLANS; }
  }

  async createPlan(key: string, config: { name: string; price: number; originalPrice?: number; popular?: boolean; stripePrice?: string; description?: string }): Promise<any> {
    const current = await this.getPlans() as any;
    if (key in current) throw new BadRequestException(`Plan "${key}" already exists`);
    current[key] = { name: config.name, price: config.price, originalPrice: config.originalPrice || 0, active: true, popular: config.popular || false, stripePrice: config.stripePrice || '', description: config.description || '' };
    await this.redis.set(PLANS_CONFIG_KEY, JSON.stringify(current));
    this.logger.log(`Plan created: ${key}`);
    return current[key];
  }

  async updatePlan(plan: string, config: { name?: string; price?: number; originalPrice?: number; active?: boolean; popular?: boolean; stripePrice?: string; description?: string }): Promise<any> {
    const current = await this.getPlans() as any;
    if (!(plan in current)) throw new NotFoundException(`Plan "${plan}" not found`);
    current[plan] = { ...current[plan], ...config };
    await this.redis.set(PLANS_CONFIG_KEY, JSON.stringify(current));
    this.logger.log(`Plan config updated: ${plan}`);
    return current[plan];
  }

  async deletePlan(key: string): Promise<{ deleted: string }> {
    const current = await this.getPlans() as any;
    if (!(key in current)) throw new NotFoundException(`Plan "${key}" not found`);
    delete current[key];
    await this.redis.set(PLANS_CONFIG_KEY, JSON.stringify(current));
    this.logger.log(`Plan deleted: ${key}`);
    return { deleted: key };
  }

  // ══════════════════════════════════════════════════
  //  PROMO CODES
  // ══════════════════════════════════════════════════
  private readonly PROMO_CODES_KEY = 'admin:promo_codes';

  async getPromoCodes(): Promise<Record<string, any>> {
    const raw = await this.redis.get(this.PROMO_CODES_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  async createPromoCode(dto: {
    code: string;
    type: 'percent' | 'fixed';
    amount: number;
    maxUses?: number;
    stripeId?: string;
  }): Promise<any> {
    const code = dto.code.toUpperCase().trim();
    if (!code || !/^[A-Z0-9_-]{2,20}$/.test(code)) {
      throw new BadRequestException('Code invalide (2–20 caractères alphanumériques)');
    }
    const current = await this.getPromoCodes();
    if (current[code]) throw new BadRequestException(`Code "${code}" existe déjà`);
    current[code] = {
      type: dto.type,
      amount: dto.amount,
      maxUses: dto.maxUses || 0,
      uses: 0,
      active: true,
      stripeId: dto.stripeId || '',
      createdAt: new Date().toISOString(),
    };
    await this.redis.set(this.PROMO_CODES_KEY, JSON.stringify(current));
    this.logger.log(`Promo code created: ${code}`);
    return { code, ...current[code] };
  }

  async deletePromoCode(code: string): Promise<{ deleted: string }> {
    const current = await this.getPromoCodes();
    const key = code.toUpperCase();
    if (!current[key]) throw new NotFoundException(`Code "${key}" introuvable`);
    delete current[key];
    await this.redis.set(this.PROMO_CODES_KEY, JSON.stringify(current));
    return { deleted: key };
  }

  async togglePromoCode(code: string, active: boolean): Promise<any> {
    const current = await this.getPromoCodes();
    const key = code.toUpperCase();
    if (!current[key]) throw new NotFoundException(`Code "${key}" introuvable`);
    current[key].active = active;
    await this.redis.set(this.PROMO_CODES_KEY, JSON.stringify(current));
    return { code: key, active };
  }

  // ══════════════════════════════════════════════════
  //  ACTIVITY TRACKING
  // ══════════════════════════════════════════════════
  private dateKey(date: Date): string {
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  async trackPageview(path: string, sessionId?: string): Promise<void> {
    const today = this.dateKey(new Date());
    const now = Date.now();
    const ttl = 90 * 24 * 3600;

    await this.redis.hincrby(`analytics:pv:${today}`, path, 1);
    await this.redis.expire(`analytics:pv:${today}`, ttl);

    if (sessionId) {
      await this.redis.pfadd(`analytics:uv:${today}`, sessionId);
      await this.redis.expire(`analytics:uv:${today}`, ttl);
    }

    // Real-time sorted set — member scored by timestamp (ms)
    await this.redis.zadd('analytics:rt', now, `${sessionId || 'anon'}-${now}-${Math.random()}`);
    await this.redis.expire('analytics:rt', 600);
  }

  async getActivityStats(): Promise<any> {
    const now = new Date();
    const daily: { date: string; pageViews: number; sessions: number }[] = [];
    const pageMap: Record<string, number> = {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = this.dateKey(d);

      const pvData = await this.redis.hgetall(`analytics:pv:${key}`);
      const pageViews = pvData ? Object.values(pvData).reduce((sum, v) => sum + parseInt(v, 10), 0) : 0;
      const sessions = await this.redis.pfcount(`analytics:uv:${key}`);

      daily.push({ date: key, pageViews, sessions });

      if (pvData) {
        for (const [p, count] of Object.entries(pvData)) {
          pageMap[p] = (pageMap[p] || 0) + parseInt(count, 10);
        }
      }
    }

    // Today's top pages sorted by hit count
    const today = this.dateKey(now);
    const todayPv = await this.redis.hgetall(`analytics:pv:${today}`);
    const topPages = Object.entries(todayPv || {})
      .sort(([, a], [, b]) => parseInt(b, 10) - parseInt(a, 10))
      .slice(0, 10)
      .map(([path, count]) => ({ path, count: parseInt(count, 10) }));

    // Real-time: sessions active in the last 10 minutes
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const realtimeVisitors = await this.redis.zcount('analytics:rt', tenMinAgo, '+inf');
    await this.redis.zremrangebyscore('analytics:rt', 0, tenMinAgo - 1);

    return {
      daily,
      topPages,
      realtimeVisitors,
      summary: {
        pageviews7d:      daily.slice(-7).reduce((s, d) => s + d.pageViews, 0),
        pageviews30d:     daily.reduce((s, d) => s + d.pageViews, 0),
        sessions7d:       daily.slice(-7).reduce((s, d) => s + d.sessions, 0),
        sessions30d:      daily.reduce((s, d) => s + d.sessions, 0),
      },
    };
  }

  // ══════════════════════════════════════════════════
  //  LOGS
  // ══════════════════════════════════════════════════
  async getActivationLogs(page = 1, limit = 100) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.activationLog.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { license: { select: { licenseKey: true, email: true } } },
      }),
      this.prisma.activationLog.count(),
    ]);
    return { data: logs, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}