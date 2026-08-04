import { Body, Controller, Get, Param, Post, UseGuards, Query } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotAuthGuard } from './bot-auth.guard';
import { VerifyLicenseDto } from './dto/verify-license.dto';
import { GenerateKeyDto } from './dto/generate-key.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { UpdateCommunityStatsDto } from './dto/update-community-stats.dto';

@Controller('bot')
@UseGuards(BotAuthGuard)
export class BotController {
  constructor(private readonly botService: BotService) {}

  /**
   * POST /api/v1/bot/verify-license
   * Vérifie une clé et l'associe au Discord ID fourni.
   */
  @Post('verify-license')
  verifyLicense(@Body() dto: VerifyLicenseDto) {
    return this.botService.verifyLicense(dto.key, dto.discordId);
  }

  /**
   * GET /api/v1/bot/license-status/:discordId
   * Retourne le statut de la licence liée au Discord ID.
   */
  @Get('license-status/:discordId')
  getLicenseStatus(@Param('discordId') discordId: string) {
    return this.botService.getLicenseStatus(discordId);
  }

  /**
   * POST /api/v1/bot/generate
   * Génère une ou plusieurs clés de licence.
   */
  @Post('generate')
  generateKeys(@Body() dto: GenerateKeyDto) {
    return this.botService.generateKeys(dto.plan, dto.count, dto.product);
  }

  /**
   * GET /api/v1/bot/dashboard
   * KPIs pour la commande /dashboard Discord.
   */
  @Get('dashboard')
  getDashboard() {
    return this.botService.getDashboard();
  }

  /**
   * POST /api/v1/bot/maintenance
   * Active ou désactive le mode maintenance.
   */
  @Post('maintenance')
  setMaintenance(@Body() body: { enabled: boolean; raison?: string }) {
    return this.botService.setMaintenance(body.enabled, body.raison ?? null);
  }

  /**
   * POST /api/v1/bot/reviews
   * Reçoit un avis depuis le bot Discord et le synchronise dans Redis.
   */
  @Post('reviews')
  submitReview(@Body() dto: SubmitReviewDto) {
    return this.botService.submitReview(dto);
  }

  /**
   * GET /api/v1/bot/config
   * Config des embeds Discord (lue par le bot au démarrage / à la demande).
   */
  @Get('config')
  getBotConfig() {
    return this.botService.getBotConfig();
  }

  /**
   * POST /api/v1/bot/community-stats
   * Le bot pousse ici le nombre de membres live et le dernier arrivé (lu par le site public).
   */
  @Post('community-stats')
  updateCommunityStats(@Body() dto: UpdateCommunityStatsDto) {
    return this.botService.updateCommunityStats(dto);
  }
}
