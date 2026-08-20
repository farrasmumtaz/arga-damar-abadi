import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryFindUnique: jest.Mock;
  let productFindUnique: jest.Mock;

  beforeEach(async () => {
    inventoryFindUnique = jest.fn();
    productFindUnique = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: {
            inventory: { findUnique: inventoryFindUnique },
            product: { findUnique: productFindUnique },
          },
        },
      ],
    }).compile();
    service = module.get(InventoryService);
  });

  it('rejects a missing inventory record', async () => {
    inventoryFindUnique.mockResolvedValue(null);
    await expect(service.findOne('product-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects movement history for a missing product', async () => {
    productFindUnique.mockResolvedValue(null);
    await expect(service.findMovements('product-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
