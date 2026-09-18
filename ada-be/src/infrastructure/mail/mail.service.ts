import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  assertConfigured(): void {
    if (
      !this.config.get<string>('SMTP_HOST') ||
      !this.config.get<string>('MAIL_FROM')
    ) {
      throw new ServiceUnavailableException('Email delivery is not configured');
    }
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    this.assertConfigured();
    const user = this.config.get<string>('SMTP_USER');
    const transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: this.config.get<boolean>('SMTP_SECURE', false),
      requireTLS: this.config.get<string>('NODE_ENV') === 'production',
      auth: user
        ? { user, pass: this.config.getOrThrow<string>('SMTP_PASSWORD') }
        : undefined,
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    try {
      await transporter.sendMail({
        from: this.config.getOrThrow<string>('MAIL_FROM'),
        to,
        subject,
        text,
      });
    } catch {
      throw new ServiceUnavailableException(
        'Email delivery is temporarily unavailable',
      );
    } finally {
      transporter.close();
    }
  }
}
