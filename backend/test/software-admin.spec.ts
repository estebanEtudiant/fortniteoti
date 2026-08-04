import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('SoftwareAdmin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let licenseToken: string;

  const createPeFile = (ext: string): Buffer => {
    const content = Buffer.alloc(256);
    content[0] = 0x4d; // M
    content[1] = 0x5a; // Z
    crypto.randomFillSync(content, 2, 254);
    return content;
  };

  const createNonPeFile = (): Buffer => {
    const content = Buffer.alloc(64);
    content[0] = 0x00;
    content[1] = 0x00;
    return content;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const jwtService = app.get(JwtService);
    const config = app.get(ConfigService);
    const secret = config.get<string>('jwt.secret');

    adminToken = jwtService.sign(
      { adminId: 'test-admin-id', role: 'ADMIN' },
      { secret, expiresIn: '1h' },
    );

    // Create a test license for payload test
    let license = await prisma.license.findFirst({
      where: { licenseKey: 'TEST-CHEAT-E2E-KEY-00001' },
    });
    if (!license) {
      license = await prisma.license.create({
        data: {
          licenseKey: 'TEST-CHEAT-E2E-KEY-00001',
          plan: 'DAYS_30',
          status: 'ACTIVE',
          product: 'FORTNITECLIENT',
          expiresAt: new Date(Date.now() + 30 * 86400_000),
        },
      });
    }

    licenseToken = jwtService.sign(
      { sub: license.id, key: 'TEST-*****', hwid: 'testhwid', type: 'access' },
      { secret, expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.softwareVersion.deleteMany({ where: { productId: 'fortniteclient' } });
    await prisma.softwareBinary.deleteMany({ where: { productId: 'fortniteclient' } });
    await prisma.license.deleteMany({ where: { licenseKey: 'TEST-CHEAT-E2E-KEY-00001' } });
    await app.close();
  });

  // 1. Upload d'un fichier factice -> 201 + record en base
  it('should upload a valid driver .sys file', async () => {
    const file = createPeFile('.sys');
    const tmpPath = path.join('/tmp', 'test-driver.sys');
    fs.writeFileSync(tmpPath, file);

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/software/fortniteclient/binary/driver')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', tmpPath)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('sha256');
    expect(res.body.kind).toBe('driver');

    fs.unlinkSync(tmpPath);
  });

  // 2. Upload avec kind invalide -> 400
  it('should reject upload with invalid kind', async () => {
    const file = createPeFile('.sys');
    const tmpPath = path.join('/tmp', 'test-invalid.sys');
    fs.writeFileSync(tmpPath, file);

    await request(app.getHttpServer())
      .post('/api/v1/admin/software/fortniteclient/binary/renderer')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', tmpPath)
      .expect(400);

    fs.unlinkSync(tmpPath);
  });

  // 3. Upload sans AdminGuard -> 401
  it('should reject upload without admin token', async () => {
    const file = createPeFile('.sys');
    const tmpPath = path.join('/tmp', 'test-noauth.sys');
    fs.writeFileSync(tmpPath, file);

    await request(app.getHttpServer())
      .post('/api/v1/admin/software/fortniteclient/binary/driver')
      .attach('file', tmpPath)
      .expect(401);

    fs.unlinkSync(tmpPath);
  });

  // 4. Upload d'un fichier qui ne commence pas par MZ -> 400
  it('should reject file without MZ magic', async () => {
    const file = createNonPeFile();
    const tmpPath = path.join('/tmp', 'test-badmagic.sys');
    fs.writeFileSync(tmpPath, file);

    await request(app.getHttpServer())
      .post('/api/v1/admin/software/fortniteclient/binary/driver')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', tmpPath)
      .expect(400);

    fs.unlinkSync(tmpPath);
  });

  // 5. Publish sans les 3 binaires uploadés -> 400
  it('should reject publish when binaries are missing', async () => {
    // Clean all binaries first
    await prisma.softwareBinary.deleteMany({ where: { productId: 'fortniteclient' } });

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/software/fortniteclient/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);

    expect(res.body.message).toMatch(/manquant/i);
  });

  // 6. Publish succès -> SoftwareVersion créée avec isActive=true
  it('should publish a bundle when all 3 binaries exist', async () => {
    // Upload all 3 binaries
    for (const [kind, ext] of [['driver', '.sys'], ['reader', '.exe'], ['byovd', '.sys']] as const) {
      const file = createPeFile(ext);
      const tmpPath = path.join('/tmp', `test-${kind}${ext}`);
      fs.writeFileSync(tmpPath, file);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/software/fortniteclient/binary/${kind}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', tmpPath)
        .expect(201);
      fs.unlinkSync(tmpPath);
    }

    // Publish
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/software/fortniteclient/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version: '1.0.0-test', notes: 'e2e test' })
      .expect(201);

    expect(res.body).toHaveProperty('bundleId');
    expect(res.body.version).toBe('1.0.0-test');
    expect(res.body.activated).toBe(true);
    expect(res.body).toHaveProperty('sha256');

    // Verify isActive in DB
    const active = await prisma.softwareVersion.findFirst({
      where: { productId: 'fortniteclient', isActive: true },
    });
    expect(active).not.toBeNull();
    expect(active!.id).toBe(res.body.bundleId);

    // Publish again and verify previous was deactivated
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/admin/software/fortniteclient/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version: '2.0.0-test' })
      .expect(201);

    const oldVersion = await prisma.softwareVersion.findUnique({
      where: { id: res.body.bundleId },
    });
    expect(oldVersion!.isActive).toBe(false);

    const newActive = await prisma.softwareVersion.findFirst({
      where: { productId: 'fortniteclient', isActive: true },
    });
    expect(newActive!.id).toBe(res2.body.bundleId);
  });

  // 7. GET /payload/fortniteclient returns XOR-encoded bundle with valid magic + CRC32
  it('should serve XOR-encrypted payload with valid bundle structure', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/software/payload/fortniteclient')
      .set('Authorization', `Bearer ${licenseToken}`)
      .expect(200);

    const xored = Buffer.from(res.body);
    const jwtBytes = Buffer.from(licenseToken, 'utf-8');

    // XOR-inverse
    const decoded = Buffer.alloc(xored.length);
    for (let i = 0; i < xored.length; i++) {
      decoded[i] = xored[i] ^ jwtBytes[i % jwtBytes.length];
    }

    // Check magic
    const magic = decoded.readUInt32LE(0x00);
    expect(magic).toBe(0x42343034); // "404B"

    // Check version
    const version = decoded.readUInt32LE(0x04);
    expect(version).toBe(3);

    // Check CRC32
    const driverSize = decoded.readUInt32LE(0x08);
    const readerSize = decoded.readUInt32LE(0x0c);
    const byovdSize = decoded.readUInt32LE(0x10);
    const storedCrc = decoded.readUInt32LE(0x14);

    const headerSize = 0x18;
    const payload = decoded.subarray(headerSize, headerSize + driverSize + readerSize + byovdSize);
    const computedCrc = zlib.crc32(payload) >>> 0;
    expect(storedCrc).toBe(computedCrc);
  });
});
