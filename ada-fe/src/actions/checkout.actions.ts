'use server';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export interface CheckoutState { error?: string }

async function request<T>(path: string, token: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'message' in payload
      ? String(payload.message) : 'Checkout tidak dapat diproses';
    throw new Error(message);
  }
  return payload as T;
}

export async function checkoutAction(_state: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) redirect('/login?returnTo=%2Fcheckout');
  try {
    const productId = String(formData.get('productId') ?? '');
    if (productId) {
      await request('/cart/items', token, { method: 'POST', body: JSON.stringify({ productId, quantity: 1 }) });
    }
    let addressId = String(formData.get('addressId') ?? '');
    if (!addressId) {
      const address = await request<{ id: string }>('/users/me/addresses', token, {
        method: 'POST',
        body: JSON.stringify({
          label: formData.get('label'), recipient: formData.get('recipient'),
          phone: formData.get('phone'), addressLine: formData.get('addressLine'),
          province: formData.get('province'), city: formData.get('city'),
          district: formData.get('district'), postalCode: formData.get('postalCode'), isDefault: true,
        }),
      });
      addressId = address.id;
    }
    const order = await request<{ id: string }>('/orders/checkout', token, {
      method: 'POST',
      body: JSON.stringify({ addressId, idempotencyKey: randomUUID(), customerNote: formData.get('customerNote') || undefined }),
    });
    const snap = await request<{ redirect_url: string }>(`/payments/orders/${order.id}/session`, token, { method: 'POST' });
    redirect(snap.redirect_url);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    return { error: error instanceof Error ? error.message : 'Checkout tidak dapat diproses' };
  }
}
