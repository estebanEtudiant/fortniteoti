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
  ],
})
export class AppModule {}
