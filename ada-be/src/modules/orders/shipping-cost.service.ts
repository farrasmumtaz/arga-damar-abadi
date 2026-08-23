import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ShippingCostService {
  constructor(private readonly config: ConfigService) {}

  calculate(totalWeightGram: number): number {
    const baseCost = this.config.get<number>('SHIPPING_BASE_COST', 20_000);
    const perKgCost = this.config.get<number>('SHIPPING_PER_KG_COST', 5_000);
    const billableKg = Math.max(1, Math.ceil(totalWeightGram / 1_000));
    return baseCost + Math.max(0, billableKg - 1) * perKgCost;
  }
}
