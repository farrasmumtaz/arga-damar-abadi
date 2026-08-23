import { Test } from '@nestjs/testing';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

describe('QuotationsController', () => {
  it('should be defined', async () => {
    const module = await Test.createTestingModule({
      controllers: [QuotationsController],
      providers: [{ provide: QuotationsService, useValue: {} }],
    }).compile();
    expect(module.get(QuotationsController)).toBeDefined();
  });
});
