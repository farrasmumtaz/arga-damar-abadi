'use server';

import { getActionAccessToken } from '@/lib/session-server';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
async function authFetch(path: string, method: string): Promise<Response> {
  const token = await getActionAccessToken();
  if (!token) redirect('/login?returnTo=%2Faccount%2Forders');
  return fetch(`${API_URL}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, cache: 'no-store' });
}
export async function payOrderAction(orderId: string): Promise<void> {
  const response = await authFetch(`/payments/orders/${orderId}/session`, 'POST');
  if (!response.ok) redirect(`/account/orders/${orderId}?error=payment`);
  const snap = (await response.json()) as { redirect_url: string };
  redirect(snap.redirect_url);
}
export async function cancelOrderAction(orderId: string): Promise<void> {
  let errorMessage = '';
  try {
    const response = await authFetch(`/orders/${orderId}/cancel`, 'POST');
    if (!response.ok) {
      const data: unknown = await response.json().catch(() => null);
      errorMessage = data && typeof data === 'object' && 'message' in data ? String(data.message) : 'Pesanan tidak dapat dibatalkan.';
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    errorMessage = 'Koneksi terputus. Periksa status pesanan sebelum mencoba kembali.';
  }
  redirect(`/account/orders/${orderId}?${new URLSearchParams(errorMessage ? { error: errorMessage } : { saved: '1' })}`);
}
