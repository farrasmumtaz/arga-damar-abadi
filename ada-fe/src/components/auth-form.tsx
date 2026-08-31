'use client';

import { useActionState, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
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
            type={showPassword ? 'text' : 'password'}
            minLength={registering ? 8 : undefined}
            placeholder={registering ? 'Minimal 8 karakter' : 'Password Anda'}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>
      {registering && (
        <>
          <label className="field">
            <span>Konfirmasi password</span>
            <div className="input-shell">
              <LockKeyhole size={18} />
              <input
                name="passwordConfirmation"
                type={showPasswordConfirmation ? 'text' : 'password'}
                minLength={8}
                placeholder="Ulangi password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPasswordConfirmation((visible) => !visible)}
                aria-label={showPasswordConfirmation ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                aria-pressed={showPasswordConfirmation}
              >
                {showPasswordConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <p className="password-hint">Gunakan minimal 8 karakter dengan huruf besar, kecil, angka, dan simbol.</p>
        </>
      )}
      {state.error && <p className="form-error">{state.error}</p>}
      <button className="button button-primary auth-submit" disabled={pending}>
        {pending ? 'Memproses...' : registering ? 'Buat akun' : 'Masuk'}
        {!pending && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
