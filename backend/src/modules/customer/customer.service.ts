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
import {
  RegisterCustomerDto, LoginCustomerDto,
  UpdateProfileDto, ChangePasswordDto,
  ForgotPasswordDto, ResetPasswordDto,
} from './customer.dto';

const RESET_TOKEN_TTL = 3600; // 1 hour
const RESET_KEY = (token: string) => `pwd_reset:${token}`;

const VERIFY_TOKEN_TTL = 86400; // 24 hours
const VERIFY_KEY = (token: string) => `email_verify:${token}`;

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private redis: RedisService,
    private mail: MailService,
  ) {}

  // ══════════════════════════════════════════════════
  //  REGISTER
  // ══════════════════════════════════════════════════
  async register(dto: RegisterCustomerDto): Promise<any> {
    // Check if email already exists
    const existingEmail = await this.prisma.customer.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new ConflictException('Cette adresse email est déjà utilisée');
    }

    // Check if username already exists
    const existingUsername = await this.prisma.customer.findUnique({
      where: { username: dto.username.trim() },
    });
    if (existingUsername) {
      throw new ConflictException('Ce nom d\'utilisateur est déjà pris');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create customer
    const customer = await this.prisma.customer.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        username: dto.username.trim(),
        passwordHash,
        displayName: dto.username.trim(),
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Send email verification
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await this.redis.set(VERIFY_KEY(verifyToken), customer.id, VERIFY_TOKEN_TTL);
    const storefrontUrl = this.config.get<string>('storefrontUrl', 'http://localhost:3002');
    const verifyUrl = `${storefrontUrl}/#/verify-email?token=${verifyToken}`;
    try {
      await this.mail.sendEmailVerification(customer.email, verifyUrl);
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${customer.email}: ${(err as Error).message}`);
      // Non-blocking: account created even if email fails
    }

    // Generate JWT
    const token = await this.generateToken(customer.id, customer.email);

    this.logger.log(`Customer registered: ${customer.email}`);

    return {
      success: true,
      token,
      customer,
    };
  }

  // ══════════════════════════════════════════════════
  //  LOGIN
  // ══════════════════════════════════════════════════
  async login(dto: LoginCustomerDto): Promise<any> {
    const login = dto.login.toLowerCase().trim();

    // Find by email or username
    const customer = await this.prisma.customer.findFirst({
      where: {
        OR: [
          { email: login },
          { username: { equals: dto.login.trim(), mode: 'insensitive' } },
        ],
      },
    });

    if (!customer || !(await bcrypt.compare(dto.password, customer.passwordHash))) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    if (customer.banned) {
      throw new ForbiddenException('Ce compte a été suspendu');
    }

    // Update last login
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastLogin: new Date() },
    });

    const token = await this.generateToken(customer.id, customer.email);

    this.logger.log(`Customer login: ${customer.email}`);

    return {
      success: true,
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        username: customer.username,
        displayName: customer.displayName,
        avatarUrl: customer.avatarUrl,
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
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        discordId: true,
        emailVerified: true,
        createdAt: true,
        lastLogin: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            plan: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw new UnauthorizedException('Compte non trouvé');
    }

    // Get associated licenses via orders
    const completedOrders = await this.prisma.order.findMany({
      where: { customerId, status: 'COMPLETED' },
      select: { licenseId: true },
    });

    const licenseIds = completedOrders
      .map(o => o.licenseId)
      .filter((id): id is string => id !== null);

    const licenses = licenseIds.length > 0
      ? await this.prisma.license.findMany({
          where: { id: { in: licenseIds } },
          select: {
            id: true,
            licenseKey: true,
            plan: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
        })
      : [];

    return { ...customer, licenses };
  }

  async updateProfile(customerId: string, dto: UpdateProfileDto): Promise<any> {
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl,
        discordId: dto.discordId,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        discordId: true,
      },
    });

    return { success: true, customer };
  }

  async changePassword(customerId: string, dto: ChangePasswordDto): Promise<any> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new UnauthorizedException('Compte non trouvé');
    }

    const valid = await bcrypt.compare(dto.currentPassword, customer.passwordHash);
    if (!valid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash },
    });

    return { success: true, message: 'Mot de passe modifié avec succès' };
  }

  // ══════════════════════════════════════════════════
  //  FORGOT PASSWORD
  // ══════════════════════════════════════════════════
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ success: boolean }> {
    const email = dto.email.toLowerCase().trim();
    const customer = await this.prisma.customer.findUnique({ where: { email } });

    // Always return success to avoid leaking whether an email exists
    if (!customer) {
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    await this.redis.set(RESET_KEY(token), customer.id, RESET_TOKEN_TTL);

    const storefrontUrl = this.config.get<string>('storefrontUrl', 'http://localhost:3002');
    const resetUrl = `${storefrontUrl}/#/reset-password?token=${token}`;

    try {
      await this.mail.sendPasswordReset(email, resetUrl);
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

    if (!customerId) {
      throw new BadRequestException('Lien invalide ou expire. Fais une nouvelle demande.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash },
    });

    // Invalidate the token immediately
    await this.redis.del(RESET_KEY(dto.token));

    this.logger.log(`Password reset successful for customer ${customerId}`);
    return { success: true };
  }

  // ══════════════════════════════════════════════════
  //  VERIFY EMAIL
  // ══════════════════════════════════════════════════
  async verifyEmail(token: string): Promise<{ success: boolean }> {
    const customerId = await this.redis.get(VERIFY_KEY(token));
    if (!customerId) {
      throw new BadRequestException('Lien de verification invalide ou expire.');
    }
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { emailVerified: true },
    });
    await this.redis.del(VERIFY_KEY(token));
    this.logger.log(`Email verified for customer ${customerId}`);
    return { success: true };
  }

  async resendVerification(customerId: string): Promise<{ success: boolean }> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new BadRequestException('Compte introuvable');
    if (customer.emailVerified) throw new BadRequestException('Email deja verifie');

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await this.redis.set(VERIFY_KEY(verifyToken), customer.id, VERIFY_TOKEN_TTL);
    const storefrontUrl = this.config.get<string>('storefrontUrl', 'http://localhost:3002');
    const verifyUrl = `${storefrontUrl}/#/verify-email?token=${verifyToken}`;
    await this.mail.sendEmailVerification(customer.email, verifyUrl);
    this.logger.log(`Verification email resent to ${customer.email}`);
    return { success: true };
  }

  // ══════════════════════════════════════════════════
  //  Private helpers
  // ══════════════════════════════════════════════════
  private async generateToken(customerId: string, email: string): Promise<string> {
    return this.jwt.signAsync(
      { customerId, email, type: 'customer' },
      {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: '7d',
      },
    );
  }
}
