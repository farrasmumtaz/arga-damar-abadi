import type { Metadata } from 'next';
import Link from 'next/link';
import { loginAction } from '@/actions/auth.actions';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = { title: 'Masuk' };

interface LoginPageProps {
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const returnTo = (await searchParams).returnTo ?? '/';
  const action = loginAction.bind(null, returnTo);

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Masuk ke akun</h1>
        <p>Lanjutkan belanja, lihat pesanan, dan kelola penawaran Anda.</p>
        <AuthForm mode="login" action={action} />
        <p className="auth-switch"><Link href="/forgot-password">Lupa password?</Link></p>
        <p className="auth-switch">
          Belum memiliki akun?{' '}
          <Link href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>
            Daftar sekarang
          </Link>
        </p>
      </div>
      <div className="auth-aside"><img src="/images/electrical.webp" alt="" width="1000" height="668"/><div><h2>Kebutuhan proyek, tersimpan rapi.</h2><p>Lihat kembali pesanan dan penawaran dalam satu akun.</p></div></div>
    </section>
  );
}
