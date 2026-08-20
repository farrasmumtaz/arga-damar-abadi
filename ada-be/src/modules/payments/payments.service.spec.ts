import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  it('rejects a payment session for a missing order', async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: { order: { findFirst: jest.fn().mockResolvedValue(null) } },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    await expect(
      module.get(PaymentsService).createSession('user', 'order'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires Midtrans configuration', async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'order',
                status: 'PENDING_PAYMENT',
                user: {},
                items: [],
              }),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();
    await expect(
      module.get(PaymentsService).createSession('user', 'order'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
