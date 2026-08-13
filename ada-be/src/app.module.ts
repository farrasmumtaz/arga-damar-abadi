import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './common/config/env.validation';
import { HealthModule } from './health/health.module';

import { AuthModule } from './modules/auth/auth.module';
import { CartsModule } from './modules/carts/carts.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    InventoryModule,
    CartsModule,
    OrdersModule,
    PaymentsModule,
    QuotationsModule,
  ],
})
export class AppModule {}
