import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ResellerService } from './reseller.service';
import { ResellerController, ResellerAdminController } from './reseller.controller';
import { CustomerAuthGuard, AdminAuthGuard } from '../../common/guards/auth.guard';
import { KillSwitchModule } from '../kill-switch/kill.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
    KillSwitchModule,
  ],
  controllers: [ResellerController, ResellerAdminController],
  providers: [ResellerService, CustomerAuthGuard, AdminAuthGuard],
  exports: [ResellerService],
})
export class ResellerModule {}
