import {
  Injectable,
  Logger,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MailService } from '../../infrastructure/mail/mail.service';

@Injectable()
export class NotificationWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(NotificationWorker.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}
  onModuleInit(): void {
    if (this.config.get<boolean>('NOTIFICATIONS_ENABLED', false)) {
      this.mail.assertConfigured();
      this.timer = setInterval(() => {
        void this.run();
      }, 15_000);
      this.timer.unref();
    }
  }
  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (let i = 0; i < 20; i++) {
        const worked = await this.prisma.$transaction(
          async (tx) => {
            const rows = await tx.$queryRaw<
              Array<{ id: string }>
            >`SELECT "id" FROM "notifications" WHERE "status" = 'QUEUED' AND "next_attempt_at" <= NOW() ORDER BY "next_attempt_at" LIMIT 1 FOR UPDATE SKIP LOCKED`;
            if (!rows[0]) return false;
            const item = await tx.notification.findUniqueOrThrow({
              where: { id: rows[0].id },
            });
            try {
              await this.mail.send(item.recipient, item.subject, item.body);
              await tx.notification.update({
                where: { id: item.id },
                data: {
                  status: 'SENT',
                  sentAt: new Date(),
                  attempts: { increment: 1 },
                },
              });
            } catch {
              const attempts = item.attempts + 1;
              await tx.notification.update({
                where: { id: item.id },
                data: {
                  attempts,
                  status: attempts >= 6 ? 'FAILED' : 'QUEUED',
                  nextAttemptAt: new Date(Date.now() + 2 ** attempts * 60_000),
                },
              });
              this.logger.error({
                event: 'notification_delivery_failed',
                notificationId: item.id,
                attempts,
              });
            }
            return true;
          },
          { timeout: 30_000 },
        );
        if (!worked) break;
      }
    } catch {
      this.logger.error({ event: 'notification_worker_failed' });
    } finally {
      this.running = false;
    }
  }
}
@Module({ providers: [NotificationWorker, MailService] })
export class NotificationsModule {}
