import { Controller, Get, Post, Param, Body, Query, Req, UseGuards, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Request } from 'express';
import { AdminAuthGuard } from '../../common/guards/auth.guard';
import { KillService } from './kill.service';
import { PrismaService } from '../../database/prisma.service';
import { authenticator } from 'otplib';

class ActivateKillDto {
  @IsIn(['all', 'hwid', 'user', 'version']) scope: string;
  @IsOptional() @IsString() target?: string;
  @IsString() @IsNotEmpty() reason: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(8760) ttl_hours?: number;
  @IsString() @IsNotEmpty() totp: string;
}

class RevokeKillDto {
  @IsString() @IsNotEmpty() reason: string;
  @IsString() @IsNotEmpty() totp: string;
}

@ApiTags('kill-switch')
@Controller('admin/software')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class KillController {
  constructor(
    private killService: KillService,
    private prisma: PrismaService,
  ) {}

  private async verifyTotp(req: Request, code: string) {
    const adminId = (req as any).admin?.adminId;
    if (!adminId) throw new UnauthorizedException('Admin non identifié');
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin?.totpEnabled || !admin?.totpSecret) {
      throw new BadRequestException('2FA non activée — activez-la dans les paramètres');
    }
    const clean = (code || '').replace(/\s/g, '');
    if (!clean || !authenticator.verify({ token: clean, secret: admin.totpSecret })) {
      throw new UnauthorizedException('Code 2FA invalide');
    }
  }

  @Post(':productId/kill')
  @ApiOperation({ summary: 'Activate kill switch for a product' })
  async activate(
    @Param('productId') productId: string,
    @Body() dto: ActivateKillDto,
    @Req() req: Request,
  ) {
    if (dto.scope !== 'all' && !dto.target) {
      throw new BadRequestException('target is required when scope is not "all"');
    }
    await this.verifyTotp(req, dto.totp);
    const adminName = (req as any).admin?.username || 'admin';
    return this.killService.activate(
      productId, dto.scope as any, dto.reason, adminName, dto.target, dto.ttl_hours,
    );
  }

  @Post(':productId/kill/:killId/revoke')
  @ApiOperation({ summary: 'Revoke a kill switch' })
  async revoke(
    @Param('productId') _productId: string,
    @Param('killId') killId: string,
    @Body() dto: RevokeKillDto,
    @Req() req: Request,
  ) {
    await this.verifyTotp(req, dto.totp);
    const adminName = (req as any).admin?.username || 'admin';
    return this.killService.revoke(killId, adminName, dto.reason);
  }

  @Get(':productId/kills')
  @ApiOperation({ summary: 'List kill switches for a product' })
  async list(
    @Param('productId') productId: string,
    @Query('active') active?: string,
    @Query('limit') limit?: string,
  ) {
    const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.killService.list(productId, activeFilter, Math.min(100, parseInt(limit || '50') || 50));
  }
}
