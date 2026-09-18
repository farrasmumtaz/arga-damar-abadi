'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthResponse } from '@/lib/types';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

export interface AuthActionState {
  error?: string;
}

function safeReturnTo(value: string): string {
  return value.startsWith('/') && !value.startsWith('//') && !/[\\\u0000-\u001f]/.test(value) ? value : '/';
}

async function authenticate(
  endpoint: 'login' | 'register',
  body: Record<string, string>,
): Promise<{ data?: AuthResponse; refreshToken?: string; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const payload: unknown = await response.json();

    if (!response.ok) {
      const message =
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload &&
        typeof payload.message === 'string'
          ? payload.message
          : 'Data yang Anda masukkan belum tepat.';
      return { error: message };
    }

    const setCookie = response.headers.get('set-cookie') ?? '';
    const refreshToken = /refresh_token=([^;]+)/.exec(setCookie)?.[1];
    return { data: payload as AuthResponse, refreshToken };
  } catch {
    return { error: 'Server belum dapat dihubungi. Silakan coba kembali.' };
  }
}

async function saveSession(
  data: AuthResponse,
  refreshToken?: string,
): Promise<void> {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === 'production';
  cookieStore.set('access_token', data.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: data.expiresIn,
  });
  if (refreshToken) {
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export async function loginAction(
  returnTo: string,
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = await authenticate('login', {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  });
  if (!result.data) return { error: result.error };

  await saveSession(result.data, result.refreshToken);
  redirect(safeReturnTo(returnTo));
}

export async function registerAction(
  returnTo: string,
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get('password') ?? '');
  const passwordConfirmation = String(
    formData.get('passwordConfirmation') ?? '',
  );
  if (password !== passwordConfirmation) {
    return { error: 'Konfirmasi password tidak sama.' };
  }

  const result = await authenticate('register', {
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    ...(String(formData.get('phone') ?? '').trim() ? { phone: String(formData.get('phone')).trim() } : {}),
    password,
  });
  if (!result.data) return { error: result.error };

  await saveSession(result.data, result.refreshToken);
  redirect(safeReturnTo(returnTo));
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `refresh_token=${refreshToken}` },
      cache: 'no-store',
    }).catch(() => undefined);
  }
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  redirect('/');
}
