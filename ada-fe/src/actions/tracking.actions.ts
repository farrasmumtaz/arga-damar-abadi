'use server';
import { getActionAccessToken } from '@/lib/session-server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiRequest } from '@/lib/api';
export async function linkTrackingAction(orderId: string, form: FormData): Promise<void> {
  const token = await getActionAccessToken();
  if (!token) redirect('/login');
  await apiRequest(`/orders/admin/${encodeURIComponent(orderId)}/tracking`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ trackingId: form.get('trackingId') }) });
  revalidatePath(`/admin/orders/${orderId}`); revalidatePath(`/account/orders/${orderId}`);
}
