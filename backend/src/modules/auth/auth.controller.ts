import { Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { ActivateDto, HeartbeatDto, RefreshTokenDto } from './auth.dto';
import { LicenseAuthGuard, JwtPayload } from '../../common/guards/auth.guard';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { KillGuard } from '../kill-switch/kill.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /api/v1/auth/activate ──
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KillGuard, RateLimitGuard)
  @RateLimit({ max: 5, window: 60, keyPrefix: 'activate' })
  @ApiOperation({ summary: 'Activate license key with HWID binding' })
  async activate(@Body() dto: ActivateDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.activate(dto, ip, userAgent);
  }

  // ── POST /api/v1/auth/heartbeat ──
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LicenseAuthGuard, RateLimitGuard)
  @RateLimit({ max: 60, window: 60, keyPrefix: 'heartbeat' })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Periodic heartbeat check (requires access token)' })
  async heartbeat(@Body() dto: HeartbeatDto, @Req() req: Request) {
    const licensePayload = (req as any).license as JwtPayload;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip || 'unknown';
    return this.authService.heartbeat(licensePayload, dto, ip);
  }

  // ── POST /api/v1/auth/refresh ──
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 10, window: 60, keyPrefix: 'refresh' })
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }
}
