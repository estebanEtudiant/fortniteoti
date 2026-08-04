import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SoftwareController } from './software.controller';
import { SoftwareService } from './software.service';
import { AdminAuthGuard, LicenseAuthGuard, CustomerAuthGuard } from '../../common/guards/auth.guard';
import { SoftwareAdminModule } from '../software-admin/software-admin.module';
import { KillSwitchModule } from '../kill-switch/kill.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
    SoftwareAdminModule,
    KillSwitchModule,
  ],
  controllers: [SoftwareController],
  providers: [SoftwareService, AdminAuthGuard, LicenseAuthGuard, CustomerAuthGuard],
})
export class SoftwareModule {}
