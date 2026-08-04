import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ForumService } from './forum.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [ForumService],
  exports: [ForumService],
})
export class ForumModule {}
