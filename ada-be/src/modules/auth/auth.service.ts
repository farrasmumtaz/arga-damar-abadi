import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { Prisma } from '../../generated/prisma/client';
import type { UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from './interfaces/jwt-payload.interface';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

interface TokenUser extends SessionUser {
  tokenVersion: number;
}

export interface AuthSession {
  user: SessionUser;
  accessToken: string;
  accessExpiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

const tokenUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  tokenVersion: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: number;
  private readonly refreshExpiresIn: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessExpiresIn = this.parseDuration(
      config.getOrThrow<string>('JWT_ACCESS_TTL'),
    );
    this.refreshExpiresIn = this.parseDuration(
      config.getOrThrow<string>('JWT_REFRESH_TTL'),
    );
  }

  async register(dto: RegisterDto): Promise<AuthSession> {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          fullName: dto.fullName.trim(),
          phone: dto.phone?.trim() ?? null,
          passwordHash,
        },
        select: tokenUserSelect,
      });
      return this.createSession(user);
    } catch (error: unknown) {
      this.handleRegistrationError(error);
    }
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      select: {
        ...tokenUserSelect,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createSession(user);
  }

  async refresh(token: string): Promise<AuthSession> {
    const payload = await this.verifyRefreshToken(token);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: {
        user: {
          select: {
            ...tokenUserSelect,
            isActive: true,
          },
        },
      },
    });

    if (
      !storedToken ||
      storedToken.revokedAt !== null ||
      storedToken.expiresAt <= new Date() ||
      !storedToken.user.isActive ||
      storedToken.user.tokenVersion !== payload.tokenVersion ||
      !(await argon2.verify(storedToken.tokenHash, token))
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.buildSession(storedToken.user);
    const refreshTokenHash = await argon2.hash(session.refreshToken, {
      type: argon2.argon2id,
    });
    const expiresAt = new Date(Date.now() + this.refreshExpiresIn * 1000);

    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.refreshToken.updateMany({
        where: { id: storedToken.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (revoked.count !== 1) {
        throw new UnauthorizedException('Refresh token already used');
      }

      await transaction.refreshToken.create({
        data: {
          id: session.refreshTokenId,
          userId: storedToken.userId,
          tokenHash: refreshTokenHash,
          expiresAt,
        },
      });
    });

    return this.toAuthSession(storedToken.user, session);
  }

  async logout(token?: string): Promise<void> {
    if (!token) {
      return;
    }

    try {
      const payload = await this.verifyRefreshToken(token);
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Logout remains idempotent; the cookie is cleared by the controller.
    }
  }

  private async createSession(user: TokenUser): Promise<AuthSession> {
    const session = await this.buildSession(user);
    const tokenHash = await argon2.hash(session.refreshToken, {
      type: argon2.argon2id,
    });

    await this.prisma.refreshToken.create({
      data: {
        id: session.refreshTokenId,
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + this.refreshExpiresIn * 1000),
      },
    });

    return this.toAuthSession(user, session);
  }

  private async buildSession(user: TokenUser) {
    const refreshTokenId = randomUUID();
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      jti: refreshTokenId,
      tokenVersion: user.tokenVersion,
      type: 'refresh',
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken, refreshTokenId };
  }

  private toAuthSession(
    user: TokenUser,
    tokens: {
      accessToken: string;
      refreshToken: string;
    },
  ): AuthSession {
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      accessExpiresIn: this.accessExpiresIn,
      refreshToken: tokens.refreshToken,
      refreshExpiresIn: this.refreshExpiresIn,
    };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshSecret,
      });

      if (payload.type !== 'refresh' || !payload.jti || !payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private parseDuration(value: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
    if (!match) {
      throw new Error(`Invalid JWT duration: ${value}`);
    }

    const amount = Number(match[1]);
    const unit = match[2] as 's' | 'm' | 'h' | 'd';
    const multiplier: Record<typeof unit, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return amount * multiplier[unit];
  }

  private handleRegistrationError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Email or phone already registered');
    }

    throw error;
  }
}
