import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/** Explicit operator-only bootstrap. Never called during app startup or deployment. */
async function main(): Promise<void> {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const connectionString = process.env.DATABASE_URL;
  if (
    !email ||
    !connectionString ||
    process.env.ADMIN_BOOTSTRAP_CONFIRM !== 'CREATE_FIRST_SUPER_ADMIN'
  ) {
    throw new Error(
      'Set DATABASE_URL, ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_CONFIRM=CREATE_FIRST_SUPER_ADMIN explicitly.',
    );
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(19371919)`;
      if (await tx.user.count({ where: { role: 'SUPER_ADMIN' } }))
        throw new Error(
          'A super admin already exists; use the user management screen instead.',
        );
      const user = await tx.user.findUnique({
        where: { email },
        select: { id: true, isActive: true, emailVerified: true },
      });
      if (!user?.isActive || !user.emailVerified)
        throw new Error(
          'Register and verify the exact active account before bootstrap.',
        );
      await tx.user.update({
        where: { id: user.id },
        data: { role: 'SUPER_ADMIN' },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'FIRST_SUPER_ADMIN_BOOTSTRAPPED',
          entityType: 'User',
          entityId: user.id,
        },
      });
    });
    console.info(
      'First super admin configured. Login again with the existing account password.',
    );
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch((error: unknown) => {
  // Database URLs/provider details must not be printed by CLI failures.
  console.error(
    error instanceof Error && !('code' in error)
      ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted]')
      : 'Admin bootstrap failed. Check configuration and database access.',
  );
  process.exitCode = 1;
});
