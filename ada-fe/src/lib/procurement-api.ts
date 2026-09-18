import 'server-only';
import { cookies } from 'next/headers';
import { apiRequest } from './api';

export interface Supplier { id: string; code: string; name: string; contactName: string | null; email: string | null; phone: string | null; address: string | null; isActive: boolean }
export interface PurchaseOrder { id: string; purchaseNumber: string; supplierId: string; supplierName: string; status: 'DRAFT' | 'ISSUED' | 'RECEIVED' | 'CANCELLED'; total: string; note: string | null; createdAt: string; issuedAt: string | null; receivedAt: string | null; supplier: Supplier; items: Array<{ id: string; productId: string; sku: string; productName: string; quantity: number; unitCost: string; subtotal: string }> }
export interface ProcurementPage<T> { data: T[]; meta: { page: number; total: number; totalPages: number } }
export async function procurementRequest<T>(path: string): Promise<T> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) throw new Error('Unauthenticated');
  return apiRequest<T>(`/procurement${path}`, { headers: { Authorization: `Bearer ${token}` } });
}
