import 'dotenv/config';
import { readFileSync } from 'fs';
import { PrismaService } from '../src/database/prisma.service';
import { SpooferService } from '../src/modules/shop/spoofer.service';

async function main() {
  const filename = process.argv[2];
  if (!filename) throw new Error('Usage: ts-node scripts/import-spoofer-keys.ts /private/keys.json');
  const batches: Record<string, string[]> = JSON.parse(readFileSync(filename, 'utf8'));
  const database = new PrismaService();
  const stock = new SpooferService(database);
  try {
    for (const [plan, keys] of Object.entries(batches)) {
      const result = await stock.importKeys(plan, keys.join('\n'));
      console.log(`${plan}: ${result.imported} importées, ${result.duplicates} doublons`);
    }
  } finally { await database.$disconnect(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
