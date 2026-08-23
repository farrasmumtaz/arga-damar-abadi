import { ConfigService } from '@nestjs/config';
import { ShippingCostService } from './shipping-cost.service';

describe('ShippingCostService', () => {
  const config = {
    get: jest.fn((key: string, fallback: number) => {
      const values: Record<string, number> = {
        SHIPPING_BASE_COST: 20_000,
        SHIPPING_PER_KG_COST: 5_000,
      };
      return values[key] ?? fallback;
    }),
  } as unknown as ConfigService;
  const service = new ShippingCostService(config);

  it.each([
    [0, 20_000],
    [1_000, 20_000],
    [1_001, 25_000],
    [3_500, 35_000],
  ])('calculates %i grams as Rp%i', (weight, expected) => {
    expect(service.calculate(weight)).toBe(expected);
  });
});
