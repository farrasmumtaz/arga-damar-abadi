import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { MidtransClient } from '../src/modules/payments/midtrans.client';
import { AuthModule } from '../src/modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/infrastructure/prisma/prisma.module';
import { OrdersModule } from '../src/modules/orders/orders.module';
import { CartsModule } from '../src/modules/carts/carts.module';
import { QuotationsModule } from '../src/modules/quotations/quotations.module';
import { AccountRecoveryService } from '../src/modules/auth/account-recovery.service';
import { MailService } from '../src/infrastructure/mail/mail.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (databaseUrl && !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error(
    'Integration suite requires a dedicated database ending in _test',
  );
const suite = databaseUrl ? describe : describe.skip;

suite(
  'Commerce against isolated PostgreSQL (no external payments or email)',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let orders: OrdersService;
    let payments: PaymentsService;
    const sent: string[] = [];
    const config = new ConfigService({
      DATABASE_URL: databaseUrl,
      JWT_ACCESS_SECRET: 'a'.repeat(64),
      JWT_REFRESH_SECRET: 'b'.repeat(64),
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
      FRONTEND_URL: 'http://localhost:3001',
      API_PREFIX: 'api/v1',
      NODE_ENV: 'test',
    });
    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
          PrismaModule,
          AuthModule,
          OrdersModule,
          CartsModule,
          QuotationsModule,
        ],
      })
        .overrideProvider(ConfigService)
        .useValue(config)
        .overrideProvider(MailService)
        .useValue({
          assertConfigured: jest.fn(),
          send: jest.fn((_to: string, _subject: string, body: string) => {
            sent.push(body);
          }),
        })
        .compile();
      app = module.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
      );
      await app.init();
      prisma = app.get(PrismaService);
      orders = app.get(OrdersService);
      payments = new PaymentsService(
        prisma,
        config,
        new MidtransClient(config),
      );
    });
    afterAll(async () => {
      if (app) await app.close();
    });
    interface Session {
      user: { id: string };
      accessToken: string;
    }
    async function register(): Promise<Session> {
      const result = await request(app.getHttpServer() as Server)
        .post('/api/v1/auth/register')
        .send({
          email: `${randomUUID()}@example.com`,
          fullName: 'Integration Customer',
          password: 'Password123!',
        })
        .expect(201);
      return result.body as Session;
    }
    async function address(userId: string) {
      return prisma.address.create({
        data: {
          userId,
          label: 'Test',
          recipient: 'Customer',
          phone: '+628123456789',
          addressLine: 'Test address',
          province: 'Jakarta',
          city: 'Jakarta',
          district: 'Test',
          postalCode: '12345',
          isDefault: true,
        },
      });
    }
    it('prevents overselling during parallel checkout, preserves idempotency and payment stock', async () => {
      const [first, second] = await Promise.all([register(), register()]);
      const category = await prisma.category.create({
        data: { name: 'Test category', slug: randomUUID() },
      });
      const product = await prisma.product.create({
        data: {
          categoryId: category.id,
          sku: randomUUID(),
          slug: randomUUID(),
          name: 'Limited stock',
          price: 10000,
          weightGram: 1000,
          status: 'ACTIVE',
          inventory: { create: { quantity: 1 } },
          warehouseStocks: {
            create: {
              warehouseId: '11111111-1111-4111-8111-111111111111',
              quantity: 1,
            },
          },
        },
      });
      const addresses = await Promise.all([
        address(first.user.id),
        address(second.user.id),
      ]);
      for (const session of [first, second])
        await request(app.getHttpServer() as Server)
          .post('/api/v1/cart/items')
          .auth(session.accessToken, { type: 'bearer' })
          .send({ productId: product.id, quantity: 1 })
          .expect(201);
      const keys = [randomUUID(), randomUUID()];
      const results = await Promise.allSettled(
        [first, second].map((session, i) =>
          orders.checkout(session.user.id, {
            addressId: addresses[i].id,
            idempotencyKey: keys[i],
          }),
        ),
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const winningIndex = results.findIndex((r) => r.status === 'fulfilled');
      const winner = results[winningIndex];
      if (winner.status !== 'fulfilled')
        throw new Error('Missing winning order');
      const order = winner.value;
      const repeated = await orders.checkout(
        [first, second][winningIndex].user.id,
        {
          addressId: addresses[winningIndex].id,
          idempotencyKey: keys[winningIndex],
        },
      );
      expect(repeated.id).toBe(order.id);
      expect(
        (
          await prisma.inventory.findUniqueOrThrow({
            where: { productId: product.id },
          })
        ).reserved,
      ).toBe(1);
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'MIDTRANS',
          externalId: order.orderNumber,
          amount: order.total,
        },
      });
      const snapshot = {
        order_id: order.orderNumber,
        transaction_id: randomUUID(),
        gross_amount: order.total.toString(),
        status_code: '200',
        transaction_status: 'settlement',
      };
      await payments.applyStatus(snapshot);
      await payments.applyStatus(snapshot);
      await payments.applyStatus({
        ...snapshot,
        transaction_status: 'pending',
      });
      const stock = await prisma.inventory.findUniqueOrThrow({
        where: { productId: product.id },
      });
      expect(stock.quantity).toBe(0);
      expect(stock.reserved).toBe(0);
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
          .status,
      ).toBe('PAID');
    });
    it('allocates across warehouses and releases both on customer cancellation', async () => {
      const session = await register();
      const destination = await address(session.user.id);
      const warehouse = await prisma.warehouse.create({
        data: { code: randomUUID(), name: 'Test secondary' },
      });
      const category = await prisma.category.create({
        data: { name: 'Split stock', slug: randomUUID() },
      });
      const product = await prisma.product.create({
        data: {
          categoryId: category.id,
          sku: randomUUID(),
          slug: randomUUID(),
          name: 'Split stock',
          price: 10000,
          status: 'ACTIVE',
          inventory: { create: { quantity: 5 } },
          warehouseStocks: {
            create: [
              {
                warehouseId: '11111111-1111-4111-8111-111111111111',
                quantity: 2,
              },
              { warehouseId: warehouse.id, quantity: 3 },
            ],
          },
        },
      });
      await request(app.getHttpServer() as Server)
        .post('/api/v1/cart/items')
        .auth(session.accessToken, { type: 'bearer' })
        .send({ productId: product.id, quantity: 4 })
        .expect(201);
      const order = await orders.checkout(session.user.id, {
        addressId: destination.id,
        idempotencyKey: randomUUID(),
      });
      const allocations = await prisma.orderAllocation.findMany({
        where: { orderId: order.id },
      });
      expect(allocations).toHaveLength(2);
      expect(allocations.map((row) => row.quantity)).toEqual([2, 2]);
      await orders.cancel(session.user.id, order.id);
      const stocks = await prisma.warehouseStock.findMany({
        where: { productId: product.id },
      });
      expect(stocks.reduce((sum, row) => sum + row.quantity, 0)).toBe(5);
      expect(stocks.reduce((sum, row) => sum + row.reserved, 0)).toBe(0);
      expect(
        await prisma.orderAllocation.count({
          where: { orderId: order.id, state: 'RELEASED' },
        }),
      ).toBe(2);
    });
    it('consumes password reset once and revokes access and refresh sessions', async () => {
      const session = await register();
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: session.user.id },
      });
      const recovery = app.get(AccountRecoveryService);
      await recovery.request(user.email, 'RESET_PASSWORD');
      const token = /token=([a-f0-9]{64})/.exec(sent[sent.length - 1])![1];
      const results = await Promise.allSettled([
        recovery.consume(token, 'RESET_PASSWORD', 'Updated123!'),
        recovery.consume(token, 'RESET_PASSWORD', 'Updated123!'),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      await request(app.getHttpServer() as Server)
        .get('/api/v1/auth/me')
        .auth(session.accessToken, { type: 'bearer' })
        .expect(401);
      expect(
        await prisma.refreshToken.count({
          where: { userId: user.id, revokedAt: null },
        }),
      ).toBe(0);
      await request(app.getHttpServer() as Server)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'Updated123!' })
        .expect(200);
    });
  },
);
