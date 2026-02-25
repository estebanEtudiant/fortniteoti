// ── health.module.ts ──
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

// PrismaService et RedisService sont @Global() → pas besoin de les importer ici
@Module({ controllers: [HealthController] })
export class HealthModule {}
