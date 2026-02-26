import { Module } from '@nestjs/common';
import { BotController }     from './bot.controller';
import { ReviewsController } from './reviews.controller';
import { BotService }        from './bot.service';
import { BotNotifyService }  from './bot-notify.service';
import { LicenseModule }     from '../license/license.module';

@Module({
  imports:     [LicenseModule],
  controllers: [BotController, ReviewsController],
  providers:   [BotService, BotNotifyService],
  exports:     [BotNotifyService],
})
export class BotModule {}
