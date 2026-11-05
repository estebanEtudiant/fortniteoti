import { Body, Controller, Post, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, Matches } from 'class-validator';
import { Request } from 'express';
import { LoginNotifyService } from './login-notify.service';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';

class LoginNotifyDto {
  @IsString() @IsNotEmpty() @Matches(/^[A-Za-z0-9-]{10,64}$/)
  licenseKey: string;

  @IsString() @IsNotEmpty() @MaxLength(128)
  hwid: string;

  @IsOptional() @IsString() @MaxLength(128)
  windowsUser?: string;

  @IsOptional() @IsString() @MaxLength(256)
  gpu?: string;

  @IsOptional() @IsString() @MaxLength(50)
  discordId?: string;

  @IsOptional() @IsString() @MaxLength(100)
  discordUsername?: string;

  @IsOptional() @IsString() @MaxLength(64)
  timestamp?: string;

  @IsOptional() @IsString()
  screenshotJpegB64?: string;
}

@ApiTags('login-notify')
@Controller('login-notify')
export class LoginNotifyController {
  constructor(private svc: LoginNotifyService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 10, window: 60, keyPrefix: 'login-notify' })
  @ApiOperation({ summary: 'Loader-posted login notification to Discord (screenshot + geo)' })
  async notify(@Body() body: LoginNotifyDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress || 'unknown';
    await this.svc.sendDiscordEmbed(body, ip);
    return { ok: true };
  }
}
