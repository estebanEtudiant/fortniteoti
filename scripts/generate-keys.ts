// scripts/generate-keys.ts
// Usage: npx ts-node scripts/generate-keys.ts <plan> <count>
// Example: npx ts-node scripts/generate-keys.ts DAYS_30 10
import { PrismaClient, LicensePlan } from '@prisma/client';
import { randomBytes } from 'crypto';

function generateKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const parts: string[] = [];
  for (let s = 0; s < 5; s++) {
    const bytes = randomBytes(5);
    let seg = '';
    for (let i = 0; i < 5; i++) seg += chars[bytes[i] % chars.length];
    parts.push(seg);
  }
  return parts.join('-');
}

function planExpiry(plan: LicensePlan): Date | null {
  const now = new Date();
  switch (plan) {
    case 'DAYS_30': return new Date(now.setDate(now.getDate() + 30));
    case 'DAYS_90': return new Date(now.setDate(now.getDate() + 90));
    case 'DAYS_365': return new Date(now.setDate(now.getDate() + 365));
    case 'LIFETIME': return null;
  }
}

async function main() {
  const planArg = (process.argv[2] || 'DAYS_30').toUpperCase() as LicensePlan;
  const count = parseInt(process.argv[3] || '1', 10);

  if (!['DAYS_30', 'DAYS_90', 'DAYS_365', 'LIFETIME'].includes(planArg)) {
    console.error('Invalid plan. Use: DAYS_30 | DAYS_90 | DAYS_365 | LIFETIME');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const keys: string[] = [];

  for (let i = 0; i < count; i++) {
    const key = generateKey();
    await prisma.license.create({
      data: {
        licenseKey: key,
        plan: planArg,
        expiresAt: planExpiry(planArg),
      },
    });
    keys.push(key);
  }

  console.log(`\n✅ Generated ${count} key(s) [${planArg}]:\n`);
  keys.forEach(k => console.log(`  ${k}`));
  console.log('');

  await prisma.$disconnect();
}

main().catch(console.error);
