import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Res,
  UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { mkdirSync, existsSync, readdirSync, unlinkSync, statSync, createReadStream } from 'fs';
import { Request, Response } from 'express';
import { LicensePlan, LicenseStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { LicenseService } from '../license/license.service';
import { BotNotifyService } from '../bot/bot-notify.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { AdminAuthGuard } from '../../common/guards/auth.guard';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max,
  IsBoolean, IsNumber, MinLength, MaxLength, IsArray, ValidateNested, ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// Gallery categories whitelist (folder under /var/www/uploads/gallery/)
const GALLERY_FOLDERS = ['ftn', 'ng', 'shop', 'pokemon'];
function galleryFolder(type: string): string {
  return GALLERY_FOLDERS.includes(type) ? type : 'ftn';
}

  //
class LoginDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() password: string;
  @IsOptional() @IsString() totp?: string;
}
class Enable2faBody {
  @IsString() @IsNotEmpty() code: string;
}
class Disable2faBody {
  @IsString() @IsNotEmpty() password: string;
  @IsOptional() @IsString() code?: string;
}
class CreateLicenseBody {
  @IsEnum(LicensePlan) plan: LicensePlan;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650) customDays?: number;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() discordId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10) maxActivations?: number;
  @IsOptional() @IsString() product?: string;
  @IsOptional() @IsBoolean() startOnActivation?: boolean;
}
class GenerateBatchBody {
  @IsEnum(LicensePlan) plan: LicensePlan;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650) customDays?: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(500) count: number;
  @IsOptional() @IsString() product?: string;
  @IsOptional() @IsBoolean() startOnActivation?: boolean;
}
class BanBody {
  @IsString() @IsNotEmpty() reason: string;
}
class ExtendBody {
  @IsInt() @Min(1) @Max(3650) days: number;
}
class BulkExtendBody {
  @IsInt() @Min(1) @Max(3650) days: number;
  @IsOptional() @IsString() product?: string;
  @IsOptional() @IsEnum(LicenseStatus) status?: LicenseStatus;
  @IsOptional() @IsEnum(LicensePlan) plan?: LicensePlan;
}
class UpdatePlanBody {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsNumber() originalPrice?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() popular?: boolean;
  @IsOptional() @IsString() stripePrice?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(LicensePlan) licensePlan?: LicensePlan;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650) customDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsString() badgeText?: string;
  @IsOptional() @IsString() ctaText?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsString() themeColor?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
class CreatePlanBody {
  @IsString() key: string;
  @IsString() name: string;
  @IsNumber() price: number;
  @IsOptional() @IsNumber() originalPrice?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() popular?: boolean;
  @IsOptional() @IsString() stripePrice?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(LicensePlan) licensePlan?: LicensePlan;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650) customDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsString() badgeText?: string;
  @IsOptional() @IsString() ctaText?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsString() themeColor?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
class TrackPageviewDto {
  @IsString() @IsNotEmpty() path: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() userAgent?: string;
  @IsOptional() @IsString() referrer?: string;
  @IsOptional() @IsString() language?: string;
}
class UpdateSettingsBody {
  @IsOptional() @IsString() downloadUrl?: string;
  @IsOptional() @IsBoolean() maintenanceMode?: boolean;
  @IsOptional() @IsString() announcement?: string;
  @IsOptional() @IsString() announcementColor?: string;
  @IsOptional() @IsString() announcementIcon?: string;
  @IsOptional() @IsString() announcementLabel?: string;
  @IsOptional() @IsBoolean() announcementDismissible?: boolean;
  @IsOptional() @IsString() announcementLink?: string;
  @IsOptional() @IsString() announcementLinkText?: string;
  @IsOptional() @IsString() screenshotUrl?: string;
  @IsOptional() @IsString() screenshotUrls?: string;
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
  @IsOptional() @IsString() update_channel_id?: string;
  @IsOptional() @IsString() update_title?: string;
  @IsOptional() @IsString() update_message?: string;
  @IsOptional() @IsString() update_image_url?: string;
  @IsOptional() @IsBoolean() update_mention_everyone?: boolean;
}
class EmbedFieldBody {
  @IsString() @IsNotEmpty() @MaxLength(256) name: string;
  @IsString() @IsNotEmpty() @MaxLength(1024) value: string;
  @IsOptional() @IsBoolean() inline?: boolean;
}
class SaveUpdateTemplateBody {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() channelId: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() authorName?: string;
  @IsOptional() @IsString() authorIconUrl?: string;
  @IsOptional() @IsString() authorUrl?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(25) @ValidateNested({ each: true }) @Type(() => EmbedFieldBody) fields?: EmbedFieldBody[];
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() footerText?: string;
  @IsOptional() @IsString() footerIconUrl?: string;
  @IsOptional() @IsBoolean() showTimestamp?: boolean;
  @IsOptional() @IsBoolean() mentionEveryone?: boolean;
}
class AnnounceUpdateBody {
  @IsString() @IsNotEmpty() channelId: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() authorName?: string;
  @IsOptional() @IsString() authorIconUrl?: string;
  @IsOptional() @IsString() authorUrl?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(25) @ValidateNested({ each: true }) @Type(() => EmbedFieldBody) fields?: EmbedFieldBody[];
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() footerText?: string;
  @IsOptional() @IsString() footerIconUrl?: string;
  @IsOptional() @IsBoolean() showTimestamp?: boolean;
  @IsOptional() @IsBoolean() mentionEveryone?: boolean;
}
class CreatePromoCodeBody {
  @IsString() @IsNotEmpty() code: string;
  @IsEnum(['percent', 'fixed']) type: 'percent' | 'fixed';
  @IsNumber() @Min(1) amount: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxUses?: number;
  @IsOptional() @IsString() stripeId?: string;
}
class AddCustomerLicenseBody {
  @IsEnum(LicensePlan) plan: LicensePlan;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650) customDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10) maxActivations?: number;
  @IsOptional() @IsBoolean() sendEmail?: boolean;
}
class AttachExistingLicenseBody {
  @IsString() @IsNotEmpty() licenseKey: string;
  @IsOptional() @IsBoolean() sendEmail?: boolean;
}

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private licenseService: LicenseService,
    private botNotify: BotNotifyService,
    private telemetry: TelemetryService,
  ) {}

  //
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

  // ── 2FA (TOTP) ──
  @Get('2fa/status')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get 2FA (TOTP) status for the current admin' })
  async get2faStatus(@Req() req: Request) {
    return this.adminService.get2faStatus((req as any).admin.adminId);
  }

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a TOTP secret + QR code (pending, not yet enabled)' })
  async setup2fa(@Req() req: Request) {
    return this.adminService.setup2fa((req as any).admin.adminId);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm a code and enable 2FA' })
  async enable2fa(@Req() req: Request, @Body() dto: Enable2faBody) {
    return this.adminService.enable2fa((req as any).admin.adminId, dto.code);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA (requires password + current code)' })
  async disable2fa(@Req() req: Request, @Body() dto: Disable2faBody) {
    return this.adminService.disable2fa((req as any).admin.adminId, dto.password, dto.code ?? '');
  }

  //
  @Get('stats')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dashboard statistics' })
  async getStats() {
    return this.adminService.getEnhancedStats();
  }

  //
  @Get('analytics')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detailed analytics charts' })
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  //
  @Post('track/pageview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track a pageview (public, no auth)' })
  async trackPageview(@Body() dto: TrackPageviewDto) {
    await this.adminService.trackPageview(dto.path, dto.sessionId, dto.userAgent, dto.referrer, dto.language);
    return { ok: true };
  }

  //
  @Get('activity')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Site activity: pageviews, unique visitors, top pages, active now' })
  async getActivity() {
    return this.adminService.getActivityStats();
  }

  //
  @Get('activity/minecraft')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Minecraft/loader activity: online clients, live sessions, per-server stats, connection feed' })
  async getMinecraftActivity() {
    return this.adminService.getMinecraftActivity();
  }

  //
  @Get('licenses')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async listLicenses(
    @Query('status') status?: LicenseStatus,
    @Query('plan') plan?: LicensePlan,
    @Query('product') product?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.licenseService.findAll({ status, plan, product, search, page, limit });
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
    const VALID_PRODUCTS = ['FTN_OPTIMIZER', 'NG_LOADER', 'NG_LAUNCHER', 'NG_RECUBE_CLIENT', 'MENORIA', 'LOADER', 'VELTHAR_LOADER', 'FORTNITE_CLIENT', 'MARVEL_RIVALS_CLIENT', 'RUST_CLIENT'];
    return this.licenseService.create({
      ...dto,
      product: (VALID_PRODUCTS.includes(dto.product!) ? dto.product : 'FTN_OPTIMIZER') as any,
    });
  }

  @Post('licenses/batch')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async generateBatch(@Body() dto: GenerateBatchBody) {
    const VALID_PRODUCTS = ['FTN_OPTIMIZER', 'NG_LOADER', 'NG_LAUNCHER', 'NG_RECUBE_CLIENT', 'MENORIA', 'LOADER', 'VELTHAR_LOADER', 'FORTNITE_CLIENT', 'MARVEL_RIVALS_CLIENT', 'RUST_CLIENT'];
    const keys = await this.licenseService.generateBatch({
      ...dto,
      product: (VALID_PRODUCTS.includes(dto.product!) ? dto.product : 'FTN_OPTIMIZER') as any,
    });
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

  @Post('licenses/bulk-extend')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk extend licenses by product/status/plan' })
  async bulkExtendLicenses(@Body() dto: BulkExtendBody) {
    return this.licenseService.bulkExtend(dto.days, {
      product: dto.product,
      status: dto.status,
      plan: dto.plan,
    });
  }

  @Delete('licenses/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLicense(@Param('id') id: string) {
    await this.licenseService.delete(id);
  }

  //
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
  @Post('customers/:id/licenses')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  async addLicenseToCustomer(
    @Param('id') id: string,
    @Body() dto: AddCustomerLicenseBody,
  ) {
    return this.adminService.addLicenseToCustomer(id, dto);
  }

  @Post('customers/:id/licenses/attach')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async attachExistingLicenseToCustomer(
    @Param('id') id: string,
    @Body() dto: AttachExistingLicenseBody,
  ) {
    return this.adminService.attachExistingLicenseToCustomer(id, dto);
  }

  //
  @Get('orders')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all orders' })
  async listOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listOrders(page, limit, status, plan, search);
  }

  //
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

  // -- NG Plans --
  @Get('ng-plans')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async getNgPlans() {
    return this.adminService.getNgPlans();
  }

  @Post('ng-plans')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async createNgPlan(@Body() dto: CreatePlanBody) {
    return this.adminService.createNgPlan(dto.key, dto);
  }

  @Put('ng-plans/:plan')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async updateNgPlan(@Param('plan') plan: string, @Body() dto: UpdatePlanBody) {
    return this.adminService.updateNgPlan(plan, dto);
  }

  @Delete('ng-plans/:plan')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async deleteNgPlan(@Param('plan') plan: string) {
    return this.adminService.deleteNgPlan(plan);
  }

  // -- Menoria Plans --
  @Get('menoria-plans')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async getMenoriaPlans() {
    return this.adminService.getMenoriaPlans();
  }

  @Post('menoria-plans')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async createMenoriaPlan(@Body() dto: CreatePlanBody) {
    return this.adminService.createMenoriaPlan(dto.key, dto);
  }

  @Put('menoria-plans/:plan')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async updateMenoriaPlan(@Param('plan') plan: string, @Body() dto: UpdatePlanBody) {
    return this.adminService.updateMenoriaPlan(plan, dto);
  }

  @Delete('menoria-plans/:plan')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async deleteMenoriaPlan(@Param('plan') plan: string) {
    return this.adminService.deleteMenoriaPlan(plan);
  }

  // -- Velthar Plans --
  @Get('velthar-plans')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async getVeltharPlans() {
    return this.adminService.getVeltharPlans();
  }

  @Post('velthar-plans')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async createVeltharPlan(@Body() dto: CreatePlanBody) {
    return this.adminService.createVeltharPlan(dto.key, dto);
  }

  @Put('velthar-plans/:plan')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async updateVeltharPlan(@Param('plan') plan: string, @Body() dto: UpdatePlanBody) {
    return this.adminService.updateVeltharPlan(plan, dto);
  }

  @Delete('velthar-plans/:plan')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async deleteVeltharPlan(@Param('plan') plan: string) {
    return this.adminService.deleteVeltharPlan(plan);
  }

  // -- Public settings --
  @Get('public-gallery')
  @ApiOperation({ summary: 'Public gallery images (no auth)' })
  async getPublicGallery(@Query('type') type: string) {
    const folder = galleryFolder(type);
    const dir = `/var/www/uploads/gallery/${folder}`;
    if (!existsSync(dir)) return { images: [] };
    const images = readdirSync(dir)
      .filter(f => ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extname(f).toLowerCase()))
      .map(f => `https://404tweaks.tech/uploads/gallery/${folder}/${f}`)
      .sort();
    return { images };
  }

  @Get('public-settings')
  @ApiOperation({ summary: 'Public site settings (screenshotUrl, discordInviteUrl, announcement)' })
  async getPublicSettings() {
    const s = await this.adminService.getSettings();
    return {
      screenshotUrl:     s.screenshotUrl     || '',
      screenshotUrls:    s.screenshotUrls    || '',
      discordInviteUrl:  s.discordInviteUrl  || '',
      announcement:            s.announcement            || '',
      announcementColor:       s.announcementColor       || 'orange',
      announcementIcon:        s.announcementIcon        || 'fa-fire',
      announcementLabel:       s.announcementLabel       || 'Annonce',
      announcementDismissible: s.announcementDismissible ?? true,
      announcementLink:        s.announcementLink        || '',
      announcementLinkText:    s.announcementLinkText    || 'En savoir plus',
      maintenanceMode:         s.maintenanceMode         || false,
    };
  }

  //
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

  //
  // Gallery management endpoints
  @Get('gallery')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List gallery images for ftn or ng' })
  async listGallery(@Query('type') type: string) {
    const folder = galleryFolder(type);
    const dir = `/var/www/uploads/gallery/${folder}`;
    if (!existsSync(dir)) return { images: [] };
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const { extname: pExtname } = require('path');
    const images = readdirSync(dir)
      .filter(f => allowed.includes(pExtname(f).toLowerCase()))
      .map(f => {
        const st = statSync(`${dir}/${f}`);
        return {
          filename: f,
          url: `https://404tweaks.tech/uploads/gallery/${folder}/${f}`,
          size: st.size,
          createdAt: st.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { images };
  }

  @Post('gallery/upload')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload an image to gallery folder (ftn or ng)' })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, _file, cb) => {
        const folder = galleryFolder(req.query['type'] as string);
        const dir = `/var/www/uploads/gallery/${folder}`;
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        cb(null, `gallery-${unique}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      if (!allowed.includes(extname(file.originalname).toLowerCase())) {
        return cb(new BadRequestException('Format non supporte (jpg, png, webp, gif)'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadGalleryImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    const folder = galleryFolder(type);
    return { url: `https://404tweaks.tech/uploads/gallery/${folder}/${file.filename}` };
  }

  @Delete('gallery/:filename')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a gallery image' })
  async deleteGalleryImage(
    @Param('filename') filename: string,
    @Query('type') type: string,
  ) {
    if (filename.includes('..') || filename.includes('/')) {
      throw new BadRequestException('Nom de fichier invalide');
    }
    const folder = galleryFolder(type);
    const filePath = `/var/www/uploads/gallery/${folder}/${filename}`;
    if (!existsSync(filePath)) throw new BadRequestException('Fichier introuvable');
    unlinkSync(filePath);
    return { success: true };
  }

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
        return cb(new BadRequestException('Format non supporte'), false);
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

  //
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

  //
  @Get('logs')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  async getLogs(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getActivationLogs(page, limit);
  }

  //
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

  //
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

  //
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

  @Post('bot-config/announce-update')
  @UseGuards(AdminAuthGuard, RateLimitGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publie une annonce de mise à jour dans le salon Discord configuré' })
  @RateLimit({ max: 10, window: 60, keyPrefix: 'admin-announce-update' })
  async announceUpdate(@Body() dto: AnnounceUpdateBody) {
    await this.botNotify.notifyUpdate(dto);
    await this.adminService.updateBotConfig({
      update_channel_id:       dto.channelId,
      update_title:            dto.title ?? '',
      update_message:          dto.message ?? '',
      update_image_url:        dto.imageUrl ?? '',
      update_mention_everyone: dto.mentionEveryone ?? true,
    });
    return { success: true };
  }

  @Get('update-templates')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Liste les modèles d'annonces de mise à jour enregistrés" })
  async getUpdateTemplates() {
    return this.adminService.getUpdateTemplates();
  }

  @Post('update-templates')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Enregistre un nouveau modèle d'annonce" })
  async createUpdateTemplate(@Body() dto: SaveUpdateTemplateBody) {
    return this.adminService.saveUpdateTemplate(undefined, dto);
  }

  @Put('update-templates/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Met à jour un modèle existant' })
  async updateUpdateTemplate(@Param('id') id: string, @Body() dto: SaveUpdateTemplateBody) {
    return this.adminService.saveUpdateTemplate(id, dto);
  }

  @Delete('update-templates/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprime un modèle' })
  async deleteUpdateTemplate(@Param('id') id: string) {
    return this.adminService.deleteUpdateTemplate(id);
  }

  // -- Servers --
  @Get('servers')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  getServers() { return this.adminService.getServers(); }

  @Post('servers')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  createServer(@Body() dto: any) { return this.adminService.createServer(dto); }

  @Put('servers/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  updateServer(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateServer(id, dto); }

  @Delete('servers/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  deleteServer(@Param('id') id: string) { return this.adminService.deleteServer(id); }

  // -- Public servers --
  @Get('public/servers')
  @ApiOperation({ summary: 'Public active servers list (no auth)' })
  async getPublicServers() {
    const servers = await this.adminService.getServers();
    return servers.filter(s => s.active);
  }

  // -- Telemetry: crash dumps & loader logs uploaded by the client --
  @Get('telemetry/crashdumps')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste les minidumps uploadés par le loader après un BSOD' })
  async listCrashDumps(@Query('hwid') hwid?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.telemetry.listCrashDumps({
      hwid,
      page: Math.max(1, parseInt(page || '1', 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit || '25', 10) || 25)),
    });
  }

  @Get('telemetry/crashdumps/:id/download')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Télécharge un minidump' })
  async downloadCrashDump(@Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const { path, filename } = await this.telemetry.getCrashDumpFile(id);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(createReadStream(path));
  }

  @Get('telemetry/logs')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste les logs loader uploadés par le client' })
  async listTelemetryLogs(@Query('hwid') hwid?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.telemetry.listLogs({
      hwid,
      page: Math.max(1, parseInt(page || '1', 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit || '25', 10) || 25)),
    });
  }

  @Get('telemetry/logs/:id/download')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Télécharge un log loader' })
  async downloadTelemetryLog(@Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const { path, filename } = await this.telemetry.getLogFile(id);
    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(createReadStream(path));
  }

  @Delete('telemetry/crashdumps/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprime un minidump (fichier + entrée DB)' })
  async deleteCrashDump(@Param('id') id: string) {
    return this.telemetry.deleteCrashDump(id);
  }

  @Delete('telemetry/logs/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprime un log loader (fichier + entrée DB)' })
  async deleteTelemetryLog(@Param('id') id: string) {
    return this.telemetry.deleteLog(id);
  }
}
