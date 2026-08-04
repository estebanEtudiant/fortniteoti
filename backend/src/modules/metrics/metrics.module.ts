import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsCronService } from './metrics-cron.service';
import { KillSwitchModule } from '../kill-switch/kill.module';
import { AdminAuthGuard } from '../../common/guards/auth.guard';

@Module({
  imports: [
    KillSwitchModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsCronService, AdminAuthGuard],
  exports: [MetricsService],
})
export class MetricsModule {}
