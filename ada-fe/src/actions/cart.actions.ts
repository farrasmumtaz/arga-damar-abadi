'use server';

import { getActionAccessToken } from '@/lib/session-server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

async function mutateCart(path: string, method: string, body?: unknown) {
  const token = await getActionAccessToken();
  if (!token) redirect('/login?returnTo=%2Fcart');
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (response.status === 401) redirect('/login?returnTo=%2Fcart');
  if (!response.ok) redirect('/cart?error=update-failed');
  revalidatePath('/', 'layout');
}

export async function addToCartAction(productId: string): Promise<void> {
  await mutateCart('/cart/items', 'POST', { productId, quantity: 1 });
  redirect('/cart');
}

export async function updateCartItemAction(
  itemId: string,
  formData: FormData,
): Promise<void> {
  await mutateCart(`/cart/items/${itemId}`, 'PATCH', {
    quantity: Number(formData.get('quantity')),
  });
  redirect('/cart');
}

export async function removeCartItemAction(itemId: string): Promise<void> {
  await mutateCart(`/cart/items/${itemId}`, 'DELETE');
  redirect('/cart');
}
