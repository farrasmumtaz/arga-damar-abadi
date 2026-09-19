'use server';

import { getActionAccessToken } from '@/lib/session-server';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export interface InventoryActionState { error?: string; success?: string }
async function mutate(path: string, method: string, body: unknown): Promise<string | null> {
  const token = await getActionAccessToken();
  if (!token) return 'Sesi admin berakhir';
  const response = await fetch(`${API_URL}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  if (response.ok) return null;
  const result: unknown = await response.json().catch(() => null);
  return typeof result === 'object' && result !== null && 'message' in result ? String(result.message) : 'Perubahan inventory gagal';
}
export async function adjustStockAction(productId: string, _state: InventoryActionState, formData: FormData): Promise<InventoryActionState> {
  const error = await mutate(`/inventory/${productId}/adjustments`, 'POST', { quantityDelta: Number(formData.get('quantityDelta')), reason: formData.get('reason'), warehouseId: formData.get('warehouseId') });
  if (error) return { error }; revalidatePath(`/admin/inventory/${productId}`); revalidatePath('/admin/inventory'); revalidatePath('/admin/warehouses'); return { success: 'Stok berhasil disesuaikan' };
}
export async function updateThresholdAction(productId: string, _state: InventoryActionState, formData: FormData): Promise<InventoryActionState> {
  const error = await mutate(`/inventory/${productId}/threshold`, 'PATCH', { lowStockLevel: Number(formData.get('lowStockLevel')) });
  if (error) return { error }; revalidatePath(`/admin/inventory/${productId}`); revalidatePath('/admin/inventory'); return { success: 'Batas low-stock diperbarui' };
}
