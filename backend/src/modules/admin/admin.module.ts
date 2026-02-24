import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { LicenseModule } from '../license/license.module';
import { AuthModule } from '../auth/auth.module';
import { MailService } from '../customer/mail.service';

@Module({
  imports: [LicenseModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService, MailService],
  // Note: RedisService is @Global() so no import needed
})
export class AdminModule {}