import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { Reflector } from '@nestjs/core';

@Module({
  controllers: [TelemetryController],
  providers: [TelemetryService, RateLimitGuard, Reflector],
  exports: [TelemetryService],
})
export class TelemetryModule {}
