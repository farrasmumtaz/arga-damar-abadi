import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ProductSortBy, ProductSortDirection } from './dto/query-product.dto';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let findUnique: jest.Mock;
  let findFirst: jest.Mock;
  let deleteProduct: jest.Mock;

  beforeEach(async () => {
    findUnique = jest.fn();
    findFirst = jest.fn();
    deleteProduct = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findUnique,
              findFirst,
              delete: deleteProduct,
            },
          },
        },
      ],
    }).compile();
    service = module.get<ProductsService>(ProductsService);
  });

  it('rejects an invalid price range before querying', async () => {
    await expect(
      service.findAll(
        {
          minPrice: 200,
          maxPrice: 100,
          page: 1,
          limit: 20,
          sortBy: ProductSortBy.CREATED_AT,
          sortDirection: ProductSortDirection.DESC,
        },
        true,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns not found for an unavailable public slug', async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.findOneBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('prevents deleting a product referenced by an order', async () => {
    findUnique.mockResolvedValue({
      id: 'product-id',
      _count: { cartItems: 0, orderItems: 1, quotationItems: 0 },
    });
    await expect(service.remove('product-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(deleteProduct).not.toHaveBeenCalled();
  });
});
