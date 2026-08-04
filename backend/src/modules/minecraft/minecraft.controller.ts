import {
  Controller, Get, Post, Patch, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, Length } from 'class-validator';
import { AdminAuthGuard } from '../../common/guards/auth.guard';
import { MinecraftService } from './minecraft.service';

class PlayerNameDto {
  @IsString() @Length(1, 16)
  name: string;

  @IsOptional() @IsString() @Length(1, 200)
  reason?: string;
}

class BroadcastDto {
  @IsString() @Length(1, 256)
  message: string;
}

class CommandDto {
  @IsString() @Length(1, 512)
  command: string;
}

class WhitelistToggleDto {
  @IsBoolean()
  enabled: boolean;
}

class PropertiesDto {
  @IsOptional() @IsString() motd?: string;
  @IsOptional() @IsString() 'max-players'?: string;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsString() gamemode?: string;
  @IsOptional() @IsString() pvp?: string;
  @IsOptional() @IsString() 'white-list'?: string;
  @IsOptional() @IsString() 'view-distance'?: string;
  @IsOptional() @IsString() 'simulation-distance'?: string;
  @IsOptional() @IsString() 'spawn-protection'?: string;
  @IsOptional() @IsString() 'online-mode'?: string;
  @IsOptional() @IsString() 'enable-command-block'?: string;
  @IsOptional() @IsString() hardcore?: string;
}

@ApiTags('admin/minecraft')
@Controller('admin/minecraft')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class MinecraftController {
  constructor(private svc: MinecraftService) {}

  @Get('status')
  status() {
    return this.svc.getStatus();
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  start() {
    return this.svc.start();
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  stop() {
    return this.svc.stop();
  }

  @Post('restart')
  @HttpCode(HttpStatus.OK)
  restart() {
    return this.svc.restart();
  }

  @Get('logs')
  logs() {
    return this.svc.getLogs();
  }

  @Get('players')
  players() {
    return this.svc.getPlayers();
  }

  @Post('players/kick')
  @HttpCode(HttpStatus.OK)
  kick(@Body() dto: PlayerNameDto) {
    return this.svc.kickPlayer(dto.name, dto.reason);
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  broadcast(@Body() dto: BroadcastDto) {
    return this.svc.broadcast(dto.message);
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  save() {
    return this.svc.saveAll();
  }

  @Post('command')
  @HttpCode(HttpStatus.OK)
  command(@Body() dto: CommandDto) {
    return this.svc.sendCommand(dto.command);
  }

  @Get('whitelist')
  whitelist() {
    return this.svc.getWhitelist();
  }

  @Post('whitelist/add')
  @HttpCode(HttpStatus.OK)
  addWhitelist(@Body() dto: PlayerNameDto) {
    return this.svc.addWhitelist(dto.name);
  }

  @Post('whitelist/remove')
  @HttpCode(HttpStatus.OK)
  removeWhitelist(@Body() dto: PlayerNameDto) {
    return this.svc.removeWhitelist(dto.name);
  }

  @Post('whitelist/toggle')
  @HttpCode(HttpStatus.OK)
  toggleWhitelist(@Body() dto: WhitelistToggleDto) {
    return this.svc.toggleWhitelistEnforcement(dto.enabled);
  }

  @Get('ops')
  ops() {
    return this.svc.getOps();
  }

  @Post('ops/add')
  @HttpCode(HttpStatus.OK)
  addOp(@Body() dto: PlayerNameDto) {
    return this.svc.addOp(dto.name);
  }

  @Post('ops/remove')
  @HttpCode(HttpStatus.OK)
  removeOp(@Body() dto: PlayerNameDto) {
    return this.svc.removeOp(dto.name);
  }

  @Get('banned')
  banned() {
    return this.svc.getBanned();
  }

  @Post('ban')
  @HttpCode(HttpStatus.OK)
  ban(@Body() dto: PlayerNameDto) {
    return this.svc.banPlayer(dto.name, dto.reason);
  }

  @Post('pardon')
  @HttpCode(HttpStatus.OK)
  pardon(@Body() dto: PlayerNameDto) {
    return this.svc.pardonPlayer(dto.name);
  }

  @Get('properties')
  properties() {
    return this.svc.getProperties();
  }

  @Patch('properties')
  updateProperties(@Body() dto: PropertiesDto) {
    return this.svc.updateProperties(dto);
  }
}
