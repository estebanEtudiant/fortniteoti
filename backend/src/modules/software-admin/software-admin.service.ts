import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { BinaryKind, VALID_KINDS, VALID_PRODUCTS, CHEAT_PRODUCT_TO_LICENSE, CheatProductId } from './software-admin.dto';

// process.cwd() is the backend/ directory in both dev and production
const STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'software');

const BUNDLE_MAGIC = 0x42343034; // "404B"
const BUNDLE_VERSION = 3;

const KIND_EXTENSIONS: Record<BinaryKind, string[]> = {
  driver: ['.sys'],
  reader: ['.exe'],
  byovd: ['.sys'],
  loader: ['.exe'],
};

@Injectable()
export class SoftwareAdminService {
  private readonly logger = new Logger(SoftwareAdminService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    for (const productId of VALID_PRODUCTS) {
      for (const kind of VALID_KINDS) {
        fs.mkdirSync(this.binaryDir(productId, kind), { recursive: true });
      }
      fs.mkdirSync(this.bundleDir(productId), { recursive: true });
    }
  }

  private binaryDir(productId: string, kind: BinaryKind): string {
    return path.join(STORAGE_ROOT, productId, 'binaries', kind);
  }

  private bundleDir(productId: string): string {
    return path.join(STORAGE_ROOT, productId, 'bundles');
  }

  private fileSha256(buf: Buffer): string {
    return crypto.createHash('sha256').update(buf).digest('hex');
  }

  private validatePeMagic(buf: Buffer, kind: BinaryKind): void {
    if (buf.length < 2 || buf[0] !== 0x4d || buf[1] !== 0x5a) {
      throw new BadRequestException(
        `Le fichier ${kind} doit commencer par la signature PE (MZ / 0x4D5A)`,
      );
    }
  }

  private validateExtension(filename: string, kind: BinaryKind): void {
    const ext = path.extname(filename).toLowerCase();
    if (!KIND_EXTENSIONS[kind].includes(ext)) {
      throw new BadRequestException(
        `Extension invalide pour ${kind}: attendu ${KIND_EXTENSIONS[kind].join('/')}, reçu ${ext}`,
      );
    }
  }

  async uploadBinary(
    productId: string,
    kind: BinaryKind,
    file: Express.Multer.File,
    adminId?: string,
  ) {
    this.validateExtension(file.originalname, kind);

    const buf = fs.readFileSync(file.path);
    this.validatePeMagic(buf, kind);

    const sha256 = this.fileSha256(buf);

    const existing = await this.prisma.softwareBinary.findFirst({
      where: { productId, kind, sha256 },
    });
    if (existing) {
      fs.unlinkSync(file.path);
      const bumped = await this.prisma.softwareBinary.update({
        where: { id: existing.id },
        data: { uploadedAt: new Date(), uploadedBy: adminId ?? existing.uploadedBy },
      });
      this.logger.log(
        `software.upload productId=${productId} kind=${kind} adminId=${adminId ?? 'unknown'} sha256=${sha256} size=${existing.size} (deduplicated, uploadedAt bumped)`,
      );
      return bumped;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const record = await this.prisma.softwareBinary.create({
      data: {
        productId,
        kind,
        sha256,
        size: buf.length,
        filename: file.originalname,
        storagePath: '',
        uploadedBy: adminId,
      },
    });

    const destFilename = `${record.id}${ext}`;
    const destPath = path.join(this.binaryDir(productId, kind), destFilename);
    fs.copyFileSync(file.path, destPath);
    fs.unlinkSync(file.path);

    await this.prisma.softwareBinary.update({
      where: { id: record.id },
      data: { storagePath: destPath },
    });

    this.logger.log(
      `software.upload productId=${productId} kind=${kind} adminId=${adminId ?? 'unknown'} sha256=${sha256} size=${buf.length}`,
    );

    return {
      id: record.id,
      kind: record.kind,
      sha256: record.sha256,
      size: record.size,
      uploadedAt: record.uploadedAt,
      filename: record.filename,
    };
  }

  async publish(productId: string, notes?: string, version?: string, adminId?: string) {
    const missing: string[] = [];
    const latestBinaries: Record<string, any> = {};

    for (const kind of VALID_KINDS) {
      const latest = await this.prisma.softwareBinary.findFirst({
        where: { productId, kind },
        orderBy: { uploadedAt: 'desc' },
      });
      if (!latest) {
        missing.push(kind);
      } else {
        latestBinaries[kind] = latest;
      }
    }

    if (missing.length > 0) {
      throw new BadRequestException(
        `Binaire(s) manquant(s) pour publier : ${missing.join(', ')}. Uploadez-les d'abord.`,
      );
    }

    const driverBuf = fs.readFileSync(latestBinaries['driver'].storagePath);
    const readerBuf = fs.readFileSync(latestBinaries['reader'].storagePath);
    const byovdBuf = fs.readFileSync(latestBinaries['byovd'].storagePath);

    const concat = Buffer.concat([driverBuf, readerBuf, byovdBuf]);
    const crc = zlib.crc32(concat) >>> 0;

    const headerSize = 0x18;
    const bundle = Buffer.alloc(headerSize + concat.length);
    bundle.writeUInt32LE(BUNDLE_MAGIC, 0x00);
    bundle.writeUInt32LE(BUNDLE_VERSION, 0x04);
    bundle.writeUInt32LE(driverBuf.length, 0x08);
    bundle.writeUInt32LE(readerBuf.length, 0x0c);
    bundle.writeUInt32LE(byovdBuf.length, 0x10);
    bundle.writeUInt32LE(crc, 0x14);
    concat.copy(bundle, headerSize);

    const bundleSha256 = this.fileSha256(bundle);

    const versionCount = await this.prisma.softwareVersion.count({ where: { productId } });
    const finalVersion = version || `${versionCount + 1}.0.0`;

    const record = await this.prisma.$transaction(async (tx) => {
      await tx.softwareVersion.updateMany({
        where: { productId, isActive: true },
        data: { isActive: false },
      });

      const sv = await tx.softwareVersion.create({
        data: {
          productId,
          version: finalVersion,
          notes,
          bundlePath: '',
          bundleSha256,
          bundleSize: bundle.length,
          driverId: latestBinaries['driver'].id,
          readerId: latestBinaries['reader'].id,
          byovdId: latestBinaries['byovd'].id,
          isActive: true,
          createdBy: adminId,
        },
      });

      return sv;
    });

    const bundlePath = path.join(this.bundleDir(productId), `${record.id}.bin`);
    fs.writeFileSync(bundlePath, bundle);

    await this.prisma.softwareVersion.update({
      where: { id: record.id },
      data: { bundlePath },
    });

    this.logger.log(
      `software.publish productId=${productId} versionId=${record.id} bundleSha256=${bundleSha256} adminId=${adminId ?? 'unknown'}`,
    );

    return {
      bundleId: record.id,
      version: record.version,
      sha256: bundleSha256,
      size: bundle.length,
      publishedAt: record.createdAt,
      activated: true,
    };
  }

  async listVersions(productId: string) {
    return this.prisma.softwareVersion.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVersion(productId: string, id: string) {
    const sv = await this.prisma.softwareVersion.findFirst({
      where: { id, productId },
    });
    if (!sv) throw new NotFoundException('Version introuvable');

    const [driver, reader, byovd] = await Promise.all([
      this.prisma.softwareBinary.findUnique({ where: { id: sv.driverId } }),
      this.prisma.softwareBinary.findUnique({ where: { id: sv.readerId } }),
      this.prisma.softwareBinary.findUnique({ where: { id: sv.byovdId } }),
    ]);

    return { ...sv, composition: { driver, reader, byovd } };
  }

  async rollback(productId: string, id: string) {
    const sv = await this.prisma.softwareVersion.findFirst({
      where: { id, productId },
    });
    if (!sv) throw new NotFoundException('Version introuvable');
    if (!fs.existsSync(sv.bundlePath)) {
      throw new NotFoundException('Fichier bundle introuvable sur le disque');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.softwareVersion.updateMany({
        where: { productId, isActive: true },
        data: { isActive: false },
      });
      await tx.softwareVersion.update({
        where: { id },
        data: { isActive: true },
      });
    });

    this.logger.log(`software.rollback productId=${productId} versionId=${id}`);

    return { message: `Version ${sv.version} réactivée`, versionId: id, version: sv.version };
  }

  async getStatus(productId: string) {
    const activeVersion = await this.prisma.softwareVersion.findFirst({
      where: { productId, isActive: true },
    });

    const binaries: Record<string, any> = {};
    for (const kind of VALID_KINDS) {
      const latest = await this.prisma.softwareBinary.findFirst({
        where: { productId, kind },
        orderBy: { uploadedAt: 'desc' },
      });
      binaries[kind] = latest
        ? { sha256: latest.sha256, size: latest.size, uploadedAt: latest.uploadedAt, filename: latest.filename }
        : null;
    }

    const licenseProduct = CHEAT_PRODUCT_TO_LICENSE[productId as CheatProductId] ?? 'FORTNITE_CLIENT';

    const subscribers = await this.prisma.license.count({
      where: { product: licenseProduct, status: 'ACTIVE' },
    });

    const lastFetches = await this.prisma.activation.findMany({
      where: {
        license: { product: licenseProduct },
        status: 'SUCCESS',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        licenseId: true,
        createdAt: true,
        ipAddress: true,
      },
    });

    return {
      activeVersion: activeVersion
        ? { id: activeVersion.id, version: activeVersion.version, sha256: activeVersion.bundleSha256, size: activeVersion.bundleSize, createdAt: activeVersion.createdAt }
        : null,
      binaries,
      subscribers,
      lastFetches: lastFetches.map((f) => ({
        userId: f.licenseId,
        at: f.createdAt,
        ip: f.ipAddress,
      })),
    };
  }

  async getActiveBundlePath(productId: string): Promise<string | null> {
    const sv = await this.prisma.softwareVersion.findFirst({
      where: { productId, isActive: true },
    });
    if (!sv) return null;
    if (!fs.existsSync(sv.bundlePath)) return null;
    return sv.bundlePath;
  }

  async getActiveVersion(productId: string) {
    return this.prisma.softwareVersion.findFirst({
      where: { productId, isActive: true },
    });
  }

  async downloadBundle(productId: string, id: string): Promise<{ path: string; filename: string }> {
    const sv = await this.prisma.softwareVersion.findFirst({
      where: { id, productId },
    });
    if (!sv) throw new NotFoundException('Version introuvable');
    if (!fs.existsSync(sv.bundlePath)) {
      throw new NotFoundException('Fichier bundle introuvable sur le disque');
    }
    return { path: sv.bundlePath, filename: `${productId}_v${sv.version}.bin` };
  }

  async getBinariesHistory(productId: string, kind: BinaryKind, take = 10) {
    return this.prisma.softwareBinary.findMany({
      where: { productId, kind },
      orderBy: { uploadedAt: 'desc' },
      take,
    });
  }

  async getLatestLoaderPath(productId: string): Promise<string | null> {
    const latest = await this.prisma.softwareBinary.findFirst({
      where: { productId, kind: 'loader' },
      orderBy: { uploadedAt: 'desc' },
    });
    if (!latest || !fs.existsSync(latest.storagePath)) return null;
    return latest.storagePath;
  }
}
