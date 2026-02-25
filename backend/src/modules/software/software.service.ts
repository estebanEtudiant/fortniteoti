import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../database/redis.service';
import * as fs from 'fs';
import * as path from 'path';

const CURRENT_KEY  = 'software:current';
const VERSIONS_KEY = 'software:versions';
const TOTAL_DL_KEY = 'software:downloads:total';
const DAILY_DL_KEY = 'software:downloads:daily';
const SETTINGS_KEY = 'admin:settings';
const MAX_VERSIONS = 20;

export interface VersionRecord {
  version: string;
  changelog: string;
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
}

@Injectable()
export class SoftwareService {
  private readonly logger = new Logger(SoftwareService.name);
  private readonly uploadDir: string;

  constructor(
    private redis: RedisService,
    private config: ConfigService,
  ) {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'software');
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async handleUpload(
    file: Express.Multer.File,
    version: string,
    changelog: string,
  ): Promise<VersionRecord> {
    // Sanitize version string to build a safe filename
    const sanitizedVersion = version.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filename = `FnOptimizer_${sanitizedVersion}.exe`;
    const destPath = path.join(this.uploadDir, filename);

    // Reject duplicate version
    const existing = await this.getVersions();
    if (existing.some((v) => v.version === version)) {
      // Remove the tmp uploaded file
      fs.unlinkSync(file.path);
      throw new BadRequestException(`La version ${version} existe déjà`);
    }

    // Move temp file to final destination
    fs.renameSync(file.path, destPath);

    const backendUrl = this.config.get<string>('BACKEND_URL', 'http://localhost:3000');
    const url = `${backendUrl}/api/v1/software/download/${filename}`;

    const record: VersionRecord = {
      version,
      changelog,
      filename,
      url,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    // Write current version
    await this.redis.set(CURRENT_KEY, JSON.stringify(record));

    // Prepend to versions history
    const versions = [record, ...existing].slice(0, MAX_VERSIONS);
    await this.redis.set(VERSIONS_KEY, JSON.stringify(versions));

    // Sync downloadUrl in admin settings
    const settingsRaw = await this.redis.get(SETTINGS_KEY);
    const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    settings.downloadUrl = url;
    await this.redis.set(SETTINGS_KEY, JSON.stringify(settings));

    this.logger.log(`Software uploaded: ${filename} v${version}`);
    return record;
  }

  async getCurrentVersion(): Promise<VersionRecord | null> {
    const raw = await this.redis.get(CURRENT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as VersionRecord;
    } catch {
      return null;
    }
  }

  async getVersions(): Promise<VersionRecord[]> {
    const raw = await this.redis.get(VERSIONS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as VersionRecord[];
    } catch {
      return [];
    }
  }

  async getStats() {
    const [totalRaw, dailyRaw, versionsRaw] = await Promise.all([
      this.redis.get(TOTAL_DL_KEY),
      this.redis.get(DAILY_DL_KEY),
      this.redis.get(VERSIONS_KEY),
    ]);

    const totalDownloads = parseInt(totalRaw || '0', 10);

    const dailyMap: Record<string, number> = dailyRaw ? JSON.parse(dailyRaw) : {};
    const now = new Date();
    const dailyDownloads: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dailyDownloads.push({ date: key, count: dailyMap[key] || 0 });
    }

    const versions: VersionRecord[] = versionsRaw ? JSON.parse(versionsRaw) : [];
    const activationsByVersion = versions.map((v) => ({
      version: v.version,
      count: 0,
    }));

    return { totalDownloads, dailyDownloads, activationsByVersion };
  }

  async deleteVersion(version: string): Promise<void> {
    const versions = await this.getVersions();
    const record = versions.find((v) => v.version === version);
    if (!record) throw new NotFoundException(`Version ${version} introuvable`);

    // Remove physical file
    const filePath = path.join(this.uploadDir, record.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Update versions list
    const updated = versions.filter((v) => v.version !== version);
    await this.redis.set(VERSIONS_KEY, JSON.stringify(updated));

    // If deleted version was current, promote next latest or clear
    const currentRaw = await this.redis.get(CURRENT_KEY);
    if (currentRaw) {
      const current = JSON.parse(currentRaw) as VersionRecord;
      if (current.version === version) {
        if (updated.length > 0) {
          await this.redis.set(CURRENT_KEY, JSON.stringify(updated[0]));
          // Also update downloadUrl in settings
          const settingsRaw = await this.redis.get(SETTINGS_KEY);
          const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
          settings.downloadUrl = updated[0].url;
          await this.redis.set(SETTINGS_KEY, JSON.stringify(settings));
        } else {
          await this.redis.del(CURRENT_KEY);
        }
      }
    }

    this.logger.log(`Software version deleted: ${record.filename} v${version}`);
  }

  async incrementDownload(filename: string): Promise<string> {
    // Security: no path traversal
    if (
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      throw new BadRequestException('Invalid filename');
    }
    if (!filename.endsWith('.exe')) {
      throw new BadRequestException('Invalid file type');
    }

    const filePath = path.join(this.uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // Atomic increment for total
    await this.redis.incr(TOTAL_DL_KEY);

    // Daily counter
    const today = new Date().toISOString().slice(0, 10);
    const raw = await this.redis.get(DAILY_DL_KEY);
    const dailyMap: Record<string, number> = raw ? JSON.parse(raw) : {};
    dailyMap[today] = (dailyMap[today] || 0) + 1;
    await this.redis.set(DAILY_DL_KEY, JSON.stringify(dailyMap));

    return filePath;
  }
}
