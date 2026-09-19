import type { Metadata } from 'next';
import { SessionRenewForm } from '@/components/session-renew-form';
import { safeReturnTo } from '@/lib/session-security';
export const metadata: Metadata = { title: 'Memperbarui sesi', robots: { index: false, follow: false } };
export default async function RenewSessionPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const returnTo = safeReturnTo((await searchParams).returnTo ?? '/');
  return <main className="auth-page"><SessionRenewForm returnTo={returnTo} /></main>;
}
