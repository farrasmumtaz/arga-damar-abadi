import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { QuotationsService } from './quotations.service';

describe('QuotationsService', () => {
  it('hides quotations owned by another user', async () => {
    const module = await Test.createTestingModule({
      providers: [
        QuotationsService,
        {
          provide: PrismaService,
          useValue: {
            quotation: { findFirst: jest.fn().mockResolvedValue(null) },
          },
        },
      ],
    }).compile();
    await expect(
      module.get(QuotationsService).findOne('user', 'quotation'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
