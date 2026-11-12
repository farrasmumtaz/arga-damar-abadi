'use server';

import { getActionAccessToken } from '@/lib/session-server';
import { redirect } from 'next/navigation';
import type { CheckoutReview, CheckoutState } from '@/lib/checkout-review';
import { sameCheckoutReview } from '@/lib/checkout-review';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export type { CheckoutState } from '@/lib/checkout-review';

async function request<T>(path: string, token: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, cache: 'no-store',
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'message' in payload
      ? String(payload.message) : 'Checkout tidak dapat diproses';
    throw new Error(message);
  }
  return payload as T;
}

export async function checkoutAction(state: CheckoutState, form: FormData): Promise<CheckoutState> {
  const token = await getActionAccessToken();
  if (!token) redirect('/login?returnTo=%2Fcheckout');
  let orderId = state.orderId;
  let addressId = String(form.get('addressId') ?? state.addressId ?? '');
  let addressSummary = state.addressSummary;
  try {
    const productId = String(form.get('productId') ?? '');
    const promotionCode = String(form.get('promotionCode') ?? '').trim().toUpperCase();
    if (!orderId) {
      if (!addressId) {
        const address = await request<{ id: string }>('/users/me/addresses', token, {
          method: 'POST', body: JSON.stringify({
            label: form.get('label'), recipient: form.get('recipient'), phone: form.get('phone'),
            addressLine: form.get('addressLine'), province: form.get('province'), city: form.get('city'),
            district: form.get('district'), postalCode: form.get('postalCode'), isDefault: true,
          }),
        });
        addressId = address.id;
        addressSummary = ['recipient', 'addressLine', 'district', 'city', 'province', 'postalCode'].map(name => String(form.get(name) ?? '')).join(', ');
      }
      const params = new URLSearchParams({ addressId });
      if (productId) params.set('productId', productId);
      if (promotionCode) params.set('promotionCode', promotionCode);
      const quote = await request<Omit<CheckoutReview, 'addressId' | 'productId' | 'promotionCode'>>(`/shipping/quote?${params}`, token, { method: 'GET' });
      const review: CheckoutReview = { ...quote, addressId, productId, promotionCode };
      if (form.get('intent') !== 'pay') return { addressId, addressSummary, review };
      if (!sameCheckoutReview(state.review, review)) {
        return { addressId, addressSummary, review, error: 'Rincian pesanan berubah. Periksa total terbaru, lalu konfirmasikan pembayaran kembali.' };
      }
      const order = await request<{ id: string }>('/orders/checkout', token, {
        method: 'POST', body: JSON.stringify({
          addressId, idempotencyKey: form.get('idempotencyKey'), productId: productId || undefined,
          customerNote: form.get('customerNote') || undefined, promotionCode: promotionCode || undefined, shippingQuote: quote.token, expectedTotal: review.total,
        }),
      });
      orderId = order.id;
    }
    const snap = await request<{ redirect_url: string }>(`/payments/orders/${encodeURIComponent(orderId)}/session`, token, { method: 'POST' });
    redirect(snap.redirect_url);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    return { error: error instanceof Error ? error.message : 'Checkout tidak dapat diproses', orderId, addressId: addressId || undefined, addressSummary };
  }
}
