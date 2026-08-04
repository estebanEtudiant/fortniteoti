import {
  Controller, Get, Post, Delete, Body, Query, Param, Req, Res,
  UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile,
  StreamableFile, Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, IsIn, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { Request, Response } from 'express';
import { CustomerAuthGuard, AdminAuthGuard } from '../../common/guards/auth.guard';
import { ResellerService } from './reseller.service';

// ── DTOs ──

class EnrollDto {
  @IsString() @MinLength(2) companyName: string;
  @IsString() @MinLength(5) shopUrl: string;
  @IsString() @MinLength(2) country: string;
  @IsString() @MinLength(10) activity: string;
  @IsOptional() @IsString() telegram?: string;
  @IsOptional() @IsString() monthlyVolume?: string;
}

class TopupDto {
  @Type(() => Number) @IsInt() @Min(1000) amountCents: number;
  @IsIn(['stripe']) method: string;
}

class OrderBatchDto {
  @IsString() productId: string;
  @IsString() plan: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(10000) keyCount: number;
}

// ── Customer endpoints ──
@ApiTags('reseller')
@Controller('reseller')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class ResellerController {
  constructor(private svc: ResellerService) {}

  @Post('enroll')
  async enroll(@Body() dto: EnrollDto, @Req() req: Request) {
    return this.svc.enroll((req as any).customer.customerId, dto);
  }

  @Get('me')
  async me(@Req() req: Request) {
    return this.svc.getMe((req as any).customer.customerId);
  }

  @Post('accept-terms')
  @HttpCode(HttpStatus.OK)
  async acceptTerms(@Req() req: Request) {
    return this.svc.acceptTerms((req as any).customer.customerId);
  }

  @Post('wallet/topup')
  async topup(@Body() dto: TopupDto, @Req() req: Request) {
    return this.svc.topupWallet((req as any).customer.customerId, dto.amountCents, dto.method);
  }

  @Get('wallet/history')
  async walletHistory(@Req() req: Request, @Query('limit') limit?: string) {
    return this.svc.getWalletHistory((req as any).customer.customerId, Math.min(200, parseInt(limit || '50') || 50));
  }

  @Post('batches')
  async orderBatch(@Body() dto: OrderBatchDto, @Req() req: Request) {
    return this.svc.orderBatch((req as any).customer.customerId, dto.productId, dto.plan, dto.keyCount);
  }

  @Get('batches')
  async listBatches(@Req() req: Request, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.svc.listBatches(
      (req as any).customer.customerId,
      Math.min(200, parseInt(limit || '50') || 50),
      parseInt(offset || '0') || 0,
    );
  }

  @Get('batches/:id')
  async getBatch(@Param('id') id: string, @Req() req: Request) {
    return this.svc.getBatch((req as any).customer.customerId, id);
  }

  @Get('batches/:id/keys.csv')
  @Header('Content-Type', 'text/csv')
  async getBatchCsv(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const csv = await this.svc.getBatchCsv((req as any).customer.customerId, id);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="batch-${id.slice(0, 8)}.csv"`,
    });
    res.send(csv);
  }

  @Get('stats')
  async stats(@Req() req: Request) {
    return this.svc.getStats((req as any).customer.customerId);
  }

  @Post('kyc/upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimetype)) cb(null, true);
      else cb(new Error('Seuls JPG, PNG et PDF sont acceptés'), false);
    },
  }))
  async uploadKyc(@UploadedFile() file: any, @Req() req: Request) {
    if (!file) throw new Error('Fichier requis');
    const { writeFileSync, mkdirSync, existsSync } = require('fs');
    const { join } = require('path');
    const dir = join(process.cwd(), 'storage', 'kyc');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ext = file.originalname.split('.').pop();
    const filename = `${(req as any).customer.customerId}-${Date.now()}.${ext}`;
    const filePath = join(dir, filename);
    writeFileSync(filePath, file.buffer);
    return this.svc.uploadKycDoc((req as any).customer.customerId, filePath);
  }
}

// ── Admin endpoints ──
@ApiTags('reseller-admin')
@Controller('admin/resellers')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class ResellerAdminController {
  constructor(private svc: ResellerService) {}

  @Get()
  async list(@Query('status') status?: string, @Query('tier') tier?: string) {
    return this.svc.adminList({ status, tier });
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string) {
    await this.svc.adminApprove(id);
    return { success: true };
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(@Param('id') id: string, @Body('reason') reason: string) {
    await this.svc.adminSuspend(id, reason);
    return { success: true };
  }

  @Post(':id/set-tier')
  @HttpCode(HttpStatus.OK)
  async setTier(@Param('id') id: string, @Body() body: { tier: string; discount?: number }) {
    await this.svc.adminSetTier(id, body.tier, body.discount);
    return { success: true };
  }

  @Post(':id/credit')
  @HttpCode(HttpStatus.OK)
  async credit(@Param('id') id: string, @Body() body: { amountCents: number; reason: string }) {
    await this.svc.adminCredit(id, body.amountCents, body.reason);
    return { success: true };
  }

  @Get(':id/batches')
  async listBatches(@Param('id') id: string) {
    return this.svc.adminListBatches(id);
  }

  @Post('batches/:id/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeBatch(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: Request) {
    return this.svc.adminRevokeBatch(id, body.reason, (req as any).admin?.username || 'admin');
  }
}
