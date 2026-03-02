import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private config: ConfigService) {
    this.client = new Redis(config.get<string>('redis.url', 'redis://localhost:6379'));
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  // ── Rate Limiting ──
  // Returns { allowed: boolean, remaining: number, resetIn: number }
  async checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const redisKey = `rl:${key}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // Sliding window using sorted set
    const multi = this.client.multi();
    multi.zremrangebyscore(redisKey, 0, now - windowMs); // Remove old entries
    multi.zadd(redisKey, now, `${now}-${Math.random()}`); // Add current
    multi.zcard(redisKey); // Count in window
    multi.expire(redisKey, windowSeconds); // Set TTL

    const results = await multi.exec();
    const count = (results?.[2]?.[1] as number) || 0;
    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);

    return { allowed, remaining, resetIn: windowSeconds };
  }

  // ── Brute Force Protection ──
  async recordFailedAttempt(ip: string): Promise<number> {
    const key = `bf:${ip}`;
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, 600); // 10 min window
    }
    return count;
  }

  async getFailedAttempts(ip: string): Promise<number> {
    const count = await this.client.get(`bf:${ip}`);
    return parseInt(count || '0', 10);
  }

  async clearFailedAttempts(ip: string): Promise<void> {
    await this.client.del(`bf:${ip}`);
  }

  async isIpBlocked(ip: string): Promise<boolean> {
    const blocked = await this.client.get(`blocked:${ip}`);
    return blocked === '1';
  }

  async blockIp(ip: string, durationSeconds: number): Promise<void> {
    await this.client.set(`blocked:${ip}`, '1', 'EX', durationSeconds);
    this.logger.warn(`IP blocked: ${ip} for ${durationSeconds}s`);
  }

  // ── Nonce (anti-replay) ──
  async isNonceUsed(nonce: string): Promise<boolean> {
    const key = `nonce:${nonce}`;
    const result = await this.client.set(key, '1', 'EX', 300, 'NX'); // 5 min TTL, only if not exists
    return result === null; // null = already existed = nonce was used
  }

  // ── Generic cache ──
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  // ── Analytics helpers ──
  async hincrby(key: string, field: string, delta: number): Promise<number> {
    return this.client.hincrby(key, field, delta);
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    const result = await this.client.hgetall(key);
    return result && Object.keys(result).length > 0 ? result : null;
  }

  async pfadd(key: string, ...elements: string[]): Promise<number> {
    return this.client.pfadd(key, ...elements) as Promise<number>;
  }

  async pfcount(key: string): Promise<number> {
    return this.client.pfcount(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member) as unknown as Promise<number>;
  }

  async zcount(key: string, min: number | string, max: number | string): Promise<number> {
    return this.client.zcount(key, min, max);
  }

  async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number> {
    return this.client.zremrangebyscore(key, min, max);
  }
}
