import { Controller, Post, Body, Req, HttpCode, HttpStatus, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { TelemetryService } from './telemetry.service';
import { CrashDumpQueryDto, TelemetryLogQueryDto } from './telemetry.dto';

@Controller('telemetry')
export class TelemetryController {
  constructor(private telemetry: TelemetryService) {}

  // POST /api/v1/telemetry/crashdump
  // Query: hwid, os, filename, sha1, bytes — body: raw .dmp binary (application/octet-stream)
  // Body parsing is done by an express.raw() middleware scoped to this exact path in main.ts,
  // since Nest's default body parser only understands JSON/urlencoded.
  @Post('crashdump')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 20, window: 300, keyPrefix: 'telemetry-crashdump' })
  async uploadCrashDump(@Query() query: CrashDumpQueryDto, @Req() req: Request) {
    const body = req.body;
    if (!Buffer.isBuffer(body)) throw new BadRequestException('Expected application/octet-stream body');
    return this.telemetry.saveCrashDump(query, body, req);
  }

  // POST /api/v1/telemetry/log
  // Query: hwid, os, kind, bytes — body: raw text (text/plain)
  @Post('log')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 20, window: 300, keyPrefix: 'telemetry-log' })
  async uploadLog(@Query() query: TelemetryLogQueryDto, @Req() req: Request) {
    const body = req.body;
    if (typeof body !== 'string') throw new BadRequestException('Expected text/plain body');
    return this.telemetry.saveLog(query, body, req);
  }

  @Post('session')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 100, window: 60, keyPrefix: 'telemetry' })
  async session(@Body() body: any, @Req() req: Request) {
    const { event, os, hwid, error, duration_ms } = body || {};
    if (!event || typeof event !== 'string') return;

    let userId: string | undefined;
    try {
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const payload = jwt.decode(auth.slice(7));
        userId = payload?.licenseId || payload?.sub;
      }
    } catch {}

    await this.telemetry.record(
      'fortniteclient',
      event,
      String(os || ''),
      String(hwid || ''),
      userId,
      error ? String(error) : undefined,
      typeof duration_ms === 'number' ? duration_ms : undefined,
    );
  }
}
