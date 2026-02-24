import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../database/redis.service';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  max: number;       // Max requests
  window: number;    // Window in seconds
  keyPrefix?: string; // Custom key prefix
}

// Decorator
export function RateLimit(options: RateLimitOptions) {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor?.value || target);
    return descriptor || target;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private redis: RedisService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!options) return true; // No rate limit configured

    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const prefix = options.keyPrefix || context.getHandler().name;
    const key = `${prefix}:${ip}`;

    // Check if IP is blocked (brute force)
    if (await this.redis.isIpBlocked(ip)) {
      throw new HttpException(
        { error: 'IP_BLOCKED', message: 'Too many failed attempts. Try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const { allowed, remaining, resetIn } = await this.redis.checkRateLimit(
      key, options.max, options.window,
    );

    const response = context.switchToHttp().getResponse();
    response.header('X-RateLimit-Limit', options.max.toString());
    response.header('X-RateLimit-Remaining', remaining.toString());
    response.header('X-RateLimit-Reset', resetIn.toString());

    if (!allowed) {
      throw new HttpException(
        { error: 'RATE_LIMITED', message: 'Too many requests. Slow down.', retryAfter: resetIn },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
