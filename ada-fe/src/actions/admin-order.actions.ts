'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
export interface OrderStatusActionState { error?: string; success?: string }
const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export async function updateOrderStatusAction(orderId: string, _state: OrderStatusActionState, formData: FormData): Promise<OrderStatusActionState> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return { error: 'Sesi admin berakhir' };
  const response = await fetch(`${API_URL}/orders/admin/${orderId}/status`, { method: 'PATCH', cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: formData.get('status'), shippingProvider: formData.get('shippingProvider') || undefined, trackingNumber: formData.get('trackingNumber') || undefined, note: formData.get('note') || undefined }) });
  if (!response.ok) { const result: unknown = await response.json().catch(() => null); return { error: typeof result === 'object' && result !== null && 'message' in result ? String(result.message) : 'Status order gagal diperbarui' }; }
  revalidatePath(`/admin/orders/${orderId}`); revalidatePath('/admin/orders'); return { success: 'Status order berhasil diperbarui' };
}
