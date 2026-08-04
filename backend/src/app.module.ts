import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import configuration from './config/configuration';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './database/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { LicenseModule } from './modules/license/license.module';
import { AdminModule } from './modules/admin/admin.module';
import { PaymentModule } from './modules/payment/payment.module';
import { CustomerModule } from './modules/customer/customer.module';
import { HealthModule } from './modules/health/health.module';
import { BotModule } from './modules/bot/bot.module';
import { SoftwareModule } from './modules/software/software.module';
import { SoftwareAdminModule } from './modules/software-admin/software-admin.module';
import { ShopModule } from './modules/shop/shop.module';
import { PokemonModule } from './modules/pokemon/pokemon.module';
import { ForumModule } from './modules/forum/forum.module';
import { AffiliateModule } from './modules/affiliate/affiliate.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { KillSwitchModule } from './modules/kill-switch/kill.module';
import { ResellerModule } from './modules/reseller/reseller.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { KernelSymbolsModule } from './modules/kernel-symbols/kernel-symbols.module';
import { MinecraftModule } from './modules/minecraft/minecraft.module';
import { RequestLogMiddleware } from './common/middleware/request-log.middleware';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';

@Module({
  imports: [
    // ── Config ──
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // ── Global rate limiting (fallback) ──
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // ── Scheduled tasks (license expiry check) ──
    ScheduleModule.forRoot(),

    // ── Database ──
    PrismaModule,
    RedisModule,

    // ── Feature modules ──
    AuthModule,
    LicenseModule,
    AdminModule,
    PaymentModule,
    CustomerModule,
    HealthModule,
    BotModule,
    SoftwareModule,
    SoftwareAdminModule,
    ShopModule,
    PokemonModule,
    ForumModule,

    // ── Affiliate & Reseller ──
    AffiliateModule,
    ResellerModule,

    // ── Monitoring & Security ──
    AlertsModule,
    KillSwitchModule,
    TelemetryModule,
    MetricsModule,

    // ── Kernel Symbols ──
    KernelSymbolsModule,

    // ── Minecraft Server ──
    MinecraftModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLogMiddleware).forRoutes('*');
  }
}
