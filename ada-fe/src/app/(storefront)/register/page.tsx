import type { Metadata } from 'next';
import Link from 'next/link';
import { registerAction } from '@/actions/auth.actions';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = { title: 'Daftar' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const returnTo = (await searchParams).returnTo ?? '/';
  const action = registerAction.bind(null, returnTo);
  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Buat akun baru</h1><p>Simpan alamat dan pantau kebutuhan Anda di satu tempat.</p>
        <AuthForm mode="register" action={action} />
        <p className="auth-switch">Sudah memiliki akun? <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Masuk</Link></p>
      </div>
      <div className="auth-aside register-aside"><img src="/images/project.webp" alt="" width="1000" height="758"/><div><h2>Satu akun untuk setiap kebutuhan.</h2><p>Dari pesanan harian hingga penawaran proyek.</p></div></div>
    </section>
  );
}
