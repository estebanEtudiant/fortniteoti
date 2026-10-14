import { Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { ActivateDto } from './auth.dto';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { KillGuard } from '../kill-switch/kill.guard';

// Alias of /api/v1/auth/activate under the NG client namespace so the native
// 404Client/NG loader (which hits /api/v1/ng/auth/activate) can reuse the
// shared activation flow without a rebuild.
@ApiTags('ng-auth')
@Controller('ng/auth')
export class NgAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KillGuard, RateLimitGuard)
  @RateLimit({ max: 5, window: 60, keyPrefix: 'ng-activate' })
  @ApiOperation({ summary: 'NG client license activation (alias of /auth/activate)' })
  async activate(@Body() dto: ActivateDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.activate(dto, ip, userAgent);
  }
}
