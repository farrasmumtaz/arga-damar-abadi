import { Test } from '@nestjs/testing';
import { AdminDashboardController } from './dashboard.controller';
import { AdminDashboardService } from './dashboard.service';

describe('AdminDashboardController', () => {
  it('should be defined', async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminDashboardController],
      providers: [{ provide: AdminDashboardService, useValue: {} }],
    }).compile();
    expect(module.get(AdminDashboardController)).toBeDefined();
  });
});
