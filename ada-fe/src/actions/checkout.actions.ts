'use server';

import { getActionAccessToken } from '@/lib/session-server';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export interface CheckoutState { error?: string; orderId?: string; addressId?: string }

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
  const token = await getActionAccessToken();
  if (!token) redirect('/login?returnTo=%2Fcheckout');
  let orderId = _state.orderId;
  let addressId = _state.addressId ?? String(formData.get('addressId') ?? '');
  try {
    const productId = String(formData.get('productId') ?? '');
    if (!orderId && !addressId) {
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
    if (!orderId) {
      const order = await request<{ id: string }>('/orders/checkout', token, {
        method: 'POST',
        body: JSON.stringify({ addressId, idempotencyKey: formData.get('idempotencyKey'), productId: productId || undefined, customerNote: formData.get('customerNote') || undefined, promotionCode: String(formData.get('promotionCode') ?? '').trim() || undefined, shippingQuote: formData.get('shippingQuote') || undefined }),
      });
      orderId = order.id;
    }
    const snap = await request<{ redirect_url: string }>(`/payments/orders/${encodeURIComponent(orderId)}/session`, token, { method: 'POST' });
    redirect(snap.redirect_url);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    return { error: error instanceof Error ? error.message : 'Checkout tidak dapat diproses', orderId, addressId: addressId || undefined };
  }
}
