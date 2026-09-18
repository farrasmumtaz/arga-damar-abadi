'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export interface SecurityState { error?: string; success?: string }
export type SecurityOperation = 'forgot-password' | 'reset-password' | 'verify-email' | 'change-password' | 'verification/request';

export async function accountSecurityAction(operation: SecurityOperation, _state: SecurityState, data: FormData): Promise<SecurityState> {
  const allowed: SecurityOperation[] = ['forgot-password', 'reset-password', 'verify-email', 'change-password', 'verification/request'];
  if (!allowed.includes(operation)) return { error: 'Aksi tidak valid.' };
  const password = String(data.get('password') ?? '');
  if (['reset-password', 'change-password'].includes(operation) && password !== data.get('confirmation')) return { error: 'Konfirmasi password tidak sama.' };
  const payload = operation === 'forgot-password' ? { email: data.get('email') }
    : operation === 'reset-password' ? { token: data.get('token'), password }
    : operation === 'verify-email' ? { token: data.get('token') }
    : operation === 'change-password' ? { currentPassword: data.get('currentPassword'), password } : {};
  const jar = await cookies();
  const accessToken = jar.get('access_token')?.value;
  try {
    const response = await fetch(`${process.env.API_URL ?? 'http://localhost:3000/api/v1'}/auth/${operation}`, {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(payload),
    });
    const result: unknown = await response.json();
    const message = typeof result === 'object' && result !== null && 'message' in result ? String(result.message) : 'Permintaan tidak dapat diproses.';
    if (!response.ok) return { error: message };
    if (operation === 'change-password' || operation === 'reset-password') {
      jar.delete('access_token'); jar.delete('refresh_token');
    }
    revalidatePath('/account/security');
    return { success: message };
  } catch {
    return { error: 'Server tidak dapat dihubungi. Silakan coba kembali.' };
  }
}
