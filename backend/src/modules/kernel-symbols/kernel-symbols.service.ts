import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const execFileAsync = promisify(execFile);

const WANTED_SYMBOLS = [
  'HalDispatchTable',
  'MmPteBase',
  'PsLoadedModuleList',
  'MmAllocateIndependentPagesEx',
  'MmFreeIndependentPages',
  'MmSetPageProtection',
  'NtSetEaFile',
  'ExAllocatePool2',
];

const VALID_PDB_NAMES = new Set(['ntkrnlmp.pdb', 'ntoskrnl.pdb']);
const MAX_ATTEMPTS = 3;
const PDB_MAX_SIZE = 100 * 1024 * 1024; // 100 MB

@Injectable()
export class KernelSymbolsService {
  private readonly logger = new Logger(KernelSymbolsService.name);
  private readonly pdbCacheDir: string;
  private readonly extractorPath: string;
  private processing = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private alerts: AlertsService,
  ) {
    this.pdbCacheDir = config.get('PDB_CACHE_DIR', '/tmp/pdbcache');
    this.extractorPath = config.get('PDB_EXTRACTOR_PATH', '/usr/local/bin/pdb_extractor');
    fs.mkdirSync(this.pdbCacheDir, { recursive: true });
  }

  // ── Public resolve endpoint ──

  async resolve(pdbGuid: string, age: number, pdbName: string, build: string) {
    const guid = pdbGuid.toUpperCase();

    // 1. Check cache
    const cached = await this.prisma.kernelSymbolCache.findUnique({
      where: { pdbGuid_age: { pdbGuid: guid, age } },
    });

    if (cached) {
      this.prisma.kernelSymbolCache.update({
        where: { id: cached.id },
        data: { hitCount: { increment: 1 }, lastHit: new Date() },
      }).catch(() => {});
      return {
        found: true,
        validated: cached.validated,
        notSupportedReason: cached.validated ? null : cached.notSupportedReason,
        build: cached.build,
        symbols: cached.symbols,
      };
    }

    // 2. Check extraction status
    const extraction = await this.prisma.kernelSymbolExtraction.findUnique({
      where: { pdbGuid_age: { pdbGuid: guid, age } },
    });

    if (extraction) {
      if (extraction.status === 'running' || extraction.status === 'queued') {
        return { found: false, retryAfterSeconds: 30 };
      }
      if (extraction.status === 'failed') {
        if (extraction.attemptCount >= MAX_ATTEMPTS) {
          return { found: false, error: extraction.error || 'Extraction failed permanently' };
        }
        // Re-enqueue
        await this.prisma.kernelSymbolExtraction.update({
          where: { id: extraction.id },
          data: { status: 'queued', error: null },
        });
        this.enqueueExtraction(guid, age, pdbName, build);
        return { found: false, retryAfterSeconds: 30 };
      }
    }

    // 3. Create new extraction
    await this.prisma.kernelSymbolExtraction.create({
      data: { pdbGuid: guid, age, pdbName, status: 'queued' },
    }).catch(() => {
      // unique constraint — another request just created it
    });

    this.enqueueExtraction(guid, age, pdbName, build);
    return { found: false, retryAfterSeconds: 30 };
  }

  // ── Async extraction (runs in background via Redis queue) ──

  private enqueueExtraction(guid: string, age: number, pdbName: string, build: string) {
    const jobKey = `${guid}:${age}`;
    if (this.processing.has(jobKey)) return;
    this.processing.add(jobKey);

    this.processExtraction(guid, age, pdbName, build).finally(() => {
      this.processing.delete(jobKey);
    });
  }

  private async processExtraction(guid: string, age: number, pdbName: string, build: string) {
    const extraction = await this.prisma.kernelSymbolExtraction.findUnique({
      where: { pdbGuid_age: { pdbGuid: guid, age } },
    });
    if (!extraction) return;

    try {
      await this.prisma.kernelSymbolExtraction.update({
        where: { id: extraction.id },
        data: { status: 'running', startedAt: new Date(), attemptCount: { increment: 1 } },
      });

      // 1. Download PDB
      const pdbDir = path.join(this.pdbCacheDir, `${guid}${age}`);
      fs.mkdirSync(pdbDir, { recursive: true });
      const pdbPath = path.join(pdbDir, pdbName);

      if (!fs.existsSync(pdbPath)) {
        const url = `https://msdl.microsoft.com/download/symbols/${pdbName}/${guid}${age}/${pdbName}`;
        this.logger.log(`Downloading PDB: ${url}`);
        await this.downloadFile(url, pdbPath);
      }

      // 2. Extract symbols
      this.logger.log(`Extracting symbols from ${pdbPath}`);
      const { stdout } = await execFileAsync(this.extractorPath, [pdbPath, ...WANTED_SYMBOLS], {
        timeout: 60_000,
      });

      const symbols = JSON.parse(stdout.trim());
      if (!symbols || Object.keys(symbols).length === 0) {
        throw new Error('No symbols extracted');
      }

      // 3. Store in cache
      await this.prisma.kernelSymbolCache.upsert({
        where: { pdbGuid_age: { pdbGuid: guid, age } },
        create: { pdbGuid: guid, age, pdbName, build, symbols },
        update: { symbols, build, extractedAt: new Date() },
      });

      await this.prisma.kernelSymbolExtraction.update({
        where: { id: extraction.id },
        data: { status: 'done', finishedAt: new Date() },
      });

      this.logger.log(`Extraction done: ${guid}:${age} build=${build} (${Object.keys(symbols).length} symbols)`);

      this.alerts.sendAdminNotification('Kernel Symbol Extraction',
        `New PDB extracted: **${build}** (NOT validated — needs manual test)`,
        [
          { name: 'GUID', value: guid.slice(0, 16) + '...', inline: true },
          { name: 'Symbols', value: `${Object.keys(symbols).length}`, inline: true },
          { name: 'PDB', value: pdbName, inline: true },
          { name: 'Status', value: '⚠️ Unvalidated', inline: true },
        ],
      ).catch(() => {});

    } catch (err) {
      const msg = (err as Error).message || String(err);
      this.logger.error(`Extraction failed ${guid}:${age}: ${msg}`);

      const updated = await this.prisma.kernelSymbolExtraction.update({
        where: { id: extraction.id },
        data: { status: 'failed', error: msg, finishedAt: new Date() },
      });

      if (updated.attemptCount >= MAX_ATTEMPTS) {
        this.alerts.sendAdminNotification('Kernel Symbol Extraction FAILED',
          `PDB extraction failed after ${MAX_ATTEMPTS} attempts`,
          [
            { name: 'GUID', value: guid, inline: true },
            { name: 'PDB', value: pdbName, inline: true },
            { name: 'Error', value: msg.slice(0, 200), inline: false },
          ],
        ).catch(() => {});
      }
    }
  }

  private downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const get = url.startsWith('https') ? https.get : http.get;
      const doRequest = (requestUrl: string, redirects = 0) => {
        if (redirects > 5) return reject(new Error('Too many redirects'));
        get(requestUrl, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return doRequest(res.headers.location, redirects + 1);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} downloading PDB`));
          }
          let size = 0;
          const file = fs.createWriteStream(dest);
          res.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > PDB_MAX_SIZE) {
              file.destroy();
              fs.unlinkSync(dest);
              reject(new Error('PDB exceeds 100MB limit'));
            }
          });
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
          file.on('error', (e) => { fs.unlink(dest, () => {}); reject(e); });
        }).on('error', reject);
      };
      doRequest(url);
    });
  }

  // ── Admin endpoints ──

  async overview() {
    const [totalCachedBuilds, totalLookupsArr, activeExtractions, unvalidatedCount, unvalidatedWithHits, totalBsodReports] = await Promise.all([
      this.prisma.kernelSymbolCache.count(),
      this.prisma.kernelSymbolCache.aggregate({ _sum: { hitCount: true } }),
      this.prisma.kernelSymbolExtraction.count({ where: { status: { in: ['queued', 'running'] } } }),
      this.prisma.kernelSymbolCache.count({ where: { validated: false } }),
      this.prisma.kernelSymbolCache.count({ where: { validated: false, hitCount: { gt: 0 } } }),
      this.prisma.kernelSymbolCache.aggregate({ _sum: { bsodReports: true } }),
    ]);
    return {
      totalCachedBuilds,
      totalLookupsServed: totalLookupsArr._sum.hitCount || 0,
      activeExtractions,
      unvalidatedCount,
      unvalidatedWithHits,
      totalBsodReports: totalBsodReports._sum.bsodReports || 0,
    };
  }

  async listCache(opts: { build?: string; search?: string; limit?: number; offset?: number; sortBy?: string; order?: string; filter?: string }) {
    const where: any = {};
    if (opts.build) where.build = { contains: opts.build };
    if (opts.search) {
      where.OR = [
        { build: { contains: opts.search } },
        { pdbGuid: { contains: opts.search.toUpperCase() } },
      ];
    }
    if (opts.filter === 'validated') where.validated = true;
    else if (opts.filter === 'unvalidated') where.validated = false;
    else if (opts.filter === 'bsod') where.bsodReports = { gt: 0 };

    const validSorts = ['hitCount', 'lastHit', 'extractedAt', 'build'];
    const sortBy: string = (opts.sortBy && validSorts.includes(opts.sortBy)) ? opts.sortBy : 'lastHit';
    const order = opts.order === 'asc' ? 'asc' as const : 'desc' as const;

    const [rows, total] = await Promise.all([
      this.prisma.kernelSymbolCache.findMany({
        where,
        orderBy: { [sortBy as any]: order },
        take: Math.min(opts.limit || 25, 200),
        skip: opts.offset || 0,
      }),
      this.prisma.kernelSymbolCache.count({ where }),
    ]);
    return { rows, total };
  }

  async listPending() {
    return this.prisma.kernelSymbolExtraction.findMany({
      where: { status: { in: ['queued', 'running', 'failed'] } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async timeline(days = 30) {
    const since = new Date(Date.now() - days * 86400_000);
    const rows: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT DATE(extracted_at) as date,
             COUNT(*)::int as "newBuilds",
             SUM(hit_count)::int as "totalLookups"
      FROM kernel_symbol_cache
      WHERE extracted_at >= $1
      GROUP BY DATE(extracted_at)
      ORDER BY date ASC
    `, since);
    return rows.map(r => ({
      date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().slice(0, 10),
      newBuilds: Number(r.newBuilds),
      totalLookups: Number(r.totalLookups),
    }));
  }

  async invalidateCache(id: string) {
    const cached = await this.prisma.kernelSymbolCache.findUnique({ where: { id } });
    if (!cached) return { ok: false, error: 'Not found' };

    await this.prisma.kernelSymbolCache.delete({ where: { id } });

    await this.prisma.kernelSymbolExtraction.updateMany({
      where: { pdbGuid: cached.pdbGuid, age: cached.age },
      data: { status: 'queued', error: null, attemptCount: 0 },
    });

    const pdbDir = path.join(this.pdbCacheDir, `${cached.pdbGuid}${cached.age}`);
    fs.rm(pdbDir, { recursive: true, force: true }, () => {});

    return { ok: true };
  }

  async deleteExtraction(id: string) {
    const row = await this.prisma.kernelSymbolExtraction.findUnique({ where: { id } });
    if (!row) return { ok: false, error: 'Not found' };
    if (row.status === 'running') return { ok: false, error: 'Cannot delete a running extraction' };
    await this.prisma.kernelSymbolExtraction.delete({ where: { id } });
    return { ok: true };
  }

  async deleteCacheEntry(id: string) {
    const row = await this.prisma.kernelSymbolCache.findUnique({ where: { id } });
    if (!row) return { ok: false, error: 'Not found' };
    await this.prisma.kernelSymbolCache.delete({ where: { id } });
    const pdbDir = path.join(this.pdbCacheDir, `${row.pdbGuid}${row.age}`);
    fs.rm(pdbDir, { recursive: true, force: true }, () => {});
    return { ok: true };
  }

  async purgeFailedExtractions(olderThanMinutes = 60) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
    const result = await this.prisma.kernelSymbolExtraction.deleteMany({
      where: { status: 'failed', finishedAt: { lt: cutoff } },
    });
    return { ok: true, deleted: result.count };
  }

  async validateCache(id: string, validatedBy: string, notes?: string) {
    const row = await this.prisma.kernelSymbolCache.findUnique({ where: { id } });
    if (!row) return { ok: false, error: 'Not found' };

    await this.prisma.kernelSymbolCache.update({
      where: { id },
      data: { validated: true, validatedAt: new Date(), validatedBy },
    });

    this.alerts.sendAdminNotification('Build Validated',
      `Build **${row.build}** marked as validated by ${validatedBy}`,
      [
        { name: 'GUID', value: row.pdbGuid.slice(0, 16) + '...', inline: true },
        { name: 'Notes', value: notes || '—', inline: false },
      ],
    ).catch(() => {});

    return { ok: true };
  }

  async unvalidateCache(id: string, reason: string, wasBsod = false) {
    const row = await this.prisma.kernelSymbolCache.findUnique({ where: { id } });
    if (!row) return { ok: false, error: 'Not found' };

    const data: any = {
      validated: false,
      validatedAt: null,
      validatedBy: null,
      notSupportedReason: reason,
    };
    if (wasBsod) {
      data.bsodReports = { increment: 1 };
      data.lastBsodAt = new Date();
    }

    await this.prisma.kernelSymbolCache.update({ where: { id }, data });

    this.alerts.sendAdminNotification(
      wasBsod ? '🔴 Build BSOD — Unvalidated' : '⚠️ Build Unvalidated',
      `Build **${row.build}** unvalidated${wasBsod ? ' (BSOD reported)' : ''}`,
      [
        { name: 'GUID', value: row.pdbGuid.slice(0, 16) + '...', inline: true },
        { name: 'Reason', value: reason.slice(0, 200), inline: false },
        { name: 'Total BSOD reports', value: `${(row.bsodReports || 0) + (wasBsod ? 1 : 0)}`, inline: true },
      ],
    ).catch(() => {});

    return { ok: true };
  }

  async reportBsod(pdbGuid: string, age: number, bugcheckCode?: string, bugcheckArgs?: string) {
    const guid = pdbGuid.toUpperCase();
    const row = await this.prisma.kernelSymbolCache.findUnique({
      where: { pdbGuid_age: { pdbGuid: guid, age } },
    });
    if (!row) return { ok: false, error: 'Unknown build' };

    await this.prisma.kernelSymbolCache.update({
      where: { id: row.id },
      data: {
        validated: false,
        validatedAt: null,
        validatedBy: null,
        notSupportedReason: `Auto-unvalidated: BSOD reported (${bugcheckCode || 'unknown'})`,
        bsodReports: { increment: 1 },
        lastBsodAt: new Date(),
      },
    });

    const totalBsod = (row.bsodReports || 0) + 1;

    this.alerts.sendAdminNotification(
      '🔴 CRITICAL — BSOD Report Received',
      `Client BSOD on build **${row.build}** — auto-unvalidated`,
      [
        { name: 'Build', value: row.build, inline: true },
        { name: 'GUID', value: guid.slice(0, 16) + '...', inline: true },
        { name: 'Bugcheck', value: bugcheckCode || 'unknown', inline: true },
        { name: 'Args', value: bugcheckArgs || '—', inline: false },
        { name: 'Total BSOD on this build', value: `${totalBsod}`, inline: true },
      ],
    ).catch(() => {});

    this.logger.error(`BSOD report: build=${row.build} guid=${guid} bugcheck=${bugcheckCode} totalBsod=${totalBsod}`);

    return { ok: true, build: row.build, totalBsodReports: totalBsod };
  }
}
