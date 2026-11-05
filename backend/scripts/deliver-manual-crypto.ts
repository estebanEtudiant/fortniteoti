/**
 * Manual delivery of a crypto-paid shop order.
 * Replicates PaymentService.fulfillShopOrder for a specific orderId.
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const ORDER_ID = '3914a913-f5ab-41f8-bd77-ddf25f57a7e4';
const PAYMENT_REF = 'crypto:manual';

(async () => {
  const result = await p.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${ORDER_ID}::uuid FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: ORDER_ID } });
    if (order.status === 'COMPLETED') throw new Error('Order already COMPLETED');
    if (order.status === 'REFUNDED') throw new Error('Order is REFUNDED');

    const customer = await tx.customer.findUniqueOrThrow({ where: { id: order.customerId } });
    const items: any[] = Array.isArray(order.items) ? (order.items as any[]) : [];
    if (!items.length) throw new Error('Order has no items');

    const createdKeys: string[] = [];
    let firstLicenseId: string | null = null;

    for (const it of items) {
      const slug = String(it.game || '').toLowerCase();
      if (slug !== 'spoofer') throw new Error(`Only spoofer items supported in this script, got "${slug}"`);
      const qty = Math.min(50, Math.max(1, Math.floor(Number(it.qty) || 1)));

      for (let i = 0; i < qty; i++) {
        const key = await tx.spooferKey.findFirst({
          where: { orderId: ORDER_ID, plan: it.licensePlan, licenseId: null },
          orderBy: { createdAt: 'asc' },
        });
        if (!key) throw new Error(`No reserved SpooferKey left for order ${ORDER_ID} plan ${it.licensePlan}`);

        const license = await tx.license.create({
          data: {
            licenseKey: key.key,
            plan: it.licensePlan,
            product: 'SHOP_SPOOFER',
            email: customer.email,
            expiresAt: null,
            metadata: {
              shopGame: 'spoofer',
              shopGameName: it.gameName,
              shopPlan: it.plan,
              orderId: ORDER_ID,
              externalActivation: true,
              paidViaCrypto: true,
            },
          },
        });
        await tx.spooferKey.update({
          where: { id: key.id },
          data: { licenseId: license.id, soldAt: new Date() },
        });
        if (!firstLicenseId) firstLicenseId = license.id;
        createdKeys.push(license.licenseKey);
      }
    }

    await tx.order.update({
      where: { id: ORDER_ID },
      data: {
        status: 'COMPLETED',
        licenseId: firstLicenseId,
        stripePaymentId: PAYMENT_REF,
        completedAt: new Date(),
      },
    });

    return { customerEmail: customer.email, createdKeys, items };
  }, { timeout: 30000 });

  console.log('=== Delivered ===');
  console.log(JSON.stringify(result, null, 2));
  await p.$disconnect();
})().catch(async (e) => {
  console.error('FAILED:', e.message);
  await p.$disconnect();
  process.exit(1);
});
