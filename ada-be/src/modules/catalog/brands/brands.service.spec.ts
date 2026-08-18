import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BrandsService } from './brands.service';

type BrandDelegateMock = {
  create: jest.Mock;
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  delete: jest.Mock;
};

describe('BrandsService', () => {
  let service: BrandsService;
  let brand: BrandDelegateMock;

  beforeEach(async () => {
    brand = {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        {
          provide: PrismaService,
          useValue: { brand },
        },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
  });

  it('creates a brand with a normalized unique slug', async () => {
    brand.findFirst.mockResolvedValueOnce({ id: 'existing-id' });
    brand.findFirst.mockResolvedValueOnce(null);
    brand.create.mockResolvedValue({ id: 'brand-id', slug: 'acme-2' });

    await expect(service.create({ name: '  Acmé  ' })).resolves.toMatchObject({
      id: 'brand-id',
      slug: 'acme-2',
    });
    expect(brand.create).toHaveBeenCalledWith({
      data: {
        name: 'Acmé',
        slug: 'acme-2',
        logoUrl: null,
        isActive: true,
      },
    });
  });

  it('throws when removing a missing brand', async () => {
    brand.findUnique.mockResolvedValue(null);

    await expect(service.remove('brand-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('prevents removing a brand used by products', async () => {
    brand.findUnique.mockResolvedValue({
      id: 'brand-id',
      _count: { products: 1 },
    });

    await expect(service.remove('brand-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(brand.delete).not.toHaveBeenCalled();
  });
});
