import {
  Injectable, UnauthorizedException, ForbiddenException,
  BadRequestException, Logger, HttpException, HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LicenseStatus, ActivationStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { hashHwid, hashToken, generateSecureToken, safeCompare } from '../../common/utils/crypto.utils';
import { ActivateDto, HeartbeatDto, RefreshTokenDto, ActivationResponse, HeartbeatResponse } from './auth.dto';
import { JwtPayload } from '../../common/guards/auth.guard';
import { ResellerService } from '../reseller/reseller.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly hwidSalt: string;
  private readonly bruteForceMax: number;
  private readonly bruteForceBlockDuration: number;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwt: JwtService,
    private config: ConfigService,
    private resellerService: ResellerService,
  ) {
    this.hwidSalt = config.get<string>('hwid.salt', '');
    this.bruteForceMax = config.get<number>('rateLimit.bruteForceMax', 10);
    this.bruteForceBlockDuration = config.get<number>('rateLimit.bruteForceBlockDuration', 600);
  }

  // ══════════════════════════════════════════════════
  //  ACTIVATION — Core endpoint
  // ══════════════════════════════════════════════════
  async activate(dto: ActivateDto, ip: string, userAgent: string): Promise<ActivationResponse> {
    // ── 1. Anti-replay check ──
    const requestAge = Math.abs(Date.now() - dto.timestamp);
    if (requestAge > 60_000) { // 60 sec tolerance
      throw new BadRequestException('Request expired (timestamp too old)');
    }

    if (await this.redis.isNonceUsed(dto.nonce)) {
      throw new BadRequestException('Replay detected (nonce already used)');
    }

    // ── 2. Brute force check ──
    if (await this.redis.isIpBlocked(ip)) {
      throw new HttpException('IP blocked due to too many failed attempts', HttpStatus.TOO_MANY_REQUESTS);
    }

    // ── 3. Find the license ──
    const license = await this.prisma.license.findUnique({
      where: { licenseKey: dto.key },
    });

    if (!license) {
      await this.handleFailedAttempt(ip, dto.key, 'INVALID_KEY');
      throw new UnauthorizedException('Invalid license key');
    }

    // ── 4. Check product match (if client declares expected product) ──
    if (dto.product && license.product !== dto.product) {
      await this.logActivation(license.id, ActivationStatus.BANNED, ip, dto, userAgent);
      throw new ForbiddenException('mauvais produit pour cette cle');
    }

    // ── 5. Check license status ──
    if (license.status === LicenseStatus.BANNED) {
      await this.logActivation(license.id, ActivationStatus.BANNED, ip, dto, userAgent);
      throw new ForbiddenException('License has been banned');
    }

    if (license.status === LicenseStatus.EXPIRED) {
      await this.logActivation(license.id, ActivationStatus.EXPIRED, ip, dto, userAgent);
      throw new ForbiddenException('License has expired');
    }

    // ── 5. Check expiry date ──
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: LicenseStatus.EXPIRED },
      });
      await this.logActivation(license.id, ActivationStatus.EXPIRED, ip, dto, userAgent);
      throw new ForbiddenException('License has expired');
    }

    // ── 6. HWID Binding ──
    const serverHwid = hashHwid(dto.hwid, this.hwidSalt);

    if (!license.hwid) {
      // First activation → Bind HWID
      await this.prisma.license.update({
        where: { id: license.id },
        data: {
          hwid: serverHwid,
          hwidBoundAt: new Date(),
          activationCount: { increment: 1 },
          lastIp: ip,
        },
      });
      this.logger.log(`License ${this.maskKey(dto.key)} bound to HWID [first activation]`);

    } else if (!safeCompare(license.hwid, serverHwid)) {
      // HWID mismatch → Reject
      await this.logActivation(license.id, ActivationStatus.HWID_MISMATCH, ip, dto, userAgent);
      await this.handleFailedAttempt(ip, dto.key, 'HWID_MISMATCH');
      throw new ForbiddenException('License is bound to a different machine. Contact support for HWID reset.');

    } else {
      // Same HWID → Allow, update counters
      await this.prisma.license.update({
        where: { id: license.id },
        data: {
          activationCount: { increment: 1 },
          lastIp: ip,
          lastHeartbeat: new Date(),
        },
      });
    }

    // ── 6b. Reseller anti-fraud: block reseller from activating their own keys ──
    if (license.resellerId) {
      await this.resellerService.checkResellerActivation(license.resellerId, serverHwid);
    }

    // ── 7. Generate tokens ──
    const accessToken = await this.generateAccessToken(license.id, dto.key, serverHwid);
    const refreshToken = await this.generateRefreshToken(license.id);
    const offlineToken = this.generateOfflineToken(license.id, serverHwid, license.expiresAt);

    // ── 8. Log success ──
    await this.logActivation(license.id, ActivationStatus.SUCCESS, ip, dto, userAgent);
    await this.redis.clearFailedAttempts(ip);

    this.logger.log(`License ${this.maskKey(dto.key)} activated from ${ip}`);

    return {
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 min in seconds
      licenseExpiresAt: license.expiresAt?.toISOString() || null,
      plan: license.plan,
      offlineToken,
    };
  }

  // ══════════════════════════════════════════════════
  //  HEARTBEAT — Periodic check
  // ══════════════════════════════════════════════════
  async heartbeat(licensePayload: JwtPayload, dto: HeartbeatDto, ip: string): Promise<HeartbeatResponse> {
    const serverHwid = hashHwid(dto.hwid, this.hwidSalt);

    // Verify HWID matches the token
    if (!safeCompare(licensePayload.hwid, serverHwid)) {
      throw new ForbiddenException('HWID mismatch during heartbeat');
    }

    const license = await this.prisma.license.findUnique({
      where: { id: licensePayload.sub },
    });

    if (!license) {
      throw new UnauthorizedException('License not found');
    }

    // Check if banned since last heartbeat
    if (license.status === LicenseStatus.BANNED) {
      return { success: false, status: 'banned', serverTime: new Date().toISOString() };
    }

    // Check if expired
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: LicenseStatus.EXPIRED },
      });
      return { success: false, status: 'expired', serverTime: new Date().toISOString() };
    }

    // Update last heartbeat
    await this.prisma.license.update({
      where: { id: license.id },
      data: { lastHeartbeat: new Date(), lastIp: ip },
    });

    return { success: true, status: 'active', serverTime: new Date().toISOString() };
  }

  // ══════════════════════════════════════════════════
  //  REFRESH — Get new access token
  // ══════════════════════════════════════════════════
  async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string; expiresIn: number }> {
    const tokenHash = hashToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { license: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (storedToken.license.status !== LicenseStatus.ACTIVE) {
      throw new ForbiddenException('License is no longer active');
    }

    const accessToken = await this.generateAccessToken(
      storedToken.license.id,
      storedToken.license.licenseKey,
      storedToken.license.hwid || '',
    );

    return { accessToken, expiresIn: 900 };
  }

  // ══════════════════════════════════════════════════
  //  Private helpers
  // ══════════════════════════════════════════════════

  private async generateAccessToken(licenseId: string, key: string, hwid: string): Promise<string> {
    const payload: JwtPayload = {
      sub: licenseId,
      key: this.maskKey(key),
      hwid,
      type: 'access',
    };

    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.secret'),
      expiresIn: this.config.get<string>('jwt.accessExpiry', '15m'),
    });
  }

  private async generateRefreshToken(licenseId: string): Promise<string> {
    const token = generateSecureToken(48);
    const tokenHash = hashToken(token);

    // Revoke any existing refresh tokens for this license
    await this.prisma.refreshToken.updateMany({
      where: { licenseId, revoked: false },
      data: { revoked: true },
    });

    // Store new refresh token (hashed)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: { licenseId, tokenHash, expiresAt },
    });

    return token; // Return plaintext to client (only time it's visible)
  }

  private generateOfflineToken(licenseId: string, hwid: string, expiresAt: Date | null): string {
    // Offline token: matches the license expiry (no arbitrary 24h limit)
    // For LIFETIME licenses, use 365 days as the offline token duration
    const maxOffline = new Date();
    maxOffline.setFullYear(maxOffline.getFullYear() + 1); // 1 year max

    const effectiveExpiry = expiresAt && expiresAt < maxOffline ? expiresAt : maxOffline;

    // Calculate expiry in seconds for JWT
    const expiresInSeconds = Math.max(
      Math.floor((effectiveExpiry.getTime() - Date.now()) / 1000),
      3600, // minimum 1 hour
    );

    return this.jwt.sign(
      {
        sub: licenseId,
        hwid,
        type: 'offline',
        validUntil: effectiveExpiry.toISOString(),
      },
      {
        secret: this.config.get<string>('offlineTokenKey'),
        expiresIn: expiresInSeconds,
      },
    );
  }

  private async handleFailedAttempt(ip: string, key: string, reason: string): Promise<void> {
    const attempts = await this.redis.recordFailedAttempt(ip);
    this.logger.warn(`Failed activation: key=${this.maskKey(key)} ip=${ip} reason=${reason} attempts=${attempts}`);

    if (attempts >= this.bruteForceMax) {
      await this.redis.blockIp(ip, this.bruteForceBlockDuration);
      this.logger.warn(`IP ${ip} BLOCKED after ${attempts} failed attempts`);
    }
  }

  private async logActivation(
    licenseId: string, status: ActivationStatus,
    ip: string, dto: ActivateDto, userAgent: string,
  ): Promise<void> {
    await this.prisma.activation.create({
      data: {
        licenseId,
        hwid: dto.hwid,
        ipAddress: ip,
        machineInfo: dto.machineInfo || undefined,
        userAgent,
        status,
      },
    });

    await this.prisma.activationLog.create({
      data: {
        licenseId,
        action: `activation:${status.toLowerCase()}`,
        ipAddress: ip,
        details: { hwid: dto.hwid.substring(0, 8) + '...', nonce: dto.nonce },
      },
    });
  }

  private maskKey(key: string): string {
    if (key.length < 10) return '***';
    return key.substring(0, 5) + '-*****-*****-*****-' + key.substring(key.length - 5);
  }
}
