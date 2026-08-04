import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      if (res.statusCode < 400) return;

      const durationMs = Date.now() - start;
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
      const endpoint = req.originalUrl?.split('?')[0] || req.url;
      const userId = (req as any).license?.licenseId || (req as any).customer?.customerId || null;

      this.prisma.requestLog.create({
        data: {
          method: req.method,
          endpoint: endpoint.substring(0, 255),
          status: res.statusCode,
          userId,
          ip: ip.substring(0, 45),
          durationMs,
        },
      }).catch(() => {});
    });

    next();
  }
}
