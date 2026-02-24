import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const isProduction = config.get('NODE_ENV') === 'production';

  // ── Security ──
  app.use(helmet());
  app.enableCors({
    origin: isProduction
      ? [
          config.get<string>('ADMIN_CORS_ORIGIN', ''),
          config.get<string>('STOREFRONT_CORS_ORIGIN', ''),
        ].filter(Boolean)
      : ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3002'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
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

  // ── Swagger (dev only) ──
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('FortniteOptimizer Licensing API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port);
  Logger.log(`API running on port ${port} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`, 'Bootstrap');
}

bootstrap();
