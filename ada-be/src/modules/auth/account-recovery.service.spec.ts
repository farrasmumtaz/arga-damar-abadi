import {
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MailService } from '../../infrastructure/mail/mail.service';
import { AccountRecoveryService } from './account-recovery.service';

describe('Account recovery', () => {
  const token = 'a'.repeat(64);
  const hash = createHash('sha256').update(token).digest('hex');
  function fixture() {
    const user = {
      id: 'user',
      isActive: true,
      email: 'customer@example.com',
      emailVerified: null,
      passwordHash: '',
    };
    const row = {
      id: 'token',
      userId: 'user',
      tokenHash: hash,
      purpose: 'VERIFY_EMAIL',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };
    const tx = {
      $queryRaw: jest.fn(),
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        findUniqueOrThrow: jest.fn().mockResolvedValue(user),
        update: jest.fn<
          Promise<void>,
          [
            args: {
              where: { id: string };
              data: {
                passwordHash?: string;
                tokenVersion?: { increment: number };
                emailVerified?: Date;
              };
            },
          ]
        >(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      accountToken: {
        findUnique: jest.fn().mockResolvedValue(row),
        create: jest.fn<
          Promise<void>,
          [args: { data: { tokenHash: string } }]
        >(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      refreshToken: { updateMany: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      ...tx,
      $transaction: jest.fn(
        async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
      ),
    } as unknown as PrismaService;
    const mail = {
      assertConfigured: jest.fn(),
      send: jest
        .fn<Promise<void>, [to: string, subject: string, body: string]>()
        .mockResolvedValue(undefined),
    };
    const config = new ConfigService({
      FRONTEND_URL: 'https://store.example.com',
    });
    return {
      service: new AccountRecoveryService(
        prisma,
        mail as unknown as MailService,
        config,
      ),
      tx,
      mail,
      row,
      user,
    };
  }
  it('stores token hashes and sends link only to account owner', async () => {
    const { service, tx, mail } = fixture();
    await service.request('customer@example.com', 'RESET_PASSWORD');
    const saved = tx.accountToken.create.mock.calls[0][0];
    const body = mail.send.mock.calls[0][2];
    const delivered = /token=([a-f0-9]{64})/.exec(body)![1];
    expect(saved.data.tokenHash).toBe(
      createHash('sha256').update(delivered).digest('hex'),
    );
    expect(saved.data.tokenHash).not.toBe(delivered);
  });
  it('does not expose whether an email exists', async () => {
    const { service, tx, mail } = fixture();
    tx.user.findUnique.mockResolvedValue(null);
    await expect(
      service.request('unknown@example.com', 'RESET_PASSWORD'),
    ).resolves.toBeUndefined();
    expect(mail.send).not.toHaveBeenCalled();
  });
  it('keeps the same generic outcome on SMTP delivery failures', async () => {
    const { service, mail } = fixture();
    mail.send.mockRejectedValue(
      new Error('Provider failure with private recipient details'),
    );
    const logger = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    try {
      await expect(
        service.request('customer@example.com', 'RESET_PASSWORD'),
      ).resolves.toBeUndefined();
      expect(logger).toHaveBeenCalledWith({
        event: 'account_recovery_delivery_failed',
        purpose: 'RESET_PASSWORD',
      });
    } finally {
      logger.mockRestore();
    }
  });
  it('rejects a token for a different purpose', async () => {
    const { service, tx } = fixture();
    await expect(
      service.consume(token, 'RESET_PASSWORD', 'Password123!'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('rejects expired tokens', async () => {
    const { service, tx, row } = fixture();
    tx.accountToken.findUnique.mockResolvedValue({
      ...row,
      expiresAt: new Date(0),
    });
    await expect(service.consume(token, 'VERIFY_EMAIL')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('rejects concurrent token reuse when atomic consumption loses', async () => {
    const { service, tx } = fixture();
    tx.accountToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.consume(token, 'VERIFY_EMAIL')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('hashes a reset password and revokes every prior session and sibling token', async () => {
    const { service, tx, row } = fixture();
    tx.accountToken.findUnique.mockResolvedValue({
      ...row,
      purpose: 'RESET_PASSWORD',
    });
    await service.consume(token, 'RESET_PASSWORD', 'Updated123!');
    const changed = tx.user.update.mock.calls[0][0];
    expect(changed.data.tokenVersion).toEqual({ increment: 1 });
    expect(await argon2.verify(changed.data.passwordHash!, 'Updated123!')).toBe(
      true,
    );
    expect(tx.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.accountToken.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });
  it('rejects reset requests without a new password before consuming tokens', async () => {
    const { service, tx } = fixture();
    await expect(
      service.consume(token, 'RESET_PASSWORD'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.accountToken.updateMany).not.toHaveBeenCalled();
  });
  it('never changes an account disabled after token issue', async () => {
    const { service, tx, user } = fixture();
    tx.user.findUniqueOrThrow.mockResolvedValue({ ...user, isActive: false });
    await expect(service.consume(token, 'VERIFY_EMAIL')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.accountToken.updateMany).not.toHaveBeenCalled();
  });
  it('requires the current account to change passwords', async () => {
    const { service, tx } = fixture();
    tx.user.findUnique.mockResolvedValue(null);
    await expect(
      service.change('user', 'old', 'NewPassword123!'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
