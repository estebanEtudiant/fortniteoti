import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PokemonController } from './pokemon.controller';
import { PokemonService } from './pokemon.service';
import { CustomerModule } from '../customer/customer.module';
import { AdminAuthGuard, CustomerAuthGuard } from '../../common/guards/auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
    CustomerModule,
  ],
  controllers: [PokemonController],
  providers: [PokemonService, AdminAuthGuard, CustomerAuthGuard],
  exports: [PokemonService],
})
export class PokemonModule {}
