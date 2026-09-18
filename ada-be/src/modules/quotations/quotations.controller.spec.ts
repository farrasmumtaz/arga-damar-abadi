import { Test } from '@nestjs/testing';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { QuotationOrderService } from './quotation-order.service';

describe('QuotationsController', () => {
  it('should be defined', async () => {
    const module = await Test.createTestingModule({
      controllers: [QuotationsController],
      providers: [
        { provide: QuotationsService, useValue: {} },
        { provide: QuotationOrderService, useValue: {} },
      ],
    }).compile();
    expect(module.get(QuotationsController)).toBeDefined();
  });
});
