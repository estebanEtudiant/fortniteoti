import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { AdminAuthGuard } from '../../common/guards/auth.guard';

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
  providers: [ShopService, AdminAuthGuard],
})
export class ShopModule {}
