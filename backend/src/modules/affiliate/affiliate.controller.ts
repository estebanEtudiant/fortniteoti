import { Controller, Get, Post, Put, Delete, Body, Query, Param, Req, Res, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { CustomerAuthGuard, AdminAuthGuard } from '../../common/guards/auth.guard';
import { AffiliateService } from './affiliate.service';

class EnrollDto {
  @IsOptional() @IsString() code?: string;
}

class PayoutDto {
  @Type(() => Number) @IsInt() @Min(5000) amountCents: number;
  @IsIn(['crypto_btc', 'crypto_usdt', 'crypto_xmr', 'stripe_balance', 'sepa', 'store_credit']) method: string;
  @IsString() destination: string;
}

class SetTierDto {
  @IsIn(['bronze', 'silver', 'gold', 'diamond']) tier: string;
  @IsOptional() @Type(() => Number) commissionRate?: number;
}

class ReasonDto {
  @IsString() reason: string;
}

class TxHashDto {
  @IsString() txHash: string;
}

// ── Public: referral redirect ──
@Controller('r')
export class ReferralRedirectController {
  private shopUrl: string;

  constructor(private aff: AffiliateService, private config: ConfigService) {
    this.shopUrl = config.get<string>('shopStorefrontUrl', 'https://shop.404tweaks.tech');
  }

  @Get(':code')
  async redirect(@Param('code') code: string, @Req() req: Request, @Res() res: Response) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const ua = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || req.headers['referrer'] || '';

    res.cookie('ref', code.toUpperCase(), {
      maxAge: 30 * 86400_000, httpOnly: false, sameSite: 'lax', path: '/', domain: '.404tweaks.tech',
    });
    res.redirect(302, this.shopUrl);

    setImmediate(() => {
      this.aff.trackClick(code, ip, ua, '/', referer as string).catch(() => {});
    });
  }
}

// ── User endpoints ──
@ApiTags('affiliate')
@Controller('affiliate')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class AffiliateController {
  constructor(private aff: AffiliateService) {}

  @Post('enroll')
  async enroll(@Body() dto: EnrollDto, @Req() req: Request) {
    return this.aff.enroll((req as any).customer.customerId, dto.code);
  }

  @Get('me')
  async me(@Req() req: Request) {
    return this.aff.getMe((req as any).customer.customerId);
  }

  @Get('clicks')
  async clicks(@Req() req: Request, @Query('days') days?: string, @Query('limit') limit?: string) {
    return this.aff.getClicks(
      (req as any).customer.customerId,
      Math.min(90, parseInt(days || '30') || 30),
      Math.min(500, parseInt(limit || '100') || 100),
    );
  }

  @Get('conversions')
  async conversions(@Req() req: Request, @Query('status') status?: string, @Query('limit') limit?: string) {
    return this.aff.getConversions(
      (req as any).customer.customerId, status,
      Math.min(200, parseInt(limit || '50') || 50),
    );
  }

  @Post('payout')
  async payout(@Body() dto: PayoutDto, @Req() req: Request) {
    return this.aff.requestPayout(
      (req as any).customer.customerId, dto.amountCents, dto.method, dto.destination,
    );
  }

  @Get('payouts')
  async payouts(@Req() req: Request, @Query('limit') limit?: string) {
    return this.aff.getPayouts(
      (req as any).customer.customerId,
      Math.min(200, parseInt(limit || '50') || 50),
    );
  }
}

// ── Admin endpoints ──
@ApiTags('affiliate-admin')
@Controller('admin/affiliate')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AffiliateAdminController {
  constructor(private aff: AffiliateService) {}

  @Get('list')
  async list(@Query('tier') tier?: string, @Query('status') status?: string, @Query('sortBy') sortBy?: string) {
    return this.aff.adminList({ tier, status, sortBy });
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(@Param('id') id: string, @Body() dto: ReasonDto) {
    return this.aff.adminSuspend(id, dto.reason);
  }

  @Post(':id/unsuspend')
  @HttpCode(HttpStatus.OK)
  async unsuspend(@Param('id') id: string) {
    return this.aff.adminUnsuspend(id);
  }

  @Post(':id/set-tier')
  @HttpCode(HttpStatus.OK)
  async setTier(@Param('id') id: string, @Body() dto: SetTierDto) {
    return this.aff.adminSetTier(id, dto.tier, dto.commissionRate);
  }

  @Get('conversions')
  async conversions(@Query('status') status?: string) {
    return this.aff.adminListConversions(status);
  }

  @Post('conversions/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveConversion(@Param('id') id: string) {
    return this.aff.adminApproveConversion(id);
  }

  @Post('conversions/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectConversion(@Param('id') id: string, @Body() dto: ReasonDto) {
    return this.aff.adminRejectConversion(id, dto.reason);
  }

  @Get('payouts')
  async payouts(@Query('status') status?: string) {
    return this.aff.adminListPayouts(status);
  }

  @Post('payouts/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approvePayout(@Param('id') id: string) {
    return this.aff.adminApprovePayout(id);
  }

  @Post('payouts/:id/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markPaid(@Param('id') id: string, @Body() dto: TxHashDto) {
    return this.aff.adminMarkPaid(id, dto.txHash);
  }

  @Post('payouts/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectPayout(@Param('id') id: string, @Body() dto: ReasonDto) {
    return this.aff.adminRejectPayout(id, dto.reason);
  }

  @Get('tier-config')
  async getTierConfig() {
    return this.aff.getTierConfig();
  }

  @Put('tier-config')
  @HttpCode(HttpStatus.OK)
  async updateTierConfig(@Body() body: any) {
    return this.aff.updateTierConfig(body.tiers, body.minPayout);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteAffiliate(@Param('id') id: string) {
    await this.aff.adminDeleteAffiliate(id);
    return { success: true };
  }

  @Delete('conversions/:id')
  @HttpCode(HttpStatus.OK)
  async deleteConversion(@Param('id') id: string) {
    await this.aff.adminDeleteConversion(id);
    return { success: true };
  }

  @Delete('payouts/:id')
  @HttpCode(HttpStatus.OK)
  async deletePayout(@Param('id') id: string) {
    await this.aff.adminDeletePayout(id);
    return { success: true };
  }
}
