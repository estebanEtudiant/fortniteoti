import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  Res,
  StreamableFile,
  BadRequestException,
  NotFoundException,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Request, Response } from 'express';
import { createReadStream } from 'fs';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { AdminAuthGuard, LicenseAuthGuard, CustomerAuthGuard, JwtPayload } from '../../common/guards/auth.guard';
import { KillGuard } from '../kill-switch/kill.guard';
import { SoftwareService, ProductType, slugToProduct, bundledProductId } from './software.service';
import { SoftwareAdminService } from '../software-admin/software-admin.service';
import { SOFTWARE_UPLOAD_DIR } from './software.paths';

class UploadDto {
  @IsString() @IsNotEmpty() version: string;
  @IsString() @IsNotEmpty() changelog: string;
  @IsString() @IsNotEmpty() @IsIn(['FTN_OPTIMIZER', 'NG_LOADER', 'NG_LAUNCHER', 'MENORIA', 'LOADER', 'JRE', 'VELTHAR_LOADER', 'VELTHAR_LAUNCHER', 'SHOP_SPOOFER']) product: ProductType;
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  @IsBoolean()
  mandatory?: boolean;
}

const UPLOAD_DIR = SOFTWARE_UPLOAD_DIR;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
  Expires: '0',
};

const softwareStorage = diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `upload-${unique}${extname(file.originalname)}`);
  },
});

const softwareFileFilter = (_req: any, file: any, cb: any) => {
  const ext = extname(file.originalname).toLowerCase();
  if (ext !== '.exe' && ext !== '.jar' && ext !== '.zip') {
    return cb(new BadRequestException('Seuls les fichiers .exe, .jar et .zip sont autorisés'), false);
  }
  cb(null, true);
};

@Controller('software')
export class SoftwareController {
  private readonly logger = new Logger(SoftwareController.name);

  constructor(
    private softwareService: SoftwareService,
    private softwareAdminService: SoftwareAdminService,
  ) {}

  @Post('upload')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: softwareStorage,
      fileFilter: softwareFileFilter,
      limits: { fileSize: 200 * 1024 * 1024 },
    }),
  )
  async uploadSoftware(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDto,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    return this.softwareService.handleUpload(
      file,
      dto.version,
      dto.changelog,
      dto.product,
      dto.mandatory ?? false,
    );
  }

  private streamPayloadFile(res: Response, delivery: Awaited<ReturnType<SoftwareService['getPayloadDelivery']>>) {
    const stream = createReadStream(delivery.filePath);
    res.set({
      ...NO_CACHE_HEADERS,
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${delivery.filename}"`,
      'Content-Length': String(delivery.size),
      'X-Agent-Version': delivery.version,
      'X-Agent-Sha256': delivery.sha256,
      ETag: `"${delivery.etag}"`,
    });
    return new StreamableFile(stream);
  }

  @Get('payload/:product/meta')
  @UseGuards(KillGuard, LicenseAuthGuard)
  async getPayloadMeta(
    @Param('product') productSlug: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const product = slugToProduct(productSlug);
    const jwtPayload = (req as any).license as JwtPayload;
    res.set(NO_CACHE_HEADERS);
    return this.softwareService.getPayloadMeta(jwtPayload.sub, product);
  }

  @Get('payload/:product/file/:filename')
  @UseGuards(KillGuard, LicenseAuthGuard)
  async downloadPayloadFile(
    @Param('product') productSlug: string,
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const product = slugToProduct(productSlug);
    const jwtPayload = (req as any).license as JwtPayload;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Invalid filename');
    }

    await this.softwareService.resolvePayloadDelivery(jwtPayload.sub, product, filename);
    const delivery = await this.softwareService.getPayloadDelivery(jwtPayload.sub, product);
    return this.streamPayloadFile(res, delivery);
  }

  // Protected payload endpoint — called by licensed clients to download the binary
  @Get('payload/:product')
  @UseGuards(KillGuard, LicenseAuthGuard)
  async downloadPayload(
    @Param('product') productSlug: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const product = slugToProduct(productSlug);
    const jwtPayload = (req as any).license as JwtPayload;

    const productId = bundledProductId(product);
    if (productId) {
      return this.serveBundledPayload(req, res, jwtPayload, product, productId);
    }

    const delivery = await this.softwareService.getPayloadDelivery(jwtPayload.sub, product);
    return this.streamPayloadFile(res, delivery);
  }

  private async serveBundledPayload(
    req: Request,
    res: Response,
    jwtPayload: JwtPayload,
    product: ProductType,
    productId: string,
  ): Promise<StreamableFile> {
    const hasLicense = await this.softwareService.licenseHasProduct(jwtPayload.sub, product);
    if (!hasLicense) throw new NotFoundException(`Aucune licence ${product} active`);

    const bundlePath = await this.softwareAdminService.getActiveBundlePath(productId);
    if (!bundlePath) throw new NotFoundException(`Aucun bundle actif pour ${productId}`);

    const { readFileSync } = require('fs');
    const bundle: Buffer = readFileSync(bundlePath);

    const token = req.headers.authorization?.split(' ')[1] || '';
    const jwtBytes = Buffer.from(token, 'utf-8');
    const xored = Buffer.alloc(bundle.length);
    for (let i = 0; i < bundle.length; i++) {
      xored[i] = bundle[i] ^ jwtBytes[i % jwtBytes.length];
    }

    const activeVersion = await this.softwareAdminService.getActiveVersion(productId);
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    this.logger.log(
      `software.fetch productId=${productId} userId=${jwtPayload.sub} versionId=${activeVersion?.id ?? 'unknown'} ip=${ip}`,
    );

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(xored.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
    });

    const { Readable } = require('stream');
    return new StreamableFile(Readable.from(xored));
  }

  // Generate a short-lived download token (10 min, single use) for FTN or NG launcher
  @Get('customer/download-token')
  @UseGuards(CustomerAuthGuard)
  async getDownloadToken(
    @Req() req: Request,
    @Query('product') product: string,
  ) {
    const payload = (req as any).customer;
    const prodMap: Record<string, 'FTN_OPTIMIZER' | 'NG_LAUNCHER' | 'MENORIA' | 'VELTHAR_LAUNCHER'> = {
      ng: 'NG_LAUNCHER',
      menoria: 'MENORIA',
      velthar: 'VELTHAR_LAUNCHER',
    };
    const prod = prodMap[product] ?? 'FTN_OPTIMIZER';
    return this.softwareService.createDownloadToken(payload.customerId, prod);
  }

  // Public endpoint — consumes a download token and streams the file
  @Get('dl')
  async downloadWithToken(
    @Query('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!token) throw new BadRequestException('Token manquant');
    const { filePath, filename } = await this.softwareService.consumeDownloadToken(token);
    const stream = createReadStream(filePath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(stream);
  }

  // Customer endpoint — downloads FTN_OPTIMIZER .exe (requires active FTN_OPTIMIZER license)
  @Get('customer/ftn-optimizer')
  @UseGuards(CustomerAuthGuard)
  async downloadFtnOptimizer(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const payload = (req as any).customer;
    const filePath = await this.softwareService.getCustomerFtnPath(payload.customerId);
    const filename = filePath.split('/').pop()!;
    const stream = createReadStream(filePath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(stream);
  }

  // Customer endpoint — downloads the NG Launcher .exe (requires active NG_LOADER license)
  @Get('customer/ng-launcher')
  @UseGuards(CustomerAuthGuard)
  async downloadNgLauncher(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const payload = (req as any).customer;
    const filePath = await this.softwareService.getCustomerLauncherPath(payload.customerId);
    const filename = filePath.split('/').pop()!;
    const stream = createReadStream(filePath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(stream);
  }

  @Get('customer/fortnite-loader')
  @UseGuards(CustomerAuthGuard)
  async downloadFortniteLoader(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return this.serveCustomerLoader(req, res, 'FORTNITE_CLIENT', 'fortniteclient');
  }

  @Get('customer/spoofer')
  @UseGuards(CustomerAuthGuard)
  async downloadSpoofer(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const filePath = await this.softwareService.getCustomerSpooferPath((req as any).customer.customerId);
    res.set({ ...NO_CACHE_HEADERS, 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${filePath.split('/').pop()}"` });
    return new StreamableFile(createReadStream(filePath));
  }

  @Get('spoofer/versions')
  @UseGuards(AdminAuthGuard)
  spooferVersions() { return this.softwareService.getVersions('SHOP_SPOOFER'); }

  @Get('customer/marvel-rivals-loader')
  @UseGuards(CustomerAuthGuard)
  async downloadMarvelRivalsLoader(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return this.serveCustomerLoader(req, res, 'MARVEL_RIVALS_CLIENT', 'marvelrivalsclient');
  }

  @Get('customer/rust-loader')
  @UseGuards(CustomerAuthGuard)
  async downloadRustLoader(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return this.serveCustomerLoader(req, res, 'RUST_CLIENT', 'rustclient');
  }

  private async serveCustomerLoader(
    req: Request,
    res: Response,
    product: 'FORTNITE_CLIENT' | 'MARVEL_RIVALS_CLIENT' | 'RUST_CLIENT',
    productId: 'fortniteclient' | 'marvelrivalsclient' | 'rustclient',
  ): Promise<StreamableFile> {
    const payload = (req as any).customer;

    const hasLicense = await this.softwareService.customerHasProduct(payload.customerId, product);
    if (!hasLicense) throw new NotFoundException(`Aucune licence ${product} active`);

    const loaderPath = await this.softwareAdminService.getLatestLoaderPath(productId);
    if (!loaderPath) throw new NotFoundException('Loader non disponible');

    const crypto = require('crypto');
    const randomName = crypto.randomBytes(8).toString('hex') + '.exe';

    const stream = createReadStream(loaderPath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${randomName}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
    });

    this.logger.log(
      `loader.download product=${product} customerId=${payload.customerId} filename=${randomName}`,
    );

    return new StreamableFile(stream);
  }

  // Public endpoint — serves the current JRE zip (no auth required)
  @Get('jre')
  async downloadJre(
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const record = await this.softwareService.getCurrentVersion('JRE');
    if (!record) throw new NotFoundException('Aucun JRE disponible');
    const filePath = join(SOFTWARE_UPLOAD_DIR, record.filename);
    const { existsSync } = await import('fs');
    if (!existsSync(filePath)) throw new NotFoundException('Fichier JRE introuvable');
    const stream = createReadStream(filePath);
    res.set({
      ...NO_CACHE_HEADERS,
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${record.filename}"`,
    });
    return new StreamableFile(stream);
  }

  // Public endpoint — called by C++ client to check for updates (FTN_OPTIMIZER)
  @Get('latest')
  async getLatest() {
    const current = await this.softwareService.getCurrentVersion('FTN_OPTIMIZER');
    if (!current) throw new NotFoundException('No version available');
    return current;
  }

  @Get('versions')
  @UseGuards(AdminAuthGuard)
  async getVersions() {
    const [ftn, ng, launcher, menoria, loader, jre, veltharLoader, veltharLauncher] = await Promise.all([
      this.softwareService.getVersions('FTN_OPTIMIZER'),
      this.softwareService.getVersions('NG_LOADER'),
      this.softwareService.getVersions('NG_LAUNCHER'),
      this.softwareService.getVersions('MENORIA'),
      this.softwareService.getVersions('LOADER'),
      this.softwareService.getVersions('JRE'),
      this.softwareService.getVersions('VELTHAR_LOADER'),
      this.softwareService.getVersions('VELTHAR_LAUNCHER'),
    ]);
    return { FTN_OPTIMIZER: ftn, NG_LOADER: ng, NG_LAUNCHER: launcher, MENORIA: menoria, LOADER: loader, JRE: jre, VELTHAR_LOADER: veltharLoader, VELTHAR_LAUNCHER: veltharLauncher };
  }

  @Get('stats')
  @UseGuards(AdminAuthGuard)
  async getStats() {
    const [ftn, ng, launcher, menoria, loader, jre, veltharLoader, veltharLauncher] = await Promise.all([
      this.softwareService.getStats('FTN_OPTIMIZER'),
      this.softwareService.getStats('NG_LOADER'),
      this.softwareService.getStats('NG_LAUNCHER'),
      this.softwareService.getStats('MENORIA'),
      this.softwareService.getStats('LOADER'),
      this.softwareService.getStats('JRE'),
      this.softwareService.getStats('VELTHAR_LOADER'),
      this.softwareService.getStats('VELTHAR_LAUNCHER'),
    ]);
    return { FTN_OPTIMIZER: ftn, NG_LOADER: ng, NG_LAUNCHER: launcher, MENORIA: menoria, LOADER: loader, JRE: jre, VELTHAR_LOADER: veltharLoader, VELTHAR_LAUNCHER: veltharLauncher };
  }

  @Delete(':product/:version')
  @UseGuards(AdminAuthGuard)
  @HttpCode(204)
  async deleteVersion(
    @Param('product') productSlug: string,
    @Param('version') version: string,
  ) {
    const product = slugToProduct(productSlug);
    await this.softwareService.deleteVersion(version, product);
  }

}
