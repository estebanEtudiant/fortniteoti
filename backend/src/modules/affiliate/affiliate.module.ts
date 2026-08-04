import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AffiliateService } from './affiliate.service';
import { AffiliateCronService } from './affiliate-cron.service';
import { AffiliateController, AffiliateAdminController, ReferralRedirectController } from './affiliate.controller';
import { CustomerAuthGuard, AdminAuthGuard } from '../../common/guards/auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [ReferralRedirectController, AffiliateController, AffiliateAdminController],
  providers: [AffiliateService, AffiliateCronService, CustomerAuthGuard, AdminAuthGuard],
  exports: [AffiliateService],
})
export class AffiliateModule {}
