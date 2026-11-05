import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Query,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, basename } from 'path';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { ActivateDto } from '../auth/auth.dto';
import { LicenseAuthGuard, JwtPayload } from '../../common/guards/auth.guard';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { KillGuard } from '../kill-switch/kill.guard';
import { SoftwareService } from '../software/software.service';
import { BinaryKind } from '../software-admin/software-admin.dto';

const RVAS_DIR = resolve(process.cwd(), 'storage', 'software', 'spoofer', 'rvas');
const BUILD_RE = /^[0-9]+(?:\.[0-9]+){1,3}$/;

@ApiTags('spoofer-v2')
@Controller('api/v2/spoofer')
export class SpooferController {
  private readonly logger = new Logger(SpooferController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly softwareService: SoftwareService,
  ) {}

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KillGuard, RateLimitGuard)
  @RateLimit({ max: 5, window: 60, keyPrefix: 'spoofer-v2-activate' })
  @ApiOperation({ summary: '404 Spoofer V2 license activation' })
  async activate(@Body() dto: ActivateDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const forced: ActivateDto = { ...dto, product: '404SPOOFER_V2' };
    return this.authService.activate(forced, ip, userAgent);
  }

  @Get('driver')
  @UseGuards(KillGuard, LicenseAuthGuard)
  @ApiOperation({ summary: '404 Spoofer V2 — raw signed driver PE (404spoof.sys)' })
  async driver(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    return this.serveLatestBinary(req, res, 'driver');
  }

  @Get('byovd')
  @UseGuards(KillGuard, LicenseAuthGuard)
  @ApiOperation({ summary: '404 Spoofer V2 — raw BYOVD PE (vulnerable signed driver)' })
  async byovd(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    return this.serveLatestBinary(req, res, 'byovd');
  }

  @Get('manager')
  @UseGuards(KillGuard, LicenseAuthGuard)
  @ApiOperation({ summary: '404 Spoofer V2 — user-mode manager.exe' })
  async manager(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    return this.serveLatestBinary(req, res, 'manager');
  }

  @Get('rvas')
  @UseGuards(KillGuard, LicenseAuthGuard)
  @ApiQuery({ name: 'build', description: 'Windows build (ex. 10.0.26200)' })
  @ApiOperation({ summary: '404 Spoofer V2 — pre-computed RVA blob for the running Windows build' })
  async rvas(
    @Query('build') build: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const jwtPayload = (req as any).license as JwtPayload;
    await this.assertLicense(jwtPayload.sub);

    if (!build || !BUILD_RE.test(build)) {
      throw new BadRequestException('Query param "build" invalide (attendu: major.minor[.build[.rev]])');
    }
    const path = resolve(RVAS_DIR, `${build}.bin`);
    if (!path.startsWith(RVAS_DIR + '/') || !existsSync(path)) {
      throw new NotFoundException(`Aucun snapshot RVAS pour build=${build}`);
    }
    const buf = readFileSync(path);
    if (buf.length < 32) {
      throw new NotFoundException(`Snapshot RVAS corrompu pour build=${build}`);
    }

    const ip = req.ip || 'unknown';
    this.logger.log(`spoofer.rvas.fetch build=${build} userId=${jwtPayload.sub} size=${buf.length} ip=${ip}`);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(buf.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
    });
    const { Readable } = require('stream');
    return new StreamableFile(Readable.from(buf));
  }

  // ─── helpers ──────────────────────────────────────────────
  private async assertLicense(userId: string): Promise<void> {
    const has = await this.softwareService.licenseHasProduct(userId, '404SPOOFER_V2');
    if (!has) throw new NotFoundException('Aucune licence 404SPOOFER_V2 active');
  }

  private async serveLatestBinary(
    req: Request,
    res: Response,
    kind: BinaryKind,
  ): Promise<StreamableFile> {
    const jwtPayload = (req as any).license as JwtPayload;
    await this.assertLicense(jwtPayload.sub);

    const row = await this.prisma.softwareBinary.findFirst({
      where: { productId: 'spoofer', kind },
      orderBy: { uploadedAt: 'desc' },
    });
    if (!row || !existsSync(row.storagePath)) {
      throw new NotFoundException(`Aucun binaire ${kind} publié pour 404 Spoofer V2`);
    }
    const buf = readFileSync(row.storagePath);
    if (buf.length < 2 || buf[0] !== 0x4d || buf[1] !== 0x5a) {
      throw new NotFoundException(`Binaire ${kind} corrompu (header PE invalide)`);
    }

    const ip = req.ip || 'unknown';
    this.logger.log(`spoofer.${kind}.fetch userId=${jwtPayload.sub} binaryId=${row.id} size=${buf.length} ip=${ip}`);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${basename(row.filename)}"`,
      'Content-Length': String(buf.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
    });
    const { Readable } = require('stream');
    return new StreamableFile(Readable.from(buf));
  }
}
