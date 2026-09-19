'use server';

import { getActionAccessToken } from '@/lib/session-server';
import { revalidatePath } from 'next/cache';
export interface QuotationActionState { error?: string; success?: string }
const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export async function updateQuotationAction(id: string, _state: QuotationActionState, formData: FormData): Promise<QuotationActionState> {
  const token = await getActionAccessToken(); if (!token) return { error: 'Sesi admin berakhir' };
  const itemIds = formData.getAll('itemId').map(String);
  const prices = formData.getAll('unitPrice').map(Number);
  const status = String(formData.get('status'));
  const response = await fetch(`${API_URL}/quotations/admin/${id}`, { method: 'PATCH', cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status, validUntil: formData.get('validUntil') || undefined, items: status === 'QUOTED' ? itemIds.map((itemId, index) => ({ id: itemId, unitPrice: prices[index] })) : undefined }) });
  if (!response.ok) { const result: unknown = await response.json().catch(() => null); return { error: typeof result === 'object' && result !== null && 'message' in result ? String(result.message) : 'Quotation gagal diperbarui' }; }
  revalidatePath(`/admin/quotations/${id}`); revalidatePath('/admin/quotations'); return { success: 'Quotation berhasil diperbarui' };
}
