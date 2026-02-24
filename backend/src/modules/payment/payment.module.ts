import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { LicenseModule } from '../license/license.module';
import { CustomerAuthGuard } from '../../common/guards/auth.guard';
import { MailService } from '../customer/mail.service';

@Module({
  imports: [
    LicenseModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, CustomerAuthGuard, MailService],
})
export class PaymentModule {}
