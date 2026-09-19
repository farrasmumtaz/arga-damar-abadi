'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getActionAccessToken } from '@/lib/session-server';

export async function warehouseAction(kind: 'create' | 'transfer', form: FormData): Promise<void> {
  const token = await getActionAccessToken();
  if (!token) redirect('/login?returnTo=%2Fadmin%2Fwarehouses');
  const text = (name: string) => String(form.get(name) ?? '').trim();
  const body = kind === 'create' ? { code: text('code'), name: text('name') } : {
    idempotencyKey: text('idempotencyKey'), productId: text('productId'),
    fromWarehouseId: text('fromWarehouseId'), toWarehouseId: text('toWarehouseId'),
    quantity: Number(form.get('quantity')), reason: text('reason'),
  };
  let error = '';
  try {
    const response = await fetch(`${process.env.API_URL ?? 'http://localhost:3000/api/v1'}/warehouses${kind === 'transfer' ? '/transfers' : ''}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const value: unknown = await response.json().catch(() => null);
      error = value && typeof value === 'object' && 'message' in value && typeof value.message === 'string' ? value.message : 'Perubahan gudang ditolak. Periksa data dan hak akses.';
    }
  } catch { error = 'Layanan gudang belum dapat dihubungi. Periksa riwayat sebelum mengulangi transfer.'; }
  revalidatePath('/admin/warehouses');
  revalidatePath('/admin/inventory');
  redirect(`/admin/warehouses?${error ? `error=${encodeURIComponent(error)}` : 'saved=1'}`);
}
