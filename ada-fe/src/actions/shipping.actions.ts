'use server';
import { getActionAccessToken } from '@/lib/session-server';
import { apiRequest } from '@/lib/api';
export interface ShippingEstimate { amount: number; provider: string; token: string; expiresAt: string }
export async function shippingQuoteAction(addressId: string, productId?: string): Promise<{ quote?: ShippingEstimate; error?: string }> {
  const token = await getActionAccessToken();
  if (!token) return { error: 'Silakan login kembali' };
  const params = new URLSearchParams({ addressId }); if (productId) params.set('productId', productId);
  try { return { quote: await apiRequest<ShippingEstimate>(`/shipping/quote?${params}`, { headers: { Authorization: `Bearer ${token}` } }) }; }
  catch { return { error: 'Ongkir belum tersedia. Pastikan alamat sudah tersimpan di profil, lalu coba kembali.' }; }
}
