'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export interface PromotionFormState { error?: string; success?: string }
export interface VoucherState { error?: string; code?: string; subtotal?: string; discountAmount?: string; discountedSubtotal?: string; note?: string }

async function authenticatedRequest(path: string, method: string, body?: Record<string, unknown>): Promise<unknown> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) throw new Error('Silakan login kembali.');
  const response = await fetch(`${API_URL}${path}`, { method, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const result: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = result !== null && typeof result === 'object' && 'message' in result && typeof result.message === 'string' ? result.message : 'Voucher tidak dapat diproses. Periksa kembali isian formulir.';
    throw new Error(message);
  }
  return result;
}

export async function savePromotionAction(id: string | undefined, _state: PromotionFormState, data: FormData): Promise<PromotionFormState> {
  try {
    const startsAt = new Date(`${String(data.get('startsAt'))}Z`);
    const endsAt = new Date(`${String(data.get('endsAt'))}Z`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return { error: 'Jadwal voucher tidak valid.' };
    await authenticatedRequest(`/promotions${id ? `/${encodeURIComponent(id)}` : ''}`, id ? 'PATCH' : 'POST', {
      code: String(data.get('code') ?? '').trim().toUpperCase(), name: data.get('name'), kind: data.get('kind'),
      amount: String(data.get('amount') ?? ''), minSubtotal: String(data.get('minSubtotal') ?? '0'),
      maxDiscount: data.get('maxDiscount') ? String(data.get('maxDiscount')) : null,
      startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(),
      usageLimit: Number(data.get('usageLimit')), perUserLimit: Number(data.get('perUserLimit')),
      isActive: data.get('isActive') === 'on',
    });
    revalidatePath('/admin/promotions');
    if (id) revalidatePath(`/admin/promotions/${id}`);
  } catch (error: unknown) { return { error: error instanceof Error ? error.message : 'Gagal menyimpan voucher' }; }
  redirect('/admin/promotions');
}

export async function togglePromotionAction(id: string, active: boolean): Promise<void> {
  try { await authenticatedRequest(`/promotions/${encodeURIComponent(id)}`, 'PATCH', { isActive: active }); }
  catch (error: unknown) { redirect(`/admin/promotions?error=${encodeURIComponent(error instanceof Error ? error.message : 'Gagal mengubah status')}`); }
  revalidatePath('/admin/promotions');
}

export async function deletePromotionAction(id: string): Promise<void> {
  try { await authenticatedRequest(`/promotions/${encodeURIComponent(id)}`, 'DELETE'); }
  catch (error: unknown) { redirect(`/admin/promotions?error=${encodeURIComponent(error instanceof Error ? error.message : 'Gagal menghapus voucher')}`); }
  revalidatePath('/admin/promotions');
  redirect('/admin/promotions');
}

export async function previewVoucherAction(code: string, productId?: string): Promise<VoucherState> {
  try {
    const result = await authenticatedRequest('/promotions/preview', 'POST', { code, productId });
    if (!result || typeof result !== 'object' || !('code' in result) || typeof result.code !== 'string' || !('discountAmount' in result) || typeof result.discountAmount !== 'string' || !('discountedSubtotal' in result) || typeof result.discountedSubtotal !== 'string' || !('subtotal' in result) || typeof result.subtotal !== 'string' || !('note' in result) || typeof result.note !== 'string') return { error: 'Respons voucher tidak valid.' };
    return { code: result.code, discountAmount: result.discountAmount, discountedSubtotal: result.discountedSubtotal, subtotal: result.subtotal, note: result.note };
  } catch (error: unknown) { return { error: error instanceof Error ? error.message : 'Voucher tidak dapat diperiksa.' }; }
}
