import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { SpooferService } from '../src/modules/shop/spoofer.service';
import { PaymentService } from '../src/modules/payment/payment.service';
import { LicenseService } from '../src/modules/license/license.service';
import { SoftwareService } from '../src/modules/software/software.service';

const integration = process.env.SPOOFER_INTEGRATION === '1' ? describe : describe.skip;

describe('Spoofer input validation', () => {
  const service = new SpooferService({} as any);
  it('rejects unsupported durations, malformed keys and invalid prices', async () => {
    await expect(service.importKeys('life', '404-AAAAAAAAAAAA')).rejects.toThrow();
    await expect(service.importKeys('1d', 'invalid')).rejects.toThrow();
    await expect(service.updatePlan('1d', 0, true)).rejects.toThrow();
    await expect(service.updatePlan('14d', 12.3, true)).rejects.toThrow();
  });
  it('prevents generating fake provider keys', async () => {
    const licenses = new LicenseService({} as any);
    await expect(licenses.create({ product: 'SHOP_SPOOFER', plan: 'DAYS_7' })).rejects.toThrow();
    await expect(licenses.generateBatch({ product: 'SHOP_SPOOFER', plan: 'DAYS_7', count: 1 })).rejects.toThrow();
  });
  it('accepts both provider key lengths', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const stock = new SpooferService({ spooferKey: { createMany } } as any);
    await expect(stock.importKeys('14d', '404-AAAAAAAAAAAA\n404-BBBBBBBBBBBBB')).resolves.toEqual({ imported: 2, duplicates: 0 });
  });
});

integration('Spoofer PostgreSQL lifecycle', () => {
  const schema = `spoofer_test_${randomUUID().replace(/-/g, '')}`;
  let admin: PrismaClient;
  let database: PrismaClient;
  let stock: SpooferService;
  let payments: PaymentService;
  let customer: any;
  const mail = { sendLicenseKey: jest.fn().mockResolvedValue(undefined) };
  const config = { get: (_key: string, fallback: any) => fallback };
  const item = (plan = '1w', qty = 1) => ({ game: 'spoofer', gameName: 'Temp Spoofer', plan, qty, licensePlan: 'DAYS_7' });
  const makeOrder = (items = [item()]) => database.order.create({ data: {
    customerId: customer.id, plan: 'DAYS_7', amount: 899, currency: 'USD', items,
  } });
  const fulfill = (order: any) => (payments as any).fulfillShopOrder(order, customer, 'test-payment');

  beforeAll(async () => {
    require('dotenv').config();
    admin = new PrismaClient();
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const url = new URL(process.env.DATABASE_URL!);
    url.searchParams.set('schema', schema);
    database = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await database.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}", public`);
      const sql = execFileSync(resolve(__dirname, '../node_modules/.bin/prisma'), [
        'migrate', 'diff', '--from-empty', '--to-schema-datamodel', resolve(__dirname, '../prisma/schema.prisma'), '--script',
      ], { encoding: 'utf8' });
      for (const statement of sql.split(';').filter((part) => part.trim())) await tx.$executeRawUnsafe(statement);
      const migration = readFileSync(resolve(__dirname, '../prisma/migrations/20261014000000_spoofer_stock/migration.sql'), 'utf8');
      await tx.$executeRawUnsafe(migration.slice(migration.indexOf('INSERT INTO')));
    }, { timeout: 30000 });
    stock = new SpooferService(database as any);
    payments = new PaymentService(config as any, new LicenseService(database as any), database as any,
      { get: jest.fn().mockResolvedValue(null) } as any, mail as any, {} as any,
      { notifySale: jest.fn().mockResolvedValue(undefined) } as any,
      { createConversion: jest.fn().mockResolvedValue(undefined) } as any, {} as any, stock);
  }, 30000);

  beforeEach(async () => {
    await database.spooferKey.deleteMany();
    await database.activationLog.deleteMany();
    await database.license.deleteMany();
    await database.order.deleteMany();
    await database.customer.deleteMany();
    customer = await database.customer.create({ data: { email: 'spoofer-test@example.invalid', username: 'spoofer-test', passwordHash: 'not-a-password', emailVerified: true } });
    mail.sendLicenseKey.mockClear();
  });

  afterAll(async () => {
    await database?.$disconnect();
    if (admin) {
      await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.$disconnect();
    }
  });

  it.each([['1d', 'DAYS_1'], ['1w', 'DAYS_7'], ['14d', 'DAYS_14'], ['1m', 'DAYS_30']])('delivers the original key for %s', async (slug, plan) => {
    await stock.importKeys(slug, '404-AAAAAAAAAAAA');
    const order = await makeOrder([item(slug)]);
    await database.$transaction((tx) => stock.reserve(tx, order.id, [item(slug)]));
    const result = await fulfill(order);
    expect(result.licenseKeys).toEqual(['404-AAAAAAAAAAAA']);
    const license = await database.license.findFirstOrThrow();
    expect(license.plan).toBe(plan);
    expect(license.expiresAt).toBeNull();
    expect(license.metadata).toMatchObject({ externalActivation: true, orderId: order.id });
    expect(await stock.importKeys('1d', '404-AAAAAAAAAAAA')).toEqual({ imported: 0, duplicates: 1 });
    expect((await database.spooferKey.findFirstOrThrow()).plan).toBe(plan);
  });

  it('reserves the last key for only one concurrent checkout', async () => {
    await stock.importKeys('1w', '404-AAAAAAAAAAAA');
    const orders = await Promise.all([makeOrder(), makeOrder()]);
    const results = await Promise.allSettled(orders.map((order) => database.$transaction((tx) => stock.reserve(tx, order.id, [item()]))));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });

  it('prices and reserves checkout in EUR, rejecting unsupported plans and insufficient stock', async () => {
    await database.game.upsert({ where: { slug: 'spoofer' }, update: {}, create: {
      slug: 'spoofer', name: 'Temp Spoofer', chip: 'Spoofer', logo: 'Spoofer', includesFr: [], includesEn: [],
    } });
    await stock.importKeys('14d', '404-AAAAAAAAAAAA');
    const prepare = (items: any[]) => (payments as any).prepareShopOrder(customer.id, items);
    const result = await prepare([item('14d')]);
    expect(result.order.currency).toBe('EUR');
    expect(result.order.amount).toBe(1699);
    expect(result.lineItems[0].price_data.currency).toBe('eur');
    expect(await database.spooferKey.count({ where: { orderId: result.order.id } })).toBe(1);
    await expect(prepare([item('14d')])).rejects.toThrow('Stock insuffisant');
    await expect(prepare([item('3d')])).rejects.toThrow('indisponible');
    expect(await database.order.count()).toBe(1);
  });

  it('supports mixed carts in EUR and only reserves supplier keys for spoofer', async () => {
    for (const slug of ['spoofer', 'fortnite']) {
      await database.game.upsert({ where: { slug }, update: {}, create: { slug, name: slug, chip: slug, logo: slug, includesFr: [], includesEn: [] } });
    }
    await database.shopPlan.upsert({ where: { slug: '1w' }, update: {}, create: { slug: '1w', nameFr: '7 jours', nameEn: '7 days', price: 11.99, perksFr: [], perksEn: [] } });
    await stock.importKeys('1w', '404-AAAAAAAAAAAA');
    const result = await (payments as any).prepareShopOrder(customer.id, [item(), { game: 'fortnite', plan: '1w', qty: 1 }]);
    expect(result.order.currency).toBe('EUR');
    expect(result.lineItems.every((line: any) => line.price_data.currency === 'eur')).toBe(true);
    expect(await database.spooferKey.count({ where: { orderId: result.order.id } })).toBe(1);
    await fulfill(result.order);
    expect(await database.license.count()).toBe(2);
  });

  it('shows inventory statuses and recipients only in admin inventory, with filters and pagination', async () => {
    await stock.importKeys('1w', '404-AAAAAAAAAAAA\n404-BBBBBBBBBBBB\n404-CCCCCCCCCCCC');
    const deliveredOrder = await makeOrder();
    await fulfill(deliveredOrder);
    const pendingOrder = await makeOrder();
    await database.$transaction((tx) => stock.reserve(tx, pendingOrder.id, [item()]));
    const all = await stock.listKeys({});
    expect(all.pagination.total).toBe(3);
    expect(all.data.map((row) => row.status).sort()).toEqual(['available', 'delivered', 'reserved']);
    const delivered = await stock.listKeys({ status: 'delivered', plan: '1w', search: customer.email });
    expect(delivered.data).toHaveLength(1);
    expect(delivered.data[0].order?.customer.email).toBe(customer.email);
    expect(delivered.data[0].order?.id).toBe(deliveredOrder.id);
    expect(delivered.data[0].soldAt).not.toBeNull();
    expect((await stock.listKeys({ status: 'available', search: customer.email })).data).toHaveLength(0);
    expect((await stock.listKeys({ page: '2' })).data).toHaveLength(0);
    expect((await stock.listKeys({ search: pendingOrder.id })).data).toHaveLength(1);
    const publicPlans = await stock.publicPlans();
    expect(publicPlans.find((plan) => plan.id === '1w')).toMatchObject({ currency: 'EUR', price: 8.99, stock: 1 });
    expect(JSON.stringify(publicPlans)).not.toContain('404-');
    expect(JSON.stringify(publicPlans)).not.toContain(customer.email);
    await expect(stock.listKeys({ status: 'invalid' })).rejects.toThrow('Statut invalide');
  });

  it('delivers once under concurrent confirmations and returns the same keys on replay', async () => {
    await stock.importKeys('1w', '404-AAAAAAAAAAAA\n404-BBBBBBBBBBBB');
    const order = await makeOrder([item('1w', 2)]);
    await database.$transaction((tx) => stock.reserve(tx, order.id, [item('1w', 2)]));
    const results = await Promise.all([fulfill(order), fulfill(order)]);
    expect(results[0].licenseKeys.sort()).toEqual(results[1].licenseKeys.sort());
    expect(await database.license.count()).toBe(2);
    expect(mail.sendLicenseKey).toHaveBeenCalledTimes(2);
    await stock.release(order.id);
    expect(await database.spooferKey.count({ where: { orderId: null } })).toBe(0);
  });

  it('rolls back all delivery when a duration is unavailable', async () => {
    await stock.importKeys('1w', '404-AAAAAAAAAAAA');
    const order = await makeOrder([item('1w'), item('14d')]);
    await expect(fulfill(order)).rejects.toThrow('Stock insuffisant');
    expect(await database.license.count()).toBe(0);
    expect(await database.spooferKey.count({ where: { orderId: null } })).toBe(1);
    expect(mail.sendLicenseKey).not.toHaveBeenCalled();
  });

  it('releases cancelled reservations, without recycling sold keys', async () => {
    await stock.importKeys('1w', '404-AAAAAAAAAAAA');
    const order = await makeOrder();
    await database.$transaction((tx) => stock.reserve(tx, order.id, [item()]));
    await stock.release(order.id);
    await stock.release(order.id);
    expect(await database.spooferKey.count({ where: { orderId: null } })).toBe(1);
    expect((await database.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('FAILED');
  });

  it('does not deliver an unpaid Stripe session', async () => {
    const order = await makeOrder();
    await (payments as any).handleCheckoutCompleted({ payment_status: 'unpaid', metadata: { product: 'SHOP', orderId: order.id } });
    expect(await database.license.count()).toBe(0);
    expect((await database.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PENDING');
  });

  it('rejects downloading without a completed purchase, and authorizes the second key in an order', async () => {
    const software = new SoftwareService({} as any, config as any, database as any);
    await expect(software.getCustomerSpooferPath(customer.id)).rejects.toThrow('Achat du spoofer requis');
    await stock.importKeys('1w', '404-AAAAAAAAAAAA\n404-BBBBBBBBBBBB');
    const order = await makeOrder([item('1w', 2)]);
    await fulfill(order);
    const completed = await database.order.findUniqueOrThrow({ where: { id: order.id } });
    await database.license.update({ where: { id: completed.licenseId! }, data: { status: 'BANNED' } });
    jest.spyOn(software, 'getCurrentVersion').mockResolvedValue(null);
    await expect(software.getCustomerSpooferPath(customer.id)).rejects.toThrow('sera disponible');
    await expect(software.getCustomerSpooferPath(randomUUID())).rejects.toThrow('Achat du spoofer requis');
  });
});
