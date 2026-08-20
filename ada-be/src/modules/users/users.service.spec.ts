import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let userFindUnique: jest.Mock;
  let addressFindFirst: jest.Mock;

  beforeEach(async () => {
    userFindUnique = jest.fn();
    addressFindFirst = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: userFindUnique },
            address: { findFirst: addressFindFirst },
          },
        },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('rejects a missing profile', async () => {
    userFindUnique.mockResolvedValue(null);
    await expect(service.findProfile('user-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects updating an address owned by another user', async () => {
    addressFindFirst.mockResolvedValue(null);
    await expect(
      service.updateAddress('user-id', 'address-id', { label: 'Office' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
