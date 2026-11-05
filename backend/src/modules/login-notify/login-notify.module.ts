import { Module } from '@nestjs/common';
import { LoginNotifyController } from './login-notify.controller';
import { LoginNotifyService } from './login-notify.service';

@Module({
  controllers: [LoginNotifyController],
  providers: [LoginNotifyService],
})
export class LoginNotifyModule {}
