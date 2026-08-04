// ── health.module.ts ──
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { BotAuthGuard } from '../bot/bot-auth.guard';

// PrismaService et RedisService sont @Global() → pas besoin de les importer ici
@Module({
  controllers: [HealthController],
  providers: [BotAuthGuard],
})
export class HealthModule {}
