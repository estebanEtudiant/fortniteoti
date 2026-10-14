import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, Query, Header,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { SpooferService } from './spoofer.service';
import { CreateGameDto, UpdateGameDto, CreatePlanDto, UpdatePlanDto, UpdateShopSettingsDto } from './shop.dto';
import { AdminAuthGuard, CustomerAuthGuard } from '../../common/guards/auth.guard';

@Controller('shop')
export class ShopController {
  constructor(private readonly shop: ShopService, private readonly spoofer: SpooferService) {}

  @Get('spoofer/plans')
  @Header('Cache-Control', 'no-store')
  spooferPlans() { return this.spoofer.publicPlans(); }

  @Get('admin/spoofer')
  @UseGuards(AdminAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  spooferStock() { return this.spoofer.plans(); }

  @Get('admin/spoofer/keys')
  @UseGuards(AdminAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  spooferKeys(@Query() filters: { plan?: string; status?: string; search?: string; page?: string }) {
    return this.spoofer.listKeys(filters);
  }

  @Post('admin/spoofer/keys')
  @UseGuards(AdminAuthGuard)
  importSpooferKeys(@Body() body: { plan: string; keys: string }) {
    return this.spoofer.importKeys(body.plan, body.keys);
  }

  @Patch('admin/spoofer/plans/:slug')
  @UseGuards(AdminAuthGuard)
  updateSpooferPlan(@Param('slug') slug: string, @Body() body: { price: number; enabled: boolean }) {
    return this.spoofer.updatePlan(slug, body.price, body.enabled);
  }

  // ─────────── Public (shop frontend) ───────────
  @Get('games')
  getPublicGames() {
    return this.shop.publicGames();
  }

  @Get('plans')
  getPublicPlans() {
    return this.shop.publicPlans();
  }

  @Get('settings')
  getPublicSettings() {
    return this.shop.getSettings();
  }

  // ─────────── Avis clients (boutique) ───────────
  @Get('reviews')
  getPublicReviews() {
    return this.shop.publicReviews();
  }

  @Get('my-reviews')
  @UseGuards(CustomerAuthGuard)
  getMyReviews(@Req() req: any) {
    return this.shop.myReviews(req.customer.customerId);
  }

  @Get('my-coupons')
  @UseGuards(CustomerAuthGuard)
  getMyCoupons(@Req() req: any) {
    return this.shop.myCoupons(req.customer.customerId);
  }

  @Post('reviews')
  @UseGuards(CustomerAuthGuard)
  submitReview(@Req() req: any, @Body() body: { game?: string; rating?: number; text?: string }) {
    return this.shop.submitReview(req.customer.customerId, body || {});
  }

  @Get('admin/reviews')
  @UseGuards(AdminAuthGuard)
  adminReviews() {
    return this.shop.adminReviews();
  }

  @Patch('admin/reviews/:id')
  @UseGuards(AdminAuthGuard)
  moderateReview(@Param('id') id: string, @Body() body: { approved?: boolean }) {
    return this.shop.moderateReview(id, !!(body && body.approved));
  }

  @Delete('admin/reviews/:id')
  @UseGuards(AdminAuthGuard)
  deleteReview(@Param('id') id: string) {
    return this.shop.deleteReview(id);
  }

  @Get('community-stats')
  getCommunityStats() {
    return this.shop.getCommunityStats();
  }

  // ─────────── Admin: Settings ───────────
  @Get('admin/settings')
  @UseGuards(AdminAuthGuard)
  getSettings() {
    return this.shop.getSettings();
  }

  @Patch('admin/settings')
  @UseGuards(AdminAuthGuard)
  updateSettings(@Body() dto: UpdateShopSettingsDto) {
    return this.shop.updateSettings(dto);
  }

  // ─────────── Admin: Games ───────────
  @Get('admin/games')
  @UseGuards(AdminAuthGuard)
  listGames() {
    return this.shop.listGames();
  }

  @Post('admin/games')
  @UseGuards(AdminAuthGuard)
  createGame(@Body() dto: CreateGameDto) {
    return this.shop.createGame(dto);
  }

  @Patch('admin/games/:id')
  @UseGuards(AdminAuthGuard)
  updateGame(@Param('id') id: string, @Body() dto: UpdateGameDto) {
    return this.shop.updateGame(id, dto);
  }

  @Delete('admin/games/:id')
  @UseGuards(AdminAuthGuard)
  deleteGame(@Param('id') id: string) {
    return this.shop.deleteGame(id);
  }

  // ─────────── Admin: Plans ───────────
  @Get('admin/plans')
  @UseGuards(AdminAuthGuard)
  listPlans() {
    return this.shop.listPlans();
  }

  @Post('admin/plans')
  @UseGuards(AdminAuthGuard)
  createPlan(@Body() dto: CreatePlanDto) {
    return this.shop.createPlan(dto);
  }

  @Patch('admin/plans/:id')
  @UseGuards(AdminAuthGuard)
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.shop.updatePlan(id, dto);
  }

  @Delete('admin/plans/:id')
  @UseGuards(AdminAuthGuard)
  deletePlan(@Param('id') id: string) {
    return this.shop.deletePlan(id);
  }
}
