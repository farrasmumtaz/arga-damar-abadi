import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let userCreate: jest.Mock;
  let userFindUnique: jest.Mock;
  let refreshTokenCreate: jest.Mock;
  let signAsync: jest.Mock;

  beforeEach(async () => {
    userCreate = jest.fn();
    userFindUnique = jest.fn();
    refreshTokenCreate = jest.fn();
    signAsync = jest
      .fn()
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const configuration: Record<string, string> = {
      JWT_ACCESS_SECRET: 'access-secret-with-at-least-32-characters',
      JWT_REFRESH_SECRET: 'refresh-secret-with-at-least-32-characters',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: userCreate,
              findUnique: userFindUnique,
            },
            refreshToken: {
              create: refreshTokenCreate,
            },
          },
        },
        {
          provide: JwtService,
          useValue: { signAsync },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string): string => {
              const value = configuration[key];
              if (!value) {
                throw new Error(`Missing test configuration: ${key}`);
              }
              return value;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a customer and persists a hashed refresh token', async () => {
    userCreate.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      fullName: 'User Name',
      role: UserRole.CUSTOMER,
      tokenVersion: 0,
    });
    refreshTokenCreate.mockResolvedValue({ id: 'refresh-id' });

    const session = await service.register({
      email: ' USER@Example.com ',
      fullName: ' User Name ',
      password: 'StrongPassword1!',
    });

    expect(userCreate).toHaveBeenCalledTimes(1);
    expect(refreshTokenCreate).toHaveBeenCalledTimes(1);
    expect(session).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessExpiresIn: 900,
      refreshExpiresIn: 604800,
    });
  });

  it('rejects login for an unknown user', async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
