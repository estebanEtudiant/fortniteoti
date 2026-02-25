import { Module } from '@nestjs/common';
import { BotController }    from './bot.controller';
import { BotService }       from './bot.service';
import { BotNotifyService } from './bot-notify.service';
import { LicenseModule }    from '../license/license.module';

@Module({
  imports:     [LicenseModule],
  controllers: [BotController],
  providers:   [BotService, BotNotifyService],
  exports:     [BotNotifyService],
})
export class BotModule {}
