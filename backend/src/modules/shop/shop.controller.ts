import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { CreateGameDto, UpdateGameDto, CreatePlanDto, UpdatePlanDto, UpdateShopSettingsDto } from './shop.dto';
import { AdminAuthGuard } from '../../common/guards/auth.guard';

@Controller('shop')
export class ShopController {
  constructor(private readonly shop: ShopService) {}

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
