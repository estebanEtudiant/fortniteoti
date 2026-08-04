import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { MailService } from './mail.service';
import { DiscordRoleService } from './discord-role.service';
import { CustomerAuthGuard } from '../../common/guards/auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { Reflector } from '@nestjs/core';

import { ForumModule } from '../forum/forum.module';

@Module({
  imports: [
    ForumModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    MailService,
    DiscordRoleService,
    CustomerAuthGuard,
    RateLimitGuard,
    Reflector,
  ],
  exports: [CustomerService, DiscordRoleService, MailService],
})
export class CustomerModule {}
