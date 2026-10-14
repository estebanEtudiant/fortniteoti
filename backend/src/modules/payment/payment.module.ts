import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { LicenseModule } from '../license/license.module';
import { AdminAuthGuard, CustomerAuthGuard } from '../../common/guards/auth.guard';
import { MailService } from '../customer/mail.service';
import { DiscordRoleService } from '../customer/discord-role.service';
import { BotModule } from '../bot/bot.module';
import { AffiliateModule } from '../affiliate/affiliate.module';
import { ResellerModule } from '../reseller/reseller.module';
import { ShopModule } from '../shop/shop.module';

@Module({
  imports: [
    LicenseModule,
    ShopModule,
    BotModule,
    AffiliateModule,
    ResellerModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, CustomerAuthGuard, AdminAuthGuard, MailService, DiscordRoleService],
})
export class PaymentModule {}
