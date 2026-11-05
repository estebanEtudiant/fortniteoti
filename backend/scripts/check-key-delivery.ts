import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

(async () => {
  const customerId = '79c7737c-7f67-4e14-8710-c52e32fa0c14';
  const email = 'edofax855@gmail.com';

  // 1. Find any license for this customer (via orders)
  const orders = await p.order.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    include: { spooferKeys: true },
  });
  console.log('=== Orders for edofax85 ===');
  console.log(JSON.stringify(orders, null, 2));

  // 2. Find all licenses with this email OR assigned to this customer via order relation
  const licenses = await p.license.findMany({
    where: {
      OR: [
        { email: { equals: email, mode: 'insensitive' } },
        { id: { in: orders.map(o => o.licenseId).filter(Boolean) as string[] } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log('=== Licenses ===');
  console.log(JSON.stringify(licenses, null, 2));

  // 3. Search any license created recently (last 2 days) with partial key patterns
  const recent = await p.license.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 2 * 86400_000) } },
    select: { id: true, licenseKey: true, email: true, status: true, product: true, plan: true, createdAt: true, expiresAt: true, hwid: true, metadata: true },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  console.log('=== Last 48h licenses (snapshot) ===');
  console.log(JSON.stringify(recent, null, 2));

  await p.$disconnect();
})();
