import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MinecraftController } from './minecraft.controller';
import { MinecraftService } from './minecraft.service';
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
  controllers: [MinecraftController],
  providers: [MinecraftService, AdminAuthGuard],
})
export class MinecraftModule {}
