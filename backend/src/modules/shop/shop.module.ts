import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { SpooferService } from './spoofer.service';
import { AdminAuthGuard, CustomerAuthGuard } from '../../common/guards/auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [ShopController],
  providers: [ShopService, SpooferService, AdminAuthGuard, CustomerAuthGuard],
  exports: [SpooferService],
})
export class ShopModule {}
