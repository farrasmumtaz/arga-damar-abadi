import { AccountSecurityForm } from '@/components/account-security-form';
export const metadata = { title: 'Verifikasi email', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <section className="container section"><div className="auth-card"><h1>Verifikasi email</h1>{token && /^[a-f0-9]{64}$/.test(token) ? <AccountSecurityForm operation="verify-email" token={token} /> : <p role="alert">Tautan tidak valid. Minta tautan baru di halaman keamanan akun.</p>}</div></section>;
}
