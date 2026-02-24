// scripts/seed-admin.ts
// Usage: npx ts-node scripts/seed-admin.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const prisma = new PrismaClient();

  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || '' +
      '';

  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing)
  {
    console.log(`Admin '${username}' already exists.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.create({
    data: { username, passwordHash, role: 'SUPERADMIN' },
  });

  console.log(`\n✅ Admin created successfully:`);
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role:     SUPERADMIN`);
  console.log(`   ID:       ${admin.id}`);
  console.log(`\n⚠️  Change the password after first login!\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
