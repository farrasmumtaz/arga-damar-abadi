'use server';
import { getActionAccessToken } from '@/lib/session-server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import type { Supplier } from '@/lib/procurement-api';

export interface ProcurementState { error?: string; success?: string }
export interface ProcurementOption { id: string; label: string }
const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
async function mutate(path: string, method: string, body?: unknown): Promise<unknown> {
  const token = await getActionAccessToken();
  if (!token) throw new Error('Silakan login kembali.');
  const response = await fetch(`${process.env.API_URL ?? 'http://localhost:3000/api/v1'}/procurement${path}`, { method, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(25000) });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'message' in payload ? payload.message : null;
    throw new Error(typeof message === 'string' ? message : Array.isArray(message) ? message.filter((part): part is string => typeof part === 'string').join(', ') : 'Permintaan procurement gagal.');
  }
  return payload;
}
function failure(error: unknown): ProcurementState { return { error: error instanceof Error ? error.message : 'Permintaan gagal diproses.' }; }
export async function supplierAction(id: string | null, _state: ProcurementState, form: FormData): Promise<ProcurementState> {
  try {
    await mutate(id ? `/suppliers/${encodeURIComponent(id)}` : '/suppliers', id ? 'PATCH' : 'POST', { code: text(form, 'code'), name: text(form, 'name'), contactName: text(form, 'contactName'), ...(text(form, 'email') ? { email: text(form, 'email') } : {}), phone: text(form, 'phone'), address: text(form, 'address'), isActive: form.get('isActive') === 'on' });
  } catch (error: unknown) { return failure(error); }
  revalidatePath('/admin/procurement', 'layout');
  redirect('/admin/procurement?tab=suppliers');
}
export async function deleteSupplierAction(id: string, _state: ProcurementState, form: FormData): Promise<ProcurementState> {
  if (form.get('confirm') !== 'on') return { error: 'Konfirmasi penghapusan supplier diperlukan.' };
  try { await mutate(`/suppliers/${encodeURIComponent(id)}`, 'DELETE'); } catch (error: unknown) { return failure(error); }
  revalidatePath('/admin/procurement', 'layout'); redirect('/admin/procurement?tab=suppliers');
}
export async function purchaseOrderAction(id: string | null, _state: ProcurementState, form: FormData): Promise<ProcurementState> {
  let result: unknown;
  try {
    const productIds = form.getAll('productId').map(String);
    const quantities = form.getAll('quantity').map(value => Number(value));
    const costs = form.getAll('unitCost').map(String);
    if (!productIds.length || productIds.length > 100 || quantities.length !== productIds.length || costs.length !== productIds.length) return { error: 'Tambahkan 1–100 item purchase order.' };
    result = await mutate(id ? `/orders/${encodeURIComponent(id)}` : '/orders', id ? 'PATCH' : 'POST', { supplierId: text(form, 'supplierId'), note: text(form, 'note'), items: productIds.map((productId, index) => ({ productId, quantity: quantities[index], unitCost: costs[index] })) });
  } catch (error: unknown) { return failure(error); }
  if (typeof result !== 'object' || result === null || !('id' in result) || typeof result.id !== 'string') return { error: 'Respons purchase order tidak valid.' };
  revalidatePath('/admin/procurement', 'layout'); redirect(`/admin/procurement/orders/${encodeURIComponent(result.id)}`);
}
export async function purchaseTransitionAction(id: string, action: 'issue' | 'receive' | 'cancel', _state: ProcurementState, form: FormData): Promise<ProcurementState> {
  if (!['issue', 'receive', 'cancel'].includes(action)) return { error: 'Aksi tidak valid.' };
  if (form.get('confirm') !== 'on') return { error: 'Konfirmasi tindakan diperlukan.' };
  try { await mutate(`/orders/${encodeURIComponent(id)}/${action}`, 'POST', action === 'receive' ? { warehouseId: text(form, 'warehouseId') } : undefined); } catch (error: unknown) { return failure(error); }
  revalidatePath('/admin/procurement', 'layout'); revalidatePath('/admin/inventory', 'layout');
  return { success: 'Status purchase order diperbarui.' };
}
export async function searchProcurementOptions(kind: 'suppliers' | 'products', search: string): Promise<{ options: ProcurementOption[]; error?: string }> {
  const token = await getActionAccessToken();
  if (!token) return { options: [], error: 'Silakan login kembali.' };
  const query = new URLSearchParams({ limit: '50', search: search.trim().slice(0, 100) });
  try {
    if (kind === 'suppliers') {
      const response = await apiRequest<{ data: Supplier[] }>(`/procurement/suppliers?${query}`, { headers: { Authorization: `Bearer ${token}` } });
      return { options: response.data.filter(supplier => supplier.isActive).map(supplier => ({ id: supplier.id, label: `${supplier.code} — ${supplier.name}` })) };
    }
    if (kind !== 'products') return { options: [], error: 'Pencarian tidak valid.' };
    const response = await apiRequest<{ data: Array<{ id: string; sku: string; name: string }> }>(`/products/admin?${query}`, { headers: { Authorization: `Bearer ${token}` } });
    return { options: response.data.map(product => ({ id: product.id, label: `${product.sku} — ${product.name}` })) };
  } catch { return { options: [], error: 'Pencarian gagal. Coba kembali.' }; }
}
