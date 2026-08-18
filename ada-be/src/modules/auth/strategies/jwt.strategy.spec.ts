import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('rejects inactive users', async () => {
    const config = {
      getOrThrow: jest.fn().mockReturnValue('access-secret'),
    } as unknown as ConfigService;
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-id',
          email: 'user@example.com',
          fullName: 'User Name',
          role: UserRole.CUSTOMER,
          isActive: false,
          tokenVersion: 0,
        }),
      },
    } as unknown as PrismaService;
    const strategy = new JwtStrategy(config, prisma);

    await expect(
      strategy.validate({
        sub: 'user-id',
        email: 'user@example.com',
        role: UserRole.CUSTOMER,
        tokenVersion: 0,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
