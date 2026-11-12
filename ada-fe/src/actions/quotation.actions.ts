'use server';

import { getActionAccessToken } from '@/lib/session-server';
import { redirect } from 'next/navigation';
import { getCatalogPage } from '@/lib/catalog-api';
import { parseCatalogFilters } from '@/lib/catalog-query';

export interface QuotationState { error?: string }
export async function searchQuotationProducts(search: string, page: number) {
  try {
    const result = await getCatalogPage(parseCatalogFilters({ search, page: String(page) }));
    return { products: result.data.map(product => ({ id: product.id, name: product.name, sku: product.sku })), totalPages: result.meta.totalPages };
  } catch { return { products: [], totalPages: 0, error: 'Produk belum dapat dimuat. Coba kembali atau tambahkan kebutuhan di luar katalog.' }; }
}

export async function submitQuotationAction(_state: QuotationState, form: FormData): Promise<QuotationState> {
  const token = await getActionAccessToken();
  if (!token) redirect('/login?returnTo=%2Fquotation');
  const productIds = form.getAll('productId');
  const descriptions = form.getAll('description');
  const quantities = form.getAll('quantity');
  if (!productIds.length || productIds.length > 100 || productIds.length !== descriptions.length || productIds.length !== quantities.length) {
    return { error: 'Tambahkan 1–100 kebutuhan dengan jumlah dan deskripsi yang lengkap.' };
  }
  let id: string;
  try {
    const response = await fetch(`${process.env.API_URL ?? 'http://localhost:3000/api/v1'}/quotations`, {
      method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: form.get('projectName'), companyName: form.get('companyName') || undefined,
        contactName: form.get('contactName'), contactPhone: form.get('contactPhone'), notes: form.get('notes') || undefined,
        attachmentId: form.get('attachmentId') || undefined,
        items: productIds.map((productId, index) => ({ productId: productId || undefined, description: descriptions[index], quantity: Number(quantities[index]) })),
      }),
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok || !result || typeof result !== 'object' || !('id' in result) || typeof result.id !== 'string') {
      return { error: result && typeof result === 'object' && 'message' in result ? String(result.message) : 'Permintaan belum dapat dikirim. Coba kembali.' };
    }
    id = result.id;
  } catch { return { error: 'Koneksi terputus. Isian Anda tetap tersimpan pada halaman ini; coba kembali.' }; }
  redirect(`/account/quotations/${encodeURIComponent(id)}`);
}
