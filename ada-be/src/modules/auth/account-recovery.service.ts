import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { AccountTokenPurpose } from '../../generated/prisma/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MailService } from '../../infrastructure/mail/mail.service';

@Injectable()
export class AccountRecoveryService {
  private readonly logger = new Logger(AccountRecoveryService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async request(email: string, purpose: AccountTokenPurpose): Promise<void> {
    this.mail.assertConfigured();
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (
      !user?.isActive ||
      (purpose === AccountTokenPurpose.VERIFY_EMAIL && user.emailVerified)
    )
      return;
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() +
        (purpose === AccountTokenPurpose.RESET_PASSWORD ? 30 : 60 * 24) *
          60_000,
    );
    // Multiple requests cannot invalidate a link already sent; reset invalidates all siblings atomically.
    await this.prisma.accountToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(token),
        purpose,
        expiresAt,
      },
    });
    const path =
      purpose === AccountTokenPurpose.RESET_PASSWORD
        ? '/reset-password'
        : '/verify-email';
    const link = new URL(path, this.config.getOrThrow<string>('FRONTEND_URL'));
    link.searchParams.set('token', token);
    try {
      await this.mail.send(
        user.email,
        purpose === AccountTokenPurpose.RESET_PASSWORD
          ? 'Reset password Arga Damar Abadi'
          : 'Verifikasi email Arga Damar Abadi',
        `Buka tautan berikut untuk melanjutkan:\n${link.toString()}\n\nBerlaku sampai ${expiresAt.toISOString()}. Abaikan jika Anda tidak memintanya.`,
      );
    } catch {
      // SMTP delivery failures must not reveal whether the requested account exists.
      // Avoid logging addresses, token-bearing links, or provider error contents.
      this.logger.warn({ event: 'account_recovery_delivery_failed', purpose });
    }
  }

  async consume(
    token: string,
    purpose: AccountTokenPurpose,
    password?: string,
  ): Promise<void> {
    if (purpose === AccountTokenPurpose.RESET_PASSWORD && !password)
      throw new BadRequestException('Password required');
    const passwordHash =
      password === undefined
        ? undefined
        : await argon2.hash(password, { type: argon2.argon2id });
    await this.prisma.$transaction(async (tx) => {
      const record = await tx.accountToken.findUnique({
        where: { tokenHash: this.hash(token) },
      });
      if (
        !record ||
        record.purpose !== purpose ||
        record.usedAt ||
        record.expiresAt <= new Date()
      )
        throw new BadRequestException(
          'Link tidak valid atau sudah kedaluwarsa',
        );
      // Serialize reset/change/verify on the user, then atomically consume a single-use token.
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${record.userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: record.userId },
      });
      if (!user.isActive)
        throw new BadRequestException(
          'Link tidak valid atau sudah kedaluwarsa',
        );
      const consumed = await tx.accountToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1)
        throw new BadRequestException('Link sudah digunakan');
      if (purpose === AccountTokenPurpose.RESET_PASSWORD) {
        if (!passwordHash) throw new BadRequestException('Password required');
        await tx.user.update({
          where: { id: user.id },
          data: { passwordHash, tokenVersion: { increment: 1 } },
        });
        await tx.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }
      await tx.accountToken.updateMany({
        where: { userId: user.id, purpose, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: purpose,
          entityType: 'User',
          entityId: user.id,
        },
      });
    });
  }

  async change(
    userId: string,
    currentPassword: string,
    password: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user?.isActive ||
      !(await argon2.verify(user.passwordHash, currentPassword))
    )
      throw new UnauthorizedException('Password saat ini tidak sesuai');
    if (currentPassword === password)
      throw new BadRequestException('Gunakan password baru yang berbeda');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id: userId, passwordHash: user.passwordHash, isActive: true },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
      if (changed.count !== 1)
        throw new UnauthorizedException(
          'Session berubah; silakan login kembali',
        );
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.accountToken.updateMany({
        where: {
          userId,
          purpose: AccountTokenPurpose.RESET_PASSWORD,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'CHANGE_PASSWORD',
          entityType: 'User',
          entityId: userId,
        },
      });
    });
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
