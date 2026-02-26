import { Controller, Get } from '@nestjs/common';
import { BotService }      from './bot.service';

/**
 * GET /api/v1/reviews
 * Endpoint public — retourne la liste des avis clients pour le storefront.
 */
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly botService: BotService) {}

  @Get()
  getReviews() {
    return this.botService.getReviews();
  }
}
