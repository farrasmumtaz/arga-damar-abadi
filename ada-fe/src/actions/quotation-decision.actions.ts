'use server';
import { getActionAccessToken } from '@/lib/session-server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export async function quotationDecisionAction(id: string, decision: 'ACCEPTED' | 'REJECTED'): Promise<void> {
  const path = `/account/quotations/${encodeURIComponent(id)}`;
  const token = await getActionAccessToken();
  if (!token) redirect(`/login?returnTo=${encodeURIComponent(path)}`);
  let errorMessage = '';
  try {
    const response = await fetch(`${API_URL}/quotations/${encodeURIComponent(id)}/decision`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }), cache: 'no-store',
    });
    if (!response.ok) {
      const data: unknown = await response.json().catch(() => null);
      errorMessage = data && typeof data === 'object' && 'message' in data ? String(data.message) : 'Keputusan belum dapat disimpan.';
    }
  } catch { errorMessage = 'Koneksi terputus. Periksa status penawaran sebelum mencoba kembali.'; }
  revalidatePath(path);
  revalidatePath('/account/quotations');
  redirect(`${path}?${new URLSearchParams(errorMessage ? { error: errorMessage } : { saved: '1' })}`);
}
