import { Module } from '@nestjs/common';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { QuotationOrderService } from './quotation-order.service';
import { ShippingCostService } from '../orders/shipping-cost.service';

@Module({
  controllers: [QuotationsController],
  providers: [QuotationsService, QuotationOrderService, ShippingCostService],
})
export class QuotationsModule {}
