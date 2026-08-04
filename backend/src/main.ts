import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const host = config.get<string>('host', '127.0.0.1');
  const isProduction = config.get('NODE_ENV') === 'production';
  const trustProxy = config.get<boolean>('trustProxy', false);
  const httpApp = app.getHttpAdapter().getInstance();

  if (trustProxy) {
    httpApp.set('trust proxy', 1);
  }

  // ── Security ──
  app.use(helmet());
  app.enableCors({
    origin: isProduction
      ? [
          config.get<string>('ADMIN_CORS_ORIGIN', ''),
          config.get<string>('STOREFRONT_CORS_ORIGIN', ''),
          config.get<string>('SHOP_CORS_ORIGIN', ''),
          config.get<string>('FORUM_CORS_ORIGIN', 'https://forum.404tweaks.tech'),
        ].filter(Boolean)
      : ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3002'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  // ── Global pipes ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global filters & interceptors ──
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ── API prefix ──
  app.setGlobalPrefix('api/v1');

  // ── Swagger ──
  {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('404Tweaks Licensing API')
      .setVersion('1.0')
      .addBearerAuth()
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'admin-jwt')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      include: [],
    });
    SwaggerModule.setup('docs', app, document);
  }

  // ── Telemetry raw body parsing ──
  // The loader posts a raw .dmp / raw text log as the body (not JSON), so these
  // two routes need their own parser instead of Nest's default json/urlencoded one.
  httpApp.use(
    '/api/v1/telemetry/crashdump',
    express.raw({ type: 'application/octet-stream', limit: '55mb' }),
  );
  httpApp.use(
    '/api/v1/telemetry/log',
    express.text({ type: 'text/plain', limit: '6mb' }),
  );

  // ── Static uploads (images, etc.) ──
  // Cross-Origin-Resource-Policy must be 'cross-origin' so the dashboard and
  // storefront (different origins) can load images served by the backend.
  httpApp.use('/uploads', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(join(__dirname, '..', 'uploads')));

  await app.listen(port, host);
  Logger.log(
    `API running on ${host}:${port} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`,
    'Bootstrap',
  );
}

bootstrap();
