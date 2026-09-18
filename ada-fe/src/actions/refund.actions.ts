'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
export interface RefundState { error?: string; success?: string }
export async function refundAction(orderId: string, _state: RefundState, form: FormData): Promise<RefundState> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return { error: 'Silakan login kembali.' };
  if (form.get('confirm') !== 'on') return { error: 'Konfirmasi refund diperlukan.' };
  try {
    const response = await fetch(`${process.env.API_URL ?? 'http://localhost:3000/api/v1'}/payments/orders/${encodeURIComponent(orderId)}/refund`, { method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: String(form.get('reason') ?? ''), restock: form.get('restock') === 'on' }) });
    const result: unknown = await response.json();
    if (!response.ok) return { error: typeof result === 'object' && result !== null && 'message' in result ? String(result.message) : 'Refund gagal diproses.' };
    revalidatePath(`/admin/orders/${orderId}`); revalidatePath('/admin/orders');
    return { success: 'Permintaan refund diproses. Periksa status order untuk konfirmasi provider.' };
  } catch { return { error: 'Koneksi terputus. Retry menggunakan alasan dan pilihan restock yang sama.' }; }
}
