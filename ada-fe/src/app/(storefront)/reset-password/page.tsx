import { AccountSecurityForm } from '@/components/account-security-form';
export const metadata = { title: 'Reset password', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <section className="container section"><div className="auth-card"><h1>Reset password</h1>{token && /^[a-f0-9]{64}$/.test(token) ? <AccountSecurityForm operation="reset-password" token={token} /> : <p role="alert">Tautan tidak valid. Minta tautan reset baru.</p>}</div></section>;
}
