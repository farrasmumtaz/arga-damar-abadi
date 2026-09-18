'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { accountSecurityAction, type SecurityOperation } from '@/actions/account-security.actions';

const labels: Record<SecurityOperation, string> = {
  'forgot-password': 'Kirim tautan reset', 'reset-password': 'Simpan password baru',
  'verify-email': 'Verifikasi email', 'change-password': 'Ubah password', 'verification/request': 'Kirim verifikasi email',
};

export function AccountSecurityForm({ operation, token }: { operation: SecurityOperation; token?: string }) {
  const [state, action, pending] = useActionState(accountSecurityAction.bind(null, operation), {});
  const [visible, setVisible] = useState(false);
  const changing = operation === 'reset-password' || operation === 'change-password';
  if (state.success) return <div role="status"><p className="form-success">{state.success}</p>{changing && <Link href="/login">Masuk kembali</Link>}</div>;
  return <form action={action} className="auth-form">
    {token && <input type="hidden" name="token" value={token} />}
    {operation === 'forgot-password' && <label className="field">Email<input name="email" type="email" autoComplete="email" maxLength={255} required /></label>}
    {operation === 'change-password' && <label className="field">Password saat ini<input name="currentPassword" type={visible ? 'text' : 'password'} autoComplete="current-password" maxLength={128} required /></label>}
    {changing && <>
      <label className="field">Password baru<input name="password" type={visible ? 'text' : 'password'} minLength={8} maxLength={128} autoComplete="new-password" required /></label>
      <label className="field">Konfirmasi password baru<input name="confirmation" type={visible ? 'text' : 'password'} minLength={8} maxLength={128} autoComplete="new-password" required /></label>
      <label className="check-field"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />Tampilkan password</label>
      <p>Minimal 8 karakter, mengandung huruf besar, kecil, angka, dan simbol. Semua session akan dicabut.</p>
    </>}
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button button-primary" disabled={pending}>{pending ? 'Memproses...' : labels[operation]}</button>
  </form>;
}
