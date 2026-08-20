'use client';

import { useActionState } from 'react';
import { ArrowRight, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import type { AuthActionState } from '@/actions/auth.actions';

interface AuthFormProps {
  mode: 'login' | 'register';
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
}

const initialState: AuthActionState = {};

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const registering = mode === 'register';

  return (
    <form action={formAction} className="auth-form">
      {registering && (
        <label className="field">
          <span>Nama lengkap</span>
          <div className="input-shell">
            <UserRound size={18} />
            <input name="fullName" placeholder="Nama Anda" required />
          </div>
        </label>
      )}
      <label className="field">
        <span>Email</span>
        <div className="input-shell">
          <Mail size={18} />
          <input name="email" type="email" placeholder="nama@email.com" required />
        </div>
      </label>
      {registering && (
        <label className="field">
          <span>Nomor WhatsApp <small>(opsional)</small></span>
          <div className="input-shell">
            <Phone size={18} />
            <input name="phone" placeholder="+628123456789" />
          </div>
        </label>
      )}
      <label className="field">
        <span>Password</span>
        <div className="input-shell">
          <LockKeyhole size={18} />
          <input
            name="password"
            type="password"
            minLength={registering ? 12 : undefined}
            placeholder={registering ? 'Minimal 12 karakter' : 'Password Anda'}
            required
          />
        </div>
      </label>
      {registering && (
        <p className="password-hint">Gunakan huruf besar, kecil, angka, dan simbol.</p>
      )}
      {state.error && <p className="form-error">{state.error}</p>}
      <button className="button button-primary auth-submit" disabled={pending}>
        {pending ? 'Memproses...' : registering ? 'Buat akun' : 'Masuk'}
        {!pending && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
