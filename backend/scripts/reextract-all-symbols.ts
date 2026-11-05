/**
 * Force re-extraction of all cached kernel symbols with the new symbol set.
 * Preserves `validated` flag, `hitCount`, `bsodReports`.
 *
 * Usage: npx ts-node -T scripts/reextract-all-symbols.ts
 */
import { PrismaClient } from '@prisma/client';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();

const WANTED_SYMBOLS = [
  'HalDispatchTable',
  'MmPteBase',
  'PsLoadedModuleList',
  'MmAllocateIndependentPagesEx',
  'MmFreeIndependentPages',
  'MmSetPageProtection',
  'NtSetEaFile',
  'ExAllocatePool2',
  'PiDDBLock',
  'PiDDBCacheTable',
  'MmUnloadedDrivers',
  'EprocessVadRoot=udt:_EPROCESS.VadRoot',
];

const REQUIRED_SYMBOL_VERSION = 3;
const PDB_CACHE_DIR = process.env.PDB_CACHE_DIR || '/tmp/pdbcache';
const EXTRACTOR = process.env.PDB_EXTRACTOR_PATH || '/usr/local/bin/pdb_extractor';
const PDB_MAX_SIZE = 100 * 1024 * 1024;

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doRequest = (requestUrl: string, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(requestUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return doRequest(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let size = 0;
        const file = fs.createWriteStream(dest);
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > PDB_MAX_SIZE) {
            file.destroy();
            fs.unlinkSync(dest);
            reject(new Error('PDB > 100MB'));
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

async function main() {
  const force = process.argv.includes('--force');
  const where = force ? {} : ({ symbolVersion: { lt: REQUIRED_SYMBOL_VERSION } } as any);

  const rows = await prisma.kernelSymbolCache.findMany({
    where,
    orderBy: { lastHit: 'desc' },
  });

  console.log(`Found ${rows.length} cached builds to re-extract`);
  if (rows.length === 0) {
    await prisma.$disconnect();
    return;
  }

  fs.mkdirSync(PDB_CACHE_DIR, { recursive: true });

  let ok = 0, failed = 0;
  for (const [i, row] of rows.entries()) {
    const tag = `[${i + 1}/${rows.length}] ${row.build} (${row.pdbGuid.slice(0, 8)}..)`;
    try {
      const pdbDir = path.join(PDB_CACHE_DIR, `${row.pdbGuid}${row.age}`);
      fs.mkdirSync(pdbDir, { recursive: true });
      const pdbPath = path.join(pdbDir, row.pdbName);

      if (!fs.existsSync(pdbPath)) {
        const url = `https://msdl.microsoft.com/download/symbols/${row.pdbName}/${row.pdbGuid}${row.age}/${row.pdbName}`;
        process.stdout.write(`${tag} downloading PDB... `);
        await downloadFile(url, pdbPath);
        console.log('ok');
      }

      process.stdout.write(`${tag} extracting... `);
      const { stdout } = await execFileAsync(EXTRACTOR, [pdbPath, ...WANTED_SYMBOLS], { timeout: 60_000 });
      const symbols = JSON.parse(stdout.trim());
      const nSyms = Object.keys(symbols).length;
      const nNull = Object.values(symbols).filter(v => v === null || v === undefined).length;

      await prisma.kernelSymbolCache.update({
        where: { id: row.id },
        data: {
          symbols,
          extractedAt: new Date(),
          symbolVersion: REQUIRED_SYMBOL_VERSION,
        } as any,
      });

      console.log(`ok (${nSyms} symbols${nNull ? `, ${nNull} null` : ''})`);
      ok++;
    } catch (err) {
      console.log(`FAIL: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n=== Done: ${ok} ok, ${failed} failed ===`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
