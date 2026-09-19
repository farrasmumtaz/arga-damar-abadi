'use server';
import { getActionAccessToken } from '@/lib/session-server';
import { redirect } from 'next/navigation';
export async function quotationOrderAction(id: string, form: FormData): Promise<void> {
  const token = await getActionAccessToken();
  if (!token) redirect('/login');
  const response = await fetch(`${process.env.API_URL ?? 'http://localhost:3000/api/v1'}/quotations/${encodeURIComponent(id)}/order`, { method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ addressId: form.get('addressId') }) });
  const result: unknown = await response.json();
  if (!response.ok || !result || typeof result !== 'object' || !('id' in result) || typeof result.id !== 'string') {
    const message = result && typeof result === 'object' && 'message' in result ? String(result.message) : 'Order tidak dapat dibuat';
    redirect(`/account/quotations/${id}/order?error=${encodeURIComponent(message)}`);
  }
  redirect(`/account/orders/${result.id}`);
}
