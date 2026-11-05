import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const rows = await p.requestLog.findMany({
    where: {
      endpoint: { contains: '/auth/activate' },
      status: { gte: 400 },
      ts: { gte: since },
    },
    orderBy: { ts: 'desc' },
    take: 20,
  });
  console.log('--- failed /auth/activate (last hour) ---');
  console.log(JSON.stringify(rows, null, 2));

  const acts = await p.activationLog.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.log('--- activation_logs (last hour) ---');
  console.log(JSON.stringify(acts, null, 2));
  await p.$disconnect();
})();
