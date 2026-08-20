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
        <p className="eyebrow"><span /> Mulai berbelanja</p><h1>Buat akun baru</h1><p>Simpan detail Anda untuk proses pembayaran yang lebih cepat.</p>
        <AuthForm mode="register" action={action} />
        <p className="auth-switch">Sudah memiliki akun? <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Masuk</Link></p>
      </div>
      <div className="auth-aside register-aside"><span className="blueprint-grid" /><div><small>MEMBER BENEFIT</small><blockquote>Riwayat pesanan, checkout lebih cepat, dan dukungan khusus.</blockquote><p>Akun customer selalu gratis.</p></div></div>
    </section>
  );
}
