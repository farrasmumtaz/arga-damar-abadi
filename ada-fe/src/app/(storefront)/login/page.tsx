import type { Metadata } from 'next';
import Link from 'next/link';
import { loginAction } from '@/actions/auth.actions';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = { title: 'Masuk' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const returnTo = (await searchParams).returnTo ?? '/';
  const action = loginAction.bind(null, returnTo);
  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow"><span /> Selamat datang</p><h1>Masuk ke akun Anda</h1><p>Kelola pesanan dan lanjutkan pembayaran dengan aman.</p>
        <AuthForm mode="login" action={action} />
        <p className="auth-switch">Belum memiliki akun? <Link href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>Daftar sekarang</Link></p>
      </div>
      <div className="auth-aside"><span className="blueprint-grid" /><div><small>ARGA DAMAR</small><blockquote>“Pengadaan yang baik dimulai dari partner yang dapat dipercaya.”</blockquote><p>Material terkurasi · Harga transparan · Dukungan teknis</p></div></div>
    </section>
  );
}
