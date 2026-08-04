import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LicenseStatus } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';

export interface ForumCustomer {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
}

@Injectable()
export class ForumService {
  private readonly cookieName: string;
  private readonly cookieDomain: string;
  private readonly secret: string;
  private readonly enabled: boolean;
  private readonly customerGroup: string;

  constructor(
    private config: ConfigService,
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {
    this.cookieName = config.get<string>('forum.cookieName', '404_forum_session');
    this.cookieDomain = config.get<string>('forum.cookieDomain', '.404tweaks.tech');
    this.secret =
      config.get<string>('forum.jwtSecret') ||
      config.get<string>('forum.hookSecret') ||
      '';
    this.customerGroup = config.get<string>('forum.customerGroup', '404-customers');
    this.enabled = !!this.secret;
  }

  private async customerHasActiveLicense(customerId: string): Promise<boolean> {
    const orders = await this.prisma.order.findMany({
      where: { customerId, status: 'COMPLETED', licenseId: { not: null } },
      select: { licenseId: true },
    });
    const licenseIds = orders
      .map((o) => o.licenseId)
      .filter((id): id is string => !!id);
    if (!licenseIds.length) return false;

    const now = new Date();
    const active = await this.prisma.license.findFirst({
      where: {
        id: { in: licenseIds },
        status: LicenseStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    return !!active;
  }

  async setSessionCookie(res: Response, customer: ForumCustomer): Promise<void> {
    if (!this.enabled) return;

    const hasLicense = await this.customerHasActiveLicense(customer.id);
    const payload: Record<string, unknown> = {
      id: customer.id,
      username: customer.username,
      email: customer.email,
      ...(customer.avatarUrl ? { picture: customer.avatarUrl } : {}),
      groups: hasLicense ? [this.customerGroup] : [],
    };

    const token = this.jwt.sign(payload, {
      secret: this.secret,
      expiresIn: '7d',
    });
    res.cookie(this.cookieName, token, {
      domain: this.cookieDomain,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  clearSessionCookie(res: Response): void {
    if (!this.enabled) return;
    res.clearCookie(this.cookieName, {
      domain: this.cookieDomain,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
  }
}
