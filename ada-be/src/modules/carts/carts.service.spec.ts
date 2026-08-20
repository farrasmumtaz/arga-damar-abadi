import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CartsService } from './carts.service';

describe('CartsService', () => {
  let service: CartsService;
  let cartFindFirst: jest.Mock;
  let productFindUnique: jest.Mock;
  let cartItemFindFirst: jest.Mock;
  let cartItemDeleteMany: jest.Mock;

  beforeEach(async () => {
    cartFindFirst = jest.fn();
    productFindUnique = jest.fn();
    cartItemFindFirst = jest.fn();
    cartItemDeleteMany = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartsService,
        {
          provide: PrismaService,
          useValue: {
            cart: { findFirst: cartFindFirst },
            product: { findUnique: productFindUnique },
            cartItem: {
              findFirst: cartItemFindFirst,
              deleteMany: cartItemDeleteMany,
            },
          },
        },
      ],
    }).compile();
    service = module.get<CartsService>(CartsService);
  });

  it('rejects adding an inactive product', async () => {
    cartFindFirst.mockResolvedValue({ id: 'cart-id' });
    productFindUnique.mockResolvedValue({
      id: 'product-id',
      status: ProductStatus.DRAFT,
      inventory: { quantity: 10, reserved: 0 },
    });
    await expect(
      service.addItem('user-id', { productId: 'product-id', quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects updating another users cart item', async () => {
    cartItemFindFirst.mockResolvedValue(null);
    await expect(
      service.updateItem('user-id', 'item-id', 2),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('clears an existing cart', async () => {
    cartFindFirst.mockResolvedValue({ id: 'cart-id' });
    cartItemDeleteMany.mockResolvedValue({ count: 2 });
    await expect(service.clear('user-id')).resolves.toBeUndefined();
    expect(cartItemDeleteMany).toHaveBeenCalledTimes(1);
  });
});
