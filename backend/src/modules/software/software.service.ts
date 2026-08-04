import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../database/redis.service';
import { PrismaService } from '../../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execFileSync } from 'child_process';
import { SOFTWARE_UPLOAD_DIR } from './software.paths';

export type ProductType = 'FTN_OPTIMIZER' | 'NG_LOADER' | 'NG_LAUNCHER' | 'MENORIA' | 'LOADER' | 'JRE' | 'VELTHAR_LOADER' | 'VELTHAR_LAUNCHER' | 'FORTNITE_CLIENT';

// Product slug used in URL params → maps to DB enum
const PRODUCT_SLUGS: Record<string, ProductType> = {
  ftnoptimizer: 'FTN_OPTIMIZER',
  ngloader: 'NG_LOADER',
  nglauncher: 'NG_LAUNCHER',
  menoria: 'MENORIA',
  menorialoader: 'MENORIA',
  loader: 'LOADER',
  jre: 'JRE',
  veltharloader: 'VELTHAR_LOADER',
  veltharlauncher: 'VELTHAR_LAUNCHER',
  fortniteclient: 'FORTNITE_CLIENT',
};

export function slugToProduct(slug: string): ProductType {
  const p = PRODUCT_SLUGS[slug.toLowerCase()];
  if (!p) throw new BadRequestException(`Produit inconnu: ${slug}`);
  return p;
}

const currentKey  = (p: ProductType) => `software:current:${p}`;
const versionsKey = (p: ProductType) => `software:versions:${p}`;
const totalDlKey  = (p: ProductType) => `software:downloads:total:${p}`;
const dailyDlKey  = (p: ProductType) => `software:downloads:daily:${p}`;
const SETTINGS_KEY = 'admin:settings';
const MAX_VERSIONS = 20;

export interface VersionRecord {
  version: string;
  changelog: string;
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
  mandatory: boolean;
  product: ProductType;
}

export interface PayloadDelivery {
  filePath: string;
  filename: string;
  version: string;
  etag: string;
  size: number;
  sha256: string;
}

export interface PayloadMeta {
  version: string;
  filename: string;
  size: number;
  sha256: string;
}

@Injectable()
export class SoftwareService {
  private readonly logger = new Logger(SoftwareService.name);
  private readonly uploadDir: string;

  constructor(
    private redis: RedisService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.uploadDir = SOFTWARE_UPLOAD_DIR;
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  private fileSha256(filePath: string): string {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  }

  private assertValidAgentJar(filePath: string, product: ProductType): void {
    if (product !== 'NG_LOADER' && product !== 'MENORIA' && product !== 'VELTHAR_LOADER') return;

    const expectedAgent = product === 'NG_LOADER' ? 'ngagent.Agent'
      : product === 'MENORIA' ? 'menoria.Agent'
      : 'velthar.Agent';
    const expectedClass = product === 'NG_LOADER' ? 'ngagent/Agent.class'
      : product === 'MENORIA' ? 'menoria/Agent.class'
      : 'velthar/Agent.class';

    try {
      execFileSync(
        'python3',
        [
          '-c',
          [
            'import sys, zipfile',
            'z = zipfile.ZipFile(sys.argv[1])',
            'names = z.namelist()',
            'if sys.argv[2] not in names:',
            '    sys.exit(2)',
            "mf = z.read('META-INF/MANIFEST.MF').decode('utf-8', errors='replace')",
            "if 'Premain-Class:' not in mf and 'Agent-Class:' not in mf:",
            '    sys.exit(3)',
            'agent = sys.argv[3]',
            "if f'Premain-Class: {agent}' not in mf.replace('\\r\\n', '\\n') and f'Agent-Class: {agent}' not in mf.replace('\\r\\n', '\\n'):",
            '    sys.exit(4)',
          ].join('\n'),
          filePath,
          expectedClass,
          expectedAgent,
        ],
        { stdio: 'pipe' },
      );
    } catch (err: unknown) {
      const code = typeof err === 'object' && err !== null && 'status' in err
        ? (err as { status?: number }).status
        : undefined;
      if (code === 2) {
        throw new BadRequestException(
          `Jar invalide: ${expectedClass} absent. Uploadez build/ngagent.jar, pas injector.jar.`,
        );
      }
      if (code === 3) {
        throw new BadRequestException('MANIFEST invalide: Premain-Class / Agent-Class manquant');
      }
      if (code === 4) {
        throw new BadRequestException(
          `MANIFEST invalide: Agent-Class doit être ${expectedAgent} (pas veltharAgent.Agent). Rebuild depuis ng-loader/agent avec le bon META-INF/MANIFEST.MF.`,
        );
      }
      throw new BadRequestException('Jar invalide ou corrompu');
    }
  }

  private buildDelivery(record: VersionRecord, filePath: string): PayloadDelivery {
    const stat = fs.statSync(filePath);
    const sha256 = this.fileSha256(filePath);
    const etag = crypto
      .createHash('sha256')
      .update(`${record.version}:${record.filename}:${stat.size}:${stat.mtimeMs}`)
      .digest('hex')
      .slice(0, 16);

    return {
      filePath,
      filename: record.filename,
      version: record.version,
      etag,
      size: stat.size,
      sha256,
    };
  }

  async handleUpload(
    file: Express.Multer.File,
    version: string,
    changelog: string,
    product: ProductType,
    mandatory = false,
  ): Promise<VersionRecord> {
    const sanitizedVersion = version.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const ext = (product === 'NG_LOADER' || product === 'MENORIA' || product === 'VELTHAR_LOADER') ? '.jar'
      : product === 'JRE' ? '.zip'
      : '.exe';
    const prefix = product === 'NG_LOADER' ? 'ngagent'
      : product === 'NG_LAUNCHER' ? 'NgLoader'
      : product === 'MENORIA' ? 'menoria'
      : product === 'LOADER' ? 'loader'
      : product === 'JRE' ? 'jre'
      : product === 'VELTHAR_LOADER' ? 'velthar'
      : product === 'VELTHAR_LAUNCHER' ? 'VeltharLoader'
      : '404Tweaks';
    const filename = `${prefix}_v${sanitizedVersion}${ext}`;
    const destPath = path.join(this.uploadDir, filename);

    const existing = await this.getVersions(product);
    if (existing.some((v) => v.version === version)) {
      fs.unlinkSync(file.path);
      throw new BadRequestException(`La version ${version} existe déjà pour ${product}`);
    }

    fs.copyFileSync(file.path, destPath);
    fs.unlinkSync(file.path);

    const stat = fs.statSync(destPath);
    if (stat.size < 4) {
      fs.unlinkSync(destPath);
      throw new BadRequestException('Fichier uploadé invalide ou vide');
    }

    try {
      this.assertValidAgentJar(destPath, product);
    } catch (err) {
      fs.unlinkSync(destPath);
      throw err;
    }

    const backendUrl = this.config.get<string>('BACKEND_URL', 'http://localhost:3000');
    const url = `${backendUrl}/api/v1/software/download/${filename}`;

    const record: VersionRecord = {
      version,
      changelog,
      filename,
      url,
      size: stat.size,
      uploadedAt: new Date().toISOString(),
      mandatory,
      product,
    };

    await this.redis.set(currentKey(product), JSON.stringify(record));

    const versions = [record, ...existing].slice(0, MAX_VERSIONS);
    await this.redis.set(versionsKey(product), JSON.stringify(versions));

    // Keep legacy settings.downloadUrl in sync for FTN_OPTIMIZER
    if (product === 'FTN_OPTIMIZER') {
      const settingsRaw = await this.redis.get(SETTINGS_KEY);
      const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
      settings.downloadUrl = url;
      await this.redis.set(SETTINGS_KEY, JSON.stringify(settings));
    }

    this.logger.log(`Software uploaded: ${filename} v${version} [${product}]`);
    return record;
  }

  async getCurrentVersion(product: ProductType): Promise<VersionRecord | null> {
    const raw = await this.redis.get(currentKey(product));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as VersionRecord;
    } catch {
      return null;
    }
  }

  async getVersions(product: ProductType): Promise<VersionRecord[]> {
    const raw = await this.redis.get(versionsKey(product));
    if (!raw) return [];
    try {
      return JSON.parse(raw) as VersionRecord[];
    } catch {
      return [];
    }
  }

  async getPayloadMeta(licenseId: string, product: ProductType): Promise<PayloadMeta> {
    const delivery = await this.resolvePayloadDelivery(licenseId, product);
    return {
      version: delivery.version,
      filename: delivery.filename,
      size: delivery.size,
      sha256: delivery.sha256,
    };
  }

  async resolvePayloadDelivery(
    licenseId: string,
    product: ProductType,
    expectedFilename?: string,
  ): Promise<PayloadDelivery> {
    const license = await this.prisma.license.findUnique({ where: { id: licenseId } });
    if (!license) throw new ForbiddenException('Licence introuvable');
    if (license.product !== product) {
      throw new ForbiddenException('Cette licence ne donne pas accès à ce produit');
    }

    const record = await this.getCurrentVersion(product);
    if (!record) throw new NotFoundException('Aucun binaire disponible pour ce produit');

    if (expectedFilename && expectedFilename !== record.filename) {
      throw new BadRequestException(
        `Version obsolete (${expectedFilename}). Version active: ${record.filename}`,
      );
    }

    const filePath = path.join(this.uploadDir, record.filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Fichier introuvable sur le serveur: ${record.filename}`);
    }

    return this.buildDelivery(record, filePath);
  }

  async getPayloadDelivery(licenseId: string, product: ProductType): Promise<PayloadDelivery> {
    const delivery = await this.resolvePayloadDelivery(licenseId, product);

    await this.redis.incr(totalDlKey(product));
    const today = new Date().toISOString().slice(0, 10);
    const raw = await this.redis.get(dailyDlKey(product));
    const dailyMap: Record<string, number> = raw ? JSON.parse(raw) : {};
    dailyMap[today] = (dailyMap[today] || 0) + 1;
    await this.redis.set(dailyDlKey(product), JSON.stringify(dailyMap));

    this.logger.log(
      `Payload served: ${delivery.filename} v${delivery.version} [${product}] (${delivery.size} bytes, sha256=${delivery.sha256.slice(0, 12)}…)`,
    );

    return delivery;
  }

  async createDownloadToken(customerId: string, product: 'FTN_OPTIMIZER' | 'NG_LAUNCHER' | 'MENORIA' | 'VELTHAR_LAUNCHER'): Promise<{ token: string; filename: string }> {
    let filePath: string;
    if (product === 'FTN_OPTIMIZER') filePath = await this.getCustomerFtnPath(customerId);
    else if (product === 'MENORIA') filePath = await this.getCustomerMenoriaPath(customerId);
    else if (product === 'VELTHAR_LAUNCHER') filePath = await this.getCustomerVeltharPath(customerId);
    else filePath = await this.getCustomerLauncherPath(customerId);
    const filename = path.basename(filePath);
    const token = crypto.randomBytes(32).toString('hex');
    await this.redis.set(`dl_token:${token}`, JSON.stringify({ filePath, filename }), 600);
    return { token, filename };
  }

  async consumeDownloadToken(token: string): Promise<{ filePath: string; filename: string }> {
    const raw = await this.redis.get(`dl_token:${token}`);
    if (!raw) throw new NotFoundException('Lien de téléchargement invalide ou expiré');
    await this.redis.del(`dl_token:${token}`);
    return JSON.parse(raw);
  }

  async getCustomerFtnPath(customerId: string): Promise<string> {
    const orders = await this.prisma.order.findMany({
      where: { customerId, status: 'COMPLETED', licenseId: { not: null } },
      select: { licenseId: true },
    });
    const licenseIds = orders.map(o => o.licenseId).filter(Boolean) as string[];
    const license = licenseIds.length > 0
      ? await this.prisma.license.findFirst({
          where: { id: { in: licenseIds }, product: 'FTN_OPTIMIZER', status: 'ACTIVE' },
        })
      : null;
    if (!license) throw new ForbiddenException('Aucune licence FTN active');

    const record = await this.getCurrentVersion('FTN_OPTIMIZER');
    if (!record) throw new NotFoundException('Aucun fichier disponible');

    const filePath = path.join(this.uploadDir, record.filename);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Fichier introuvable sur le serveur');

    await this.redis.incr(totalDlKey('FTN_OPTIMIZER'));
    const today = new Date().toISOString().slice(0, 10);
    const raw = await this.redis.get(dailyDlKey('FTN_OPTIMIZER'));
    const dailyMap: Record<string, number> = raw ? JSON.parse(raw) : {};
    dailyMap[today] = (dailyMap[today] || 0) + 1;
    await this.redis.set(dailyDlKey('FTN_OPTIMIZER'), JSON.stringify(dailyMap));

    return filePath;
  }

  async getCustomerMenoriaPath(customerId: string): Promise<string> {
    const orders = await this.prisma.order.findMany({
      where: { customerId, status: 'COMPLETED', licenseId: { not: null } },
      select: { licenseId: true },
    });
    const licenseIds = orders.map(o => o.licenseId).filter(Boolean) as string[];
    const license = licenseIds.length > 0
      ? await this.prisma.license.findFirst({
          where: { id: { in: licenseIds }, product: 'MENORIA', status: 'ACTIVE' },
        })
      : null;
    if (!license) throw new ForbiddenException('Aucune licence Menoria active');

    const record = await this.getCurrentVersion('LOADER');
    if (!record) throw new NotFoundException('Aucun loader Menoria disponible');

    const filePath = path.join(this.uploadDir, record.filename);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Fichier introuvable sur le serveur');

    await this.redis.incr(totalDlKey('MENORIA'));
    const today = new Date().toISOString().slice(0, 10);
    const raw = await this.redis.get(dailyDlKey('MENORIA'));
    const dailyMap: Record<string, number> = raw ? JSON.parse(raw) : {};
    dailyMap[today] = (dailyMap[today] || 0) + 1;
    await this.redis.set(dailyDlKey('MENORIA'), JSON.stringify(dailyMap));

    return filePath;
  }

  async getCustomerVeltharPath(customerId: string): Promise<string> {
    const orders = await this.prisma.order.findMany({
      where: { customerId, status: 'COMPLETED', licenseId: { not: null } },
      select: { licenseId: true },
    });
    const licenseIds = orders.map(o => o.licenseId).filter(Boolean) as string[];
    const license = licenseIds.length > 0
      ? await this.prisma.license.findFirst({
          where: { id: { in: licenseIds }, product: 'VELTHAR_LOADER' as any, status: 'ACTIVE' },
        })
      : null;
    if (!license) throw new ForbiddenException('Aucune licence Velthar active');

    const record = await this.getCurrentVersion('VELTHAR_LAUNCHER');
    if (!record) throw new NotFoundException('Aucun loader Velthar disponible');

    const filePath = path.join(this.uploadDir, record.filename);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Fichier introuvable sur le serveur');

    await this.redis.incr(totalDlKey('VELTHAR_LAUNCHER'));
    const today = new Date().toISOString().slice(0, 10);
    const raw = await this.redis.get(dailyDlKey('VELTHAR_LAUNCHER'));
    const dailyMap: Record<string, number> = raw ? JSON.parse(raw) : {};
    dailyMap[today] = (dailyMap[today] || 0) + 1;
    await this.redis.set(dailyDlKey('VELTHAR_LAUNCHER'), JSON.stringify(dailyMap));

    return filePath;
  }

  async getCustomerLauncherPath(customerId: string): Promise<string> {
    const orders = await this.prisma.order.findMany({
      where: { customerId, status: 'COMPLETED', licenseId: { not: null } },
      select: { licenseId: true },
    });
    const licenseIds = orders.map(o => o.licenseId).filter(Boolean) as string[];
    const license = licenseIds.length > 0
      ? await this.prisma.license.findFirst({
          where: { id: { in: licenseIds }, product: 'NG_LOADER', status: 'ACTIVE' },
        })
      : null;
    if (!license) throw new ForbiddenException('Aucune licence NG active');

    const record = await this.getCurrentVersion('NG_LAUNCHER');
    if (!record) throw new NotFoundException('Aucun launcher disponible');

    const filePath = path.join(this.uploadDir, record.filename);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Fichier introuvable sur le serveur');

    await this.redis.incr(totalDlKey('NG_LAUNCHER'));
    const today = new Date().toISOString().slice(0, 10);
    const raw = await this.redis.get(dailyDlKey('NG_LAUNCHER'));
    const dailyMap: Record<string, number> = raw ? JSON.parse(raw) : {};
    dailyMap[today] = (dailyMap[today] || 0) + 1;
    await this.redis.set(dailyDlKey('NG_LAUNCHER'), JSON.stringify(dailyMap));

    return filePath;
  }

  async getStats(product: ProductType) {
    const [totalRaw, dailyRaw, versionsRaw] = await Promise.all([
      this.redis.get(totalDlKey(product)),
      this.redis.get(dailyDlKey(product)),
      this.redis.get(versionsKey(product)),
    ]);

    const totalDownloads = parseInt(totalRaw || '0', 10);

    let dailyMap: Record<string, number> = {};
    try {
      if (dailyRaw) dailyMap = JSON.parse(dailyRaw);
    } catch {
      this.logger.warn(`daily downloads key invalid for ${product} — reset`);
      await this.redis.del(dailyDlKey(product));
    }

    const now = new Date();
    const dailyDownloads: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dailyDownloads.push({ date: key, count: dailyMap[key] || 0 });
    }

    let versions: VersionRecord[] = [];
    try {
      if (versionsRaw) versions = JSON.parse(versionsRaw);
    } catch {
      this.logger.warn(`versions key invalid for ${product} — ignored`);
    }

    return {
      product,
      totalDownloads,
      dailyDownloads,
      activationsByVersion: versions.map((v) => ({ version: v.version, count: 0 })),
    };
  }

  async deleteVersion(version: string, product: ProductType): Promise<void> {
    const versions = await this.getVersions(product);
    const record = versions.find((v) => v.version === version);
    if (!record) throw new NotFoundException(`Version ${version} introuvable pour ${product}`);

    const filePath = path.join(this.uploadDir, record.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const updated = versions.filter((v) => v.version !== version);
    await this.redis.set(versionsKey(product), JSON.stringify(updated));

    const currentRaw = await this.redis.get(currentKey(product));
    if (currentRaw) {
      const current = JSON.parse(currentRaw) as VersionRecord;
      if (current.version === version) {
        if (updated.length > 0) {
          await this.redis.set(currentKey(product), JSON.stringify(updated[0]));
          if (product === 'FTN_OPTIMIZER') {
            const settingsRaw = await this.redis.get(SETTINGS_KEY);
            const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
            settings.downloadUrl = updated[0].url;
            await this.redis.set(SETTINGS_KEY, JSON.stringify(settings));
          }
        } else {
          await this.redis.del(currentKey(product));
        }
      }
    }

    this.logger.log(`Software version deleted: ${record.filename} v${version} [${product}]`);
  }

  async incrementDownload(filename: string): Promise<string> {
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Invalid filename');
    }
    if (!filename.endsWith('.exe') && !filename.endsWith('.jar') && !filename.endsWith('.zip')) {
      throw new BadRequestException('Invalid file type');
    }

    const filePath = path.join(this.uploadDir, filename);
    if (!fs.existsSync(filePath)) throw new NotFoundException('File not found');

    // Generic download counter (not product-specific) for legacy endpoint
    await this.redis.incr('software:downloads:total:legacy');

    return filePath;
  }

  async customerHasProduct(customerId: string, product: string): Promise<boolean> {
    const orders = await this.prisma.order.findMany({
      where: { customerId, status: 'COMPLETED', licenseId: { not: null } },
      select: { licenseId: true },
    });
    const licenseIds = orders.map(o => o.licenseId).filter(Boolean) as string[];
    if (!licenseIds.length) return false;
    const license = await this.prisma.license.findFirst({
      where: { id: { in: licenseIds }, product, status: 'ACTIVE' },
    });
    return !!license;
  }
}
