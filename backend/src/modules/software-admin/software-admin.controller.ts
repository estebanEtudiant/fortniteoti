import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  Res,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { createReadStream } from 'fs';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiParam } from '@nestjs/swagger';
import { AdminAuthGuard } from '../../common/guards/auth.guard';
import { SoftwareAdminService } from './software-admin.service';
import { PublishDto, VALID_PRODUCTS, VALID_KINDS, BinaryKind } from './software-admin.dto';

const TEMP_DIR = resolve(process.cwd(), 'storage', 'software', '.tmp');

const tempStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const fs = require('fs');
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    cb(null, TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `tmp-${unique}${extname(file.originalname)}`);
  },
});

@ApiTags('admin/software')
@ApiBearerAuth('admin-jwt')
@Controller('admin/software')
@UseGuards(AdminAuthGuard)
export class SoftwareAdminController {
  constructor(private service: SoftwareAdminService) {}

  private validateProduct(productId: string): void {
    if (!(VALID_PRODUCTS as readonly string[]).includes(productId)) {
      throw new BadRequestException(`Produit invalide: ${productId}. Valides: ${VALID_PRODUCTS.join(', ')}`);
    }
  }

  private validateKind(kind: string): asserts kind is BinaryKind {
    if (!(VALID_KINDS as readonly string[]).includes(kind)) {
      throw new BadRequestException(`Kind invalide: ${kind}. Valides: ${VALID_KINDS.join(', ')}`);
    }
  }

  @Post(':productId/binary/:kind')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Upload un binaire (driver/reader/byovd)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'productId', enum: ['fortniteclient'] })
  @ApiParam({ name: 'kind', enum: ['driver', 'reader', 'byovd', 'loader'] })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: tempStorage,
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadBinary(
    @Param('productId') productId: string,
    @Param('kind') kind: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    this.validateProduct(productId);
    this.validateKind(kind);
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    const admin = (req as any).admin;
    return this.service.uploadBinary(productId, kind, file, admin?.adminId);
  }

  @Post(':productId/publish')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Publie un nouveau bundle à partir des derniers binaires' })
  @ApiParam({ name: 'productId', enum: ['fortniteclient'] })
  async publish(
    @Param('productId') productId: string,
    @Body() dto: PublishDto,
    @Req() req: Request,
  ) {
    this.validateProduct(productId);
    const admin = (req as any).admin;
    return this.service.publish(productId, dto.notes, dto.version, admin?.adminId);
  }

  @Get(':productId/versions')
  @ApiOperation({ summary: 'Liste toutes les versions publiées' })
  @ApiParam({ name: 'productId', enum: ['fortniteclient'] })
  async listVersions(@Param('productId') productId: string) {
    this.validateProduct(productId);
    return this.service.listVersions(productId);
  }

  @Get(':productId/versions/:id')
  @ApiOperation({ summary: 'Détail d\'une version (composition, checksums)' })
  @ApiParam({ name: 'productId', enum: ['fortniteclient'] })
  async getVersion(
    @Param('productId') productId: string,
    @Param('id') id: string,
  ) {
    this.validateProduct(productId);
    return this.service.getVersion(productId, id);
  }

  @Post(':productId/versions/:id/rollback')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Rollback : réactive une version précédente' })
  @ApiParam({ name: 'productId', enum: ['fortniteclient'] })
  async rollback(
    @Param('productId') productId: string,
    @Param('id') id: string,
  ) {
    this.validateProduct(productId);
    return this.service.rollback(productId, id);
  }

  @Get(':productId/status')
  @ApiOperation({ summary: 'Statut : version active, binaires, abonnés, derniers fetches' })
  @ApiParam({ name: 'productId', enum: ['fortniteclient'] })
  async getStatus(@Param('productId') productId: string) {
    this.validateProduct(productId);
    return this.service.getStatus(productId);
  }

  @Get(':productId/versions/:id/download')
  @ApiOperation({ summary: 'Télécharge le bundle (debug admin)' })
  @ApiParam({ name: 'productId', enum: ['fortniteclient'] })
  async downloadBundle(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.validateProduct(productId);
    const { path: filePath, filename } = await this.service.downloadBundle(productId, id);
    const stream = createReadStream(filePath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(stream);
  }

  @Get(':productId/binaries/:kind')
  @ApiOperation({ summary: 'Historique des uploads pour un kind' })
  @ApiParam({ name: 'productId', enum: ['fortniteclient'] })
  @ApiParam({ name: 'kind', enum: ['driver', 'reader', 'byovd', 'loader'] })
  async getBinariesHistory(
    @Param('productId') productId: string,
    @Param('kind') kind: string,
  ) {
    this.validateProduct(productId);
    this.validateKind(kind);
    return this.service.getBinariesHistory(productId, kind);
  }
}
