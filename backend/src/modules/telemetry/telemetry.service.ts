import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { resolve } from 'path';
import { mkdirSync } from 'fs';
import { promises as fsp } from 'fs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { hashHwid } from '../../common/utils/crypto.utils';

// license.hwid is stored server-side hashed (HMAC-SHA256 with a secret salt) —
// see AuthService.activate(). The raw hwid the loader sends to telemetry routes
// must go through the same hash before it can match a license row.
async function attachOwners<T extends { hwid: string }>(prisma: PrismaService, hwidSalt: string, items: T[]) {
  const hwids = [...new Set(items.map(i => i.hwid).filter(Boolean))];
  if (hwids.length === 0) return items.map(i => ({ ...i, owner: null }));

  const hashedByRaw = new Map(hwids.map(h => [h, hashHwid(h, hwidSalt)]));
  const licenses = await prisma.license.findMany({
    where: { hwid: { in: [...hashedByRaw.values()] } },
    select: { hwid: true, licenseKey: true, email: true, discordId: true, product: true, status: true },
  });
  const byHashedHwid = new Map(licenses.map(l => [l.hwid as string, l]));
  return items.map(i => ({ ...i, owner: byHashedHwid.get(hashedByRaw.get(i.hwid)!) || null }));
}

const VALID_EVENTS = new Set(['load_success', 'load_failed', 'session_end', 'inject_start', 'inject_ok', 'inject_fail', 'crash']);

const DUMPS_DIR = resolve(process.cwd(), 'storage', 'telemetry', 'dumps');
const LOGS_DIR  = resolve(process.cwd(), 'storage', 'telemetry', 'logs');
const MAX_DUMP_BYTES = 50 * 1024 * 1024;
const MAX_LOG_BYTES  = 5 * 1024 * 1024;

function decodeUserId(req: { headers: { authorization?: string } }): string | undefined {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    const jwt = require('jsonwebtoken');
    const payload = jwt.decode(auth.slice(7));
    return payload?.licenseId || payload?.sub || undefined;
  } catch { return undefined; }
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly hwidSalt: string;

  constructor(
    private prisma: PrismaService,
    private alerts: AlertsService,
    config: ConfigService,
  ) {
    this.hwidSalt = config.get<string>('hwid.salt', '');
  }

  // ── Crash dumps (minidumps) ──

  async saveCrashDump(
    params: { hwid: string; os?: string; filename: string; sha1: string; bytes: number },
    body: Buffer,
    req: { headers: { authorization?: string } },
  ): Promise<{ accepted: boolean; duplicate?: boolean; id?: string }> {
    if (!Buffer.isBuffer(body) || body.length === 0) throw new BadRequestException('Empty body');
    if (body.length > MAX_DUMP_BYTES) throw new BadRequestException('Dump too large (max 50MB)');
    if (body.length !== params.bytes) throw new BadRequestException('bytes does not match uploaded body size');

    const sha1 = params.sha1.toLowerCase();
    const existing = await this.prisma.crashDump.findUnique({
      where: { hwid_sha1: { hwid: params.hwid, sha1 } },
    });
    if (existing) return { accepted: true, duplicate: true, id: existing.id };

    const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const dir = resolve(DUMPS_DIR, params.hwid);
    mkdirSync(dir, { recursive: true });
    const path = resolve(dir, `${sha1}-${safeName}`);
    await fsp.writeFile(path, body);

    const userId = decodeUserId(req);
    const row = await this.prisma.crashDump.create({
      data: {
        hwid: params.hwid,
        os: (params.os || '').substring(0, 100),
        filename: safeName,
        sha1,
        bytes: body.length,
        path,
        userId,
      },
    });

    this.logger.warn(`Crash dump reçu: hwid=${params.hwid.slice(0, 12)}… file=${safeName} bytes=${body.length}`);
    this.alerts.sendCriticalAlert(
      'BSOD — Minidump reçu',
      "Un client a crashé (BSOD) et son loader a uploadé un minidump automatiquement.",
      [
        { name: 'Fichier', value: safeName, inline: true },
        { name: 'Taille', value: `${(body.length / 1024).toFixed(0)} Ko`, inline: true },
        { name: 'OS', value: params.os || 'inconnu', inline: true },
        { name: 'HWID', value: `\`${params.hwid.slice(0, 16)}…\``, inline: false },
      ],
    ).catch(() => {});

    return { accepted: true, id: row.id };
  }

  async listCrashDumps(opts: { hwid?: string; page: number; limit: number }) {
    const where = opts.hwid ? { hwid: opts.hwid } : {};
    const [rows, total] = await Promise.all([
      this.prisma.crashDump.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.crashDump.count({ where }),
    ]);
    const items = await attachOwners(this.prisma, this.hwidSalt, rows);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async getCrashDumpFile(id: string): Promise<{ path: string; filename: string }> {
    const row = await this.prisma.crashDump.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Crash dump introuvable');
    return { path: row.path, filename: row.filename };
  }

  async deleteCrashDump(id: string): Promise<{ deleted: boolean }> {
    const row = await this.prisma.crashDump.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Crash dump introuvable');
    await fsp.unlink(row.path).catch(() => {});
    await this.prisma.crashDump.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Loader logs ──

  async saveLog(
    params: { hwid: string; os?: string; kind: string; bytes: number },
    body: string,
    req: { headers: { authorization?: string } },
  ): Promise<{ accepted: boolean; id?: string }> {
    if (typeof body !== 'string' || body.length === 0) throw new BadRequestException('Empty body');
    const bytes = Buffer.byteLength(body, 'utf8');
    if (bytes > MAX_LOG_BYTES) throw new BadRequestException('Log too large (max 5MB)');

    const dir = resolve(LOGS_DIR, params.hwid);
    mkdirSync(dir, { recursive: true });
    const filename = `${Date.now()}-${params.kind}.log`;
    const path = resolve(dir, filename);
    await fsp.writeFile(path, body, 'utf8');

    const userId = decodeUserId(req);
    const row = await this.prisma.telemetryLog.create({
      data: {
        hwid: params.hwid,
        os: (params.os || '').substring(0, 100),
        kind: params.kind,
        bytes,
        path,
        userId,
      },
    });

    return { accepted: true, id: row.id };
  }

  async listLogs(opts: { hwid?: string; page: number; limit: number }) {
    const where = opts.hwid ? { hwid: opts.hwid } : {};
    const [rows, total] = await Promise.all([
      this.prisma.telemetryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.telemetryLog.count({ where }),
    ]);
    const items = await attachOwners(this.prisma, this.hwidSalt, rows);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async getLogFile(id: string): Promise<{ path: string; filename: string }> {
    const row = await this.prisma.telemetryLog.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Log introuvable');
    return { path: row.path, filename: `${row.kind}-${row.id}.log` };
  }

  async deleteLog(id: string): Promise<{ deleted: boolean }> {
    const row = await this.prisma.telemetryLog.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Log introuvable');
    await fsp.unlink(row.path).catch(() => {});
    await this.prisma.telemetryLog.delete({ where: { id } });
    return { deleted: true };
  }

  async record(
    productId: string,
    event: string,
    os: string,
    hwid: string,
    userId?: string,
    errorText?: string,
    durationMs?: number,
  ): Promise<void> {
    if (!VALID_EVENTS.has(event)) return;

    const hwidShort = crypto.createHash('sha256').update(hwid || 'unknown').digest('hex').substring(0, 12);

    await this.prisma.telemetryEvent.create({
      data: {
        productId,
        event,
        os: (os || '').substring(0, 100),
        hwidShort,
        userId,
        errorText: errorText ? errorText.substring(0, 1000) : null,
        durationMs: durationMs ?? null,
      },
    });

    if (event === 'load_success' && userId) {
      await this.checkHwidAbuse(userId, productId);
    }
  }

  private async checkHwidAbuse(userId: string, productId: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 3600_000);
    const distinctHwids = await this.prisma.telemetryEvent.findMany({
      where: {
        userId,
        productId,
        event: 'load_success',
        ts: { gte: oneHourAgo },
      },
      select: { hwidShort: true },
      distinct: ['hwidShort'],
    });

    if (distinctHwids.length > 3) {
      this.alerts.sendCriticalAlert(
        'HWID Abuse Detected',
        `User \`${userId}\` used **${distinctHwids.length}** distinct HWIDs in the last hour on **${productId}**`,
        distinctHwids.map((h, i) => ({
          name: `HWID #${i + 1}`,
          value: `\`${h.hwidShort}\``,
          inline: true,
        })),
      ).catch(() => {});
      this.logger.warn(`HWID abuse: userId=${userId}, ${distinctHwids.length} HWIDs in 1h`);
    }
  }
}
