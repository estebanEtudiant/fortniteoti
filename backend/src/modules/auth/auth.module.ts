import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LicenseAuthGuard, AdminAuthGuard } from '../../common/guards/auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { Reflector } from '@nestjs/core';
import { KillSwitchModule } from '../kill-switch/kill.module';
import { ResellerModule } from '../reseller/reseller.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.accessExpiry', '15m') },
      }),
    }),
    KillSwitchModule,
    ResellerModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LicenseAuthGuard,
    AdminAuthGuard,
    RateLimitGuard,
    Reflector,
  ],
  exports: [AuthService, JwtModule, LicenseAuthGuard, AdminAuthGuard, RateLimitGuard],
})
export class AuthModule {}
