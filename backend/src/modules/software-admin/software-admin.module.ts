import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SoftwareAdminController } from './software-admin.controller';
import { SoftwareAdminService } from './software-admin.service';
import { AdminAuthGuard } from '../../common/guards/auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [SoftwareAdminController],
  providers: [SoftwareAdminService, AdminAuthGuard],
  exports: [SoftwareAdminService],
})
export class SoftwareAdminModule {}
