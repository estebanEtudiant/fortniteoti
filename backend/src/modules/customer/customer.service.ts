import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, Logger, ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { MailService } from './mail.service';
import { DiscordRoleService } from './discord-role.service';
import {
  RegisterCustomerDto, LoginCustomerDto,
  UpdateProfileDto, ChangePasswordDto,
  ForgotPasswordDto, ResetPasswordDto,
} from './customer.dto';

const RESET_TOKEN_TTL  = 3600;
const VERIFY_TOKEN_TTL = 86400;
const DISCORD_STATE_TTL = 300;

const RESET_KEY         = (t: string) => `pwd_reset:${t}`;
const VERIFY_KEY        = (t: string) => `email_verify:${t}`;
const DISCORD_STATE_KEY = (t: string) => `discord_state:${t}`;

const DUMMY_HASH = '$2b$12$invalidhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

type Brand = 'ftn' | 'ng';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private redis: RedisService,
    private mail: MailService,
    private discordRole: DiscordRoleService,
  ) {}

  // ══════════════════════════════════════════════════
  //  REGISTER
  // ══════════════════════════════════════════════════
  async register(dto: RegisterCustomerDto): Promise<any> {
    const existingEmail = await this.prisma.customer.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingEmail) throw new ConflictException('Cette adresse email est déjà utilisée');

    const existingUsername = await this.prisma.customer.findUnique({
      where: { username: dto.username.trim() },
    });
    if (existingUsername) throw new ConflictException('Ce nom d\'utilisateur est déjà pris');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const source: Brand = dto.source === 'ng' ? 'ng' : 'ftn';

    let referredByAffiliateId: string | undefined;
    if (dto.refCode) {
      const aff = await this.prisma.affiliate.findUnique({
        where: { code: dto.refCode.toUpperCase().trim() },
      });
      if (aff && aff.status === 'active') referredByAffiliateId = aff.id;
    }

    const customer = await this.prisma.customer.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        username: dto.username.trim(),
        passwordHash,
        displayName: dto.username.trim(),
        source,
        ...(referredByAffiliateId && { referredByAffiliateId }),
      },
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, createdAt: true },
    });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await this.redis.set(VERIFY_KEY(verifyToken), customer.id, VERIFY_TOKEN_TTL);
    const isShop = dto.source === 'shop';
    const baseUrl = isShop
      ? this.config.get<string>('shopStorefrontUrl', 'https://shop.404tweaks.tech')
      : source === 'ng'
      ? this.config.get<string>('ngStorefrontUrl', 'https://404tweaks.tech/404Client')
      : this.config.get<string>('storefrontUrl', 'http://localhost:3002');
    const verifyUrl = isShop
      ? `${baseUrl}/?token=${verifyToken}#verify`
      : `${baseUrl}/verify-email?token=${verifyToken}`;

    try {
      await this.mail.sendEmailVerification(customer.email, verifyUrl, source);
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${customer.email}: ${(err as Error).message}`);
    }

    const token = await this.generateToken(customer.id, customer.email);
    this.logger.log(`Customer registered [${source}]: ${customer.email}`);
    return { success: true, token, customer };
  }

  // ══════════════════════════════════════════════════
  //  LOGIN
  // ══════════════════════════════════════════════════
  async login(dto: LoginCustomerDto): Promise<any> {
    const login = dto.login.toLowerCase().trim();
    const customer = await this.prisma.customer.findFirst({
      where: {
        OR: [
          { email: login },
          { username: { equals: dto.login.trim(), mode: 'insensitive' } },
        ],
      },
    });

    const hashToCompare = customer ? customer.passwordHash : DUMMY_HASH;
    const passwordValid = await bcrypt.compare(dto.password, hashToCompare);

    if (!customer || !passwordValid) throw new UnauthorizedException('Identifiants incorrects');
    if (customer.banned) throw new ForbiddenException('Ce compte a été suspendu');

    await this.prisma.customer.update({ where: { id: customer.id }, data: { lastLogin: new Date() } });
    const token = await this.generateToken(customer.id, customer.email);
    this.logger.log(`Customer login: ${customer.email}`);

    return {
      success: true,
      token,
      customer: {
        id: customer.id, email: customer.email, username: customer.username,
        displayName: customer.displayName, avatarUrl: customer.avatarUrl,
        emailVerified: customer.emailVerified,
      },
    };
  }

  // ══════════════════════════════════════════════════
  //  PROFILE
  // ══════════════════════════════════════════════════
  async getProfile(customerId: string): Promise<any> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true, email: true, username: true, displayName: true,
        avatarUrl: true, discordId: true, discordUsername: true, discordAvatar: true,
        emailVerified: true, source: true, createdAt: true, lastLogin: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true, plan: true, amount: true, currency: true,
            status: true, createdAt: true, completedAt: true,
          },
        },
      },
    });

    if (!customer) throw new UnauthorizedException('Compte non trouvé');

    const licenses = await this.prisma.license.findMany({
      where: { email: customer.email },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, licenseKey: true, plan: true, status: true,
        product: true, hwid: true, expiresAt: true, createdAt: true, metadata: true,
      },
    });

    return { ...customer, licenses };
  }

  async updateProfile(customerId: string, dto: UpdateProfileDto): Promise<any> {
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: { displayName: dto.displayName, avatarUrl: dto.avatarUrl, discordId: dto.discordId },
      select: {
        id: true, email: true, username: true, displayName: true,
        avatarUrl: true, discordId: true, discordUsername: true, discordAvatar: true,
      },
    });
    return { success: true, customer };
  }

  async changePassword(customerId: string, dto: ChangePasswordDto): Promise<any> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new UnauthorizedException('Compte non trouvé');

    const valid = await bcrypt.compare(dto.currentPassword, customer.passwordHash);
    if (!valid) throw new BadRequestException('Mot de passe actuel incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.customer.update({ where: { id: customerId }, data: { passwordHash } });
    return { success: true, message: 'Mot de passe modifié avec succès' };
  }

  // ══════════════════════════════════════════════════
  //  FORGOT PASSWORD
  // ══════════════════════════════════════════════════
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ success: boolean }> {
    const email = dto.email.toLowerCase().trim();
    const customer = await this.prisma.customer.findUnique({ where: { email } });
    if (!customer) return { success: true };

    const token = crypto.randomBytes(32).toString('hex');
    await this.redis.set(RESET_KEY(token), customer.id, RESET_TOKEN_TTL);

    const brand: Brand = (customer.source as Brand) === 'ng' ? 'ng' : 'ftn';
    const baseUrl = brand === 'ng'
      ? this.config.get<string>('ngStorefrontUrl', 'https://404tweaks.tech/404Client')
      : this.config.get<string>('storefrontUrl', 'http://localhost:3002');
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
      await this.mail.sendPasswordReset(email, resetUrl, brand);
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${email}: ${(err as Error).message}`);
      await this.redis.del(RESET_KEY(token));
      throw new BadRequestException('Impossible d\'envoyer l\'email. Verifie ta configuration SMTP.');
    }

    this.logger.log(`Password reset requested for ${email}`);
    return { success: true };
  }

  // ══════════════════════════════════════════════════
  //  RESET PASSWORD
  // ══════════════════════════════════════════════════
  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean }> {
    const customerId = await this.redis.get(RESET_KEY(dto.token));
    if (!customerId) throw new BadRequestException('Lien invalide ou expire. Fais une nouvelle demande.');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.customer.update({ where: { id: customerId }, data: { passwordHash } });
    await this.redis.del(RESET_KEY(dto.token));
    this.logger.log(`Password reset successful for customer ${customerId}`);
    return { success: true };
  }

  // ══════════════════════════════════════════════════
  //  VERIFY EMAIL
  // ══════════════════════════════════════════════════
  async verifyEmail(token: string): Promise<{ success: boolean }> {
    const customerId = await this.redis.get(VERIFY_KEY(token));
    if (!customerId) throw new BadRequestException('Lien de verification invalide ou expire.');
    await this.prisma.customer.update({ where: { id: customerId }, data: { emailVerified: true } });
    await this.redis.del(VERIFY_KEY(token));
    this.logger.log(`Email verified for customer ${customerId}`);
    return { success: true };
  }

  async resendVerification(customerId: string): Promise<{ success: boolean }> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new BadRequestException('Compte introuvable');
    if (customer.emailVerified) throw new BadRequestException('Email deja verifie');

    const brand: Brand = (customer.source as Brand) === 'ng' ? 'ng' : 'ftn';
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await this.redis.set(VERIFY_KEY(verifyToken), customer.id, VERIFY_TOKEN_TTL);
    const baseUrl = brand === 'ng'
      ? this.config.get<string>('ngStorefrontUrl', 'https://404tweaks.tech/404Client')
      : this.config.get<string>('storefrontUrl', 'http://localhost:3002');
    const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}`;
    await this.mail.sendEmailVerification(customer.email, verifyUrl, brand);
    this.logger.log(`Verification email resent [${brand}] to ${customer.email}`);
    return { success: true };
  }

  // ══════════════════════════════════════════════════
  //  DISCORD OAUTH
  // ══════════════════════════════════════════════════
  async discordConnectUrl(customerId: string): Promise<{ url: string }> {
    const state = crypto.randomBytes(16).toString('hex');
    await this.redis.set(DISCORD_STATE_KEY(state), customerId, DISCORD_STATE_TTL);

    const clientId    = this.config.get<string>('discord.clientId');
    const redirectUri = this.config.get<string>('discord.redirectUri');
    const params = new URLSearchParams({
      client_id:     clientId!,
      redirect_uri:  redirectUri!,
      response_type: 'code',
      scope:         'identify',
      state,
    });

    return { url: `https://discord.com/oauth2/authorize?${params.toString()}` };
  }

  async discordCallback(code: string, state: string): Promise<string> {
    const ngStorefrontUrl = this.config.get<string>('ngStorefrontUrl', 'https://404tweaks.tech/404Client');
    const errRedirect = `${ngStorefrontUrl}/profile?discord=error`;

    const customerId = await this.redis.get(DISCORD_STATE_KEY(state));
    if (!customerId) return errRedirect;

    await this.redis.del(DISCORD_STATE_KEY(state));

    try {
      const clientId     = this.config.get<string>('discord.clientId')!;
      const clientSecret = this.config.get<string>('discord.clientSecret')!;
      const redirectUri  = this.config.get<string>('discord.redirectUri')!;

      // Exchange code for access token
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     clientId,
          client_secret: clientSecret,
          grant_type:    'authorization_code',
          code,
          redirect_uri:  redirectUri,
        }),
      });

      if (!tokenRes.ok) return errRedirect;
      const tokenData = await tokenRes.json();

      // Fetch Discord user info
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) return errRedirect;
      const discordUser = await userRes.json();

      const discordAvatar = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.webp?size=128`
        : null;

      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          discordId:       discordUser.id,
          discordUsername: discordUser.global_name || discordUser.username,
          discordAvatar,
        },
      });

      this.logger.log(`Discord linked for customer ${customerId}: ${discordUser.username}`);

      // Toujours attribuer le rôle "Discord lié"
      this.discordRole.assignDiscordLinkedRole(discordUser.id).catch(() => {});

      // Attribuer le rôle "licencié" si le client a déjà une licence NG active
      const completedOrders = await this.prisma.order.findMany({
        where: { customerId, status: 'COMPLETED' },
        select: { licenseId: true },
      });
      const licenseIds = completedOrders.map(o => o.licenseId).filter(Boolean) as string[];
      if (licenseIds.length > 0) {
        const ngLicense = await this.prisma.license.findFirst({
          where: { id: { in: licenseIds }, product: 'NG_LOADER', status: 'ACTIVE' },
        });
        if (ngLicense) {
          this.discordRole.assignNgLicensedRole(discordUser.id).catch(() => {});
        }
      }

      return `${ngStorefrontUrl}/profile?discord=connected`;
    } catch (err) {
      this.logger.error('Discord callback error:', err);
      return errRedirect;
    }
  }

  async discordDisconnect(customerId: string): Promise<{ success: boolean }> {
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { discordId: null, discordUsername: null, discordAvatar: null },
    });
    return { success: true };
  }

  // ══════════════════════════════════════════════════
  //  Private helpers
  // ══════════════════════════════════════════════════
  private async generateToken(customerId: string, email: string): Promise<string> {
    return this.jwt.signAsync(
      { customerId, email, type: 'customer' },
      { secret: this.config.get<string>('jwt.secret'), expiresIn: '7d' },
    );
  }
}
