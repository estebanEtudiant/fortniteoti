import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { KernelSymbolsController, KernelSymbolsAdminController } from './kernel-symbols.controller';
import { KernelSymbolsService } from './kernel-symbols.service';
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
  controllers: [KernelSymbolsController, KernelSymbolsAdminController],
  providers: [KernelSymbolsService, AdminAuthGuard],
  exports: [KernelSymbolsService],
})
export class KernelSymbolsModule {}
