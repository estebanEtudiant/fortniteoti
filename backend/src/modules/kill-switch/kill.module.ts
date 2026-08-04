import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { KillController } from './kill.controller';
import { KillService } from './kill.service';
import { KillGuard } from './kill.guard';
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
  controllers: [KillController],
  providers: [KillService, KillGuard, AdminAuthGuard],
  exports: [KillService, KillGuard],
})
export class KillSwitchModule {}
