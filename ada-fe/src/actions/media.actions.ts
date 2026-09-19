'use server';

import { getActionAccessToken } from '@/lib/session-server';
import { redirect } from 'next/navigation';

export interface UploadResult { id?: string; url?: string; error?: string }
export async function uploadMediaAction(purpose: 'images' | 'boq', data: FormData): Promise<UploadResult> {
  if (!['images', 'boq'].includes(purpose)) return { error: 'Jenis file tidak valid' };
  const token = await getActionAccessToken();
  if (!token) return { error: 'Login terlebih dahulu untuk upload.' };
  const file = data.get('file');
  if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) return { error: 'File wajib diisi, maksimum 5 MB.' };
  const acceptedTypes = purpose === 'images' ? ['image/jpeg', 'image/png', 'image/webp'] : ['application/pdf'];
  if (!acceptedTypes.includes(file.type)) return { error: purpose === 'images' ? 'Gunakan foto JPEG, PNG, atau WebP.' : 'BOQ harus berupa PDF.' };
  const payload = new FormData(); payload.set('file', file);
  try {
    const response = await fetch(`${process.env.API_URL ?? 'http://localhost:3000/api/v1'}/media/${purpose}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: payload, cache: 'no-store', signal: AbortSignal.timeout(60_000) });
    if (response.status === 401) return { error: 'Sesi berakhir. Login kembali untuk mengunggah foto.' };
    if (response.status === 403) return { error: 'Akun ini tidak memiliki akses upload.' };
    if (response.status === 429) return { error: 'Batas upload sementara tercapai. Tunggu satu menit lalu coba kembali.' };
    if (response.status === 503 && purpose === 'images') return { error: 'Penyimpanan foto belum dikonfigurasi. Admin perlu mengisi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY pada backend.' };
    const result: unknown = await response.json();
    if (!response.ok || !result || typeof result !== 'object' || !('id' in result) || typeof result.id !== 'string') return { error: 'Upload gagal. Periksa format, ukuran, dan konfigurasi storage/scanner.' };
    return { id: result.id, url: 'url' in result && typeof result.url === 'string' ? result.url : undefined };
  } catch { return { error: 'Upload tidak dapat diproses.' }; }
}

export async function downloadMediaAction(id: string): Promise<void> {
  const token = await getActionAccessToken();
  if (!token) redirect('/login');
  const response = await fetch(`${process.env.API_URL ?? 'http://localhost:3000/api/v1'}/media/${encodeURIComponent(id)}/download`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error('File tidak tersedia atau akses ditolak');
  const result = await response.json() as { url: string };
  redirect(result.url);
}
