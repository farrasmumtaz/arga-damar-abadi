import type { Prisma } from '../../generated/prisma/client';
export async function queueNotification(
  tx: Prisma.TransactionClient,
  userId: string,
  eventKey: string,
  subject: string,
  body: string,
): Promise<void> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { email: true, isActive: true, phone: true, whatsappOptInAt: true },
  });
  if (!user?.isActive) return;
  await tx.notification.createMany({
    data: [
      {
        recipient: user.email,
        eventKey,
        subject,
        body,
        userId,
        channel: 'EMAIL',
      },
      ...(user.phone && user.whatsappOptInAt
        ? [
            {
              recipient: user.phone,
              eventKey: `${eventKey}:wa`,
              subject,
              body,
              userId,
              channel: 'WHATSAPP',
            },
          ]
        : []),
    ],
    skipDuplicates: true,
  });
}
