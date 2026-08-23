import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ShippingCostService } from './shipping-cost.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, ShippingCostService],
})
export class OrdersModule {}
