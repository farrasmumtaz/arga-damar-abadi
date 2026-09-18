import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ShippingCostService } from './shipping-cost.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { ShippingController } from './shipping.controller';

@Module({
  imports: [PromotionsModule],
  controllers: [OrdersController, ShippingController],
  providers: [OrdersService, ShippingCostService],
})
export class OrdersModule {}
