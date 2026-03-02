import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req,
  UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { Request } from 'express';
import { LicensePlan, LicenseStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { LicenseService } from '../license/license.service';
import { AdminAuthGuard } from '../../common/guards/auth.guard';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max,
  IsBoolean, IsNumber, MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── DTOs ──
class LoginDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() password: string;
}
class CreateLicenseBody {
  @IsEnum(LicensePlan) plan: LicensePlan;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650) customDays?: number;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() discordId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10) maxActivations?: number;
}
class GenerateBatchBody {
  @IsEnum(LicensePlan) plan: LicensePlan;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650) customDays?: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(500) count: number;
}
class BanBody {
  @IsString() @IsNotEmpty() reason: string;
}
class ExtendBody {
  @IsInt() @Min(1) @Max(3650) days: number;
}
class UpdatePlanBody {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsNumber() originalPrice?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() popular?: boolean;
  @IsOptional() @IsString() stripePrice?: string;
  @IsOptional() @IsString() description?: string;
}
class CreatePlanBody {
  @IsString() key: string;
  @IsString() name: string;
  @IsNumber() price: number;
  @IsOptional() @IsNumber() originalPrice?: number;
  @IsOptional() @IsBoolean() popular?: boolean;
  @IsOptional() @IsString() stripePrice?: string;
  @IsOptional() @IsString() description?: string;
}
class TrackPageviewDto {
  @IsString() @IsNotEmpty() path: string;
  @IsOptional() @IsString() sessionId?: string;
}
class UpdateSettingsBody {
  @IsOptional() @IsString() downloadUrl?: string;
  @IsOptional() @IsBoolean() maintenanceMode?: boolean;
  @IsOptional() @IsString() announcement?: string;
  @IsOptional() @IsString() screenshotUrl?: string;
  @IsOptional() @IsString() discordInviteUrl?: string;
}
class ChangePasswordBody {
  @IsString() @IsNotEmpty() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}
class UpdateBotConfigBody {
  @IsOptional() @IsString() welcome_channel_title?: string;
  @IsOptional() @IsString() welcome_channel_desc?: string;
  @IsOptional() @IsString() welcome_dm_title?: string;
  @IsOptional() @IsString() welcome_dm_desc?: string;
  @IsOptional() @IsString() setup_avis_title?: string;
  @IsOptional() @IsString() setup_avis_desc?: string;
  @IsOptional() @IsString() tuto_title?: string;
  @IsOptional() @IsString() tuto_intro?: string;
}
class CreatePromoCodeBody {
  @IsString() @IsNotEmpty() code: string;
  @IsEnum(['percent', 'fixed']) type: 'percent' | 'fixed';
  @IsNumber() @Min(1) amount: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxUses?: number;
  @IsOptional() @IsString() stripeId?: string;
}

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private licenseService: LicenseService,
  ) {}

  // ── Auth ──
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 5, window: 60, keyPrefix: 'admin-login' })
  async login(@Body() dto: LoginDto) {
    return this.adminService.login(dto);
  }

  @Put('password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordBody) {
    const { adminId } = (req as any).admin;
    await this.adminService.changeAdminPassword(adminId, dto.currentPassword, dto.newPassword);
    return { success: true };
  }

  // ── Stats ──
  @Get('stats')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dashboard statistics' })
  async getStats() {
    return this.adminService.getEnhancedStats();
  }

  // ── Analytics ──
  @Get('analytics')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detailed analytics charts' })
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  // ── Activity tracking (public — called by storefront) ──
  @Post('track/pageview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track a pageview (public, no auth)' })
  async trackPageview(@Body() dto: TrackPageviewDto) {
    await this.adminService.trackPageview(dto.path, dto.sessionId);
    return { ok: true };
  }

  // ── Activity stats (admin) ──
  @Get('activity')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Site activity: pageviews, unique visitors, top pages, active now' })
  async getActivity() {
    return this.adminService.getActivityStats();
  }

  // ── Licenses ──
  @Get('licenses')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async listLicenses(
    @Query('status') status?: LicenseStatus,
    @Query('plan') plan?: LicensePlan,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.licenseService.findAll({ status, plan, search, page, limit });
  }

  @Get('licenses/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async getLicense(@Param('id') id: string) {
    return this.licenseService.findOne(id);
  }

  @Post('licenses')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async createLicense(@Body() dto: CreateLicenseBody) {
    return this.licenseService.create(dto);
  }

  @Post('licenses/batch')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async generateBatch(@Body() dto: GenerateBatchBody) {
    const keys = await this.licenseService.generateBatch(dto);
    return { success: true, count: keys.length, keys };
  }

  @Put('licenses/:id/ban')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async banLicense(@Param('id') id: string, @Body() dto: BanBody) {
    return this.licenseService.ban(id, dto.reason);
  }

  @Put('licenses/:id/unban')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async unbanLicense(@Param('id') id: string) {
    return this.licenseService.unban(id);
  }

  @Put('licenses/:id/reset-hwid')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async resetHwid(@Param('id') id: string) {
    return this.licenseService.resetHwid(id);
  }

  @Put('licenses/:id/extend')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async extendLicense(@Param('id') id: string, @Body() dto: ExtendBody) {
    return this.licenseService.extend(id, dto.days);
  }

  @Delete('licenses/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLicense(@Param('id') id: string) {
    await this.licenseService.delete(id);
  }

  // ── Customers ──
  @Get('customers')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async listCustomers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.listCustomers(page, limit, search);
  }

  @Get('customers/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async getCustomer(@Param('id') id: string) {
    return this.adminService.getCustomer(id);
  }

  @Put('customers/:id/ban')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async banCustomer(@Param('id') id: string) {
    return this.adminService.banCustomer(id);
  }

  @Put('customers/:id/unban')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async unbanCustomer(@Param('id') id: string) {
    return this.adminService.unbanCustomer(id);
  }

  @Delete('customers/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCustomer(@Param('id') id: string) {
    await this.adminService.deleteCustomer(id);
  }

  @Post('customers/:id/send-reset')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async sendPasswordReset(@Param('id') id: string) {
    return this.adminService.sendPasswordResetToCustomer(id);
  }

  @Post('customers/:id/revoke-licenses')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async revokeCustomerLicenses(@Param('id') id: string) {
    return this.adminService.revokeCustomerLicenses(id);
  }

  // ── Orders ──
  @Get('orders')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all orders' })
  async listOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
  ) {
    return this.adminService.listOrders(page, limit, status, plan);
  }

  // ── Plans ──
  @Get('plans')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async getPlans() {
    return this.adminService.getPlans();
  }

  @Post('plans')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async createPlan(@Body() dto: CreatePlanBody) {
    return this.adminService.createPlan(dto.key, dto);
  }

  @Put('plans/:plan')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async updatePlan(@Param('plan') plan: string, @Body() dto: UpdatePlanBody) {
    return this.adminService.updatePlan(plan, dto);
  }

  @Delete('plans/:plan')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async deletePlan(@Param('plan') plan: string) {
    return this.adminService.deletePlan(plan);
  }

  // ── Public settings (no auth — used by storefront) ──
  @Get('public-settings')
  @ApiOperation({ summary: 'Public site settings (screenshotUrl, discordInviteUrl, announcement)' })
  async getPublicSettings() {
    const s = await this.adminService.getSettings();
    return {
      screenshotUrl:    s.screenshotUrl    || '',
      discordInviteUrl: s.discordInviteUrl || '',
      announcement:     s.announcement     || '',
      maintenanceMode:  s.maintenanceMode  || false,
    };
  }

  // ── Settings ──
  @Get('settings')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get site settings' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update site settings' })
  async updateSettings(@Body() dto: UpdateSettingsBody) {
    return this.adminService.updateSettings(dto);
  }

  // ── Image upload ──
  @Post('upload-image')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload an image to /uploads/images/' })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = resolve(__dirname, '..', '..', '..', 'uploads', 'images');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        cb(null, `img-${unique}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      if (!allowed.includes(extname(file.originalname).toLowerCase())) {
        return cb(new BadRequestException('Format non supporté (jpg, png, webp, gif)'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host  = (req.headers['x-forwarded-host'] as string)  || req.get('host');
    return { url: `${proto}://${host}/uploads/images/${file.filename}` };
  }

  // ── Blocked IPs ──
  @Get('blocked-ips')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List blocked IPs' })
  async listBlockedIps(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listBlockedIps(page, limit);
  }

  @Delete('blocked-ips/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblockIp(@Param('id') id: string) {
    await this.adminService.unblockIp(id);
  }

  // ── Logs ──
  @Get('logs')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async getLogs(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getActivationLogs(page, limit);
  }

  // ── Reviews ──
  @Get('reviews')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async getReviews() {
    return this.adminService.getReviews();
  }

  @Delete('reviews/:discordId')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async deleteReview(@Param('discordId') discordId: string) {
    return this.adminService.deleteReview(discordId);
  }

  // ── Promo Codes ──
  @Get('promo-codes')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async getPromoCodes() {
    return this.adminService.getPromoCodes();
  }

  @Post('promo-codes')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  async createPromoCode(@Body() dto: CreatePromoCodeBody) {
    return this.adminService.createPromoCode(dto);
  }

  @Delete('promo-codes/:code')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async deletePromoCode(@Param('code') code: string) {
    return this.adminService.deletePromoCode(code);
  }

  @Put('promo-codes/:code/toggle')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async togglePromoCode(@Param('code') code: string, @Body() body: { active: boolean }) {
    return this.adminService.togglePromoCode(code, body.active);
  }

  // ── Bot Config ──
  @Get('bot-config')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async getBotConfig() {
    return this.adminService.getBotConfig();
  }

  @Put('bot-config')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async updateBotConfig(@Body() dto: UpdateBotConfigBody) {
    return this.adminService.updateBotConfig(dto);
  }
}