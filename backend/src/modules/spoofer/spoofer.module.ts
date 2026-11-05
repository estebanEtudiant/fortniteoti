import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SpooferController } from './spoofer.controller';
import { AuthModule } from '../auth/auth.module';
import { SoftwareModule } from '../software/software.module';
import { SoftwareAdminModule } from '../software-admin/software-admin.module';
import { KillSwitchModule } from '../kill-switch/kill.module';
import { PrismaModule } from '../../database/prisma.module';
import { LicenseAuthGuard } from '../../common/guards/auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
    AuthModule,
    SoftwareModule,
    SoftwareAdminModule,
    KillSwitchModule,
    PrismaModule,
  ],
  controllers: [SpooferController],
  providers: [LicenseAuthGuard, RateLimitGuard, Reflector],
})
export class SpooferModule {}
