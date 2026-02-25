import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard qui vérifie le header `x-bot-secret` sur les routes bot.
 * Le secret est partagé entre le backend et le bot Discord (.env → BOT_API_SECRET).
 */
@Injectable()
export class BotAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret  = request.headers['x-bot-secret'];
    const expected = this.config.get<string>('BOT_API_SECRET');

    if (!expected) throw new UnauthorizedException('BOT_API_SECRET non configuré.');
    if (!secret || secret !== expected) throw new UnauthorizedException('Secret bot invalide.');

    return true;
  }
}
