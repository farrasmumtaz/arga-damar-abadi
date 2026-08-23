'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
async function authFetch(path: string, method: string): Promise<Response> {
  const token = (await cookies()).get('access_token')?.value;
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
  await authFetch(`/orders/${orderId}/cancel`, 'POST');
  redirect(`/account/orders/${orderId}`);
}
