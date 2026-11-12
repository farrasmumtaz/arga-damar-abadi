import { cookies } from 'next/headers';
import { apiRequest, ApiError } from './api';

export interface OrderItem { id: string; productName: string; sku: string; unitPrice: string; quantity: number; subtotal: string }
export interface Payment { id: string; status: string; method: string | null; paidAt: string | null }
export interface Order {
  id: string; orderNumber: string; status: string; subtotal: string; shippingCost: string; discountAmount: string;
  total: string; shippingAddress: Record<string, unknown>; customerNote: string | null;
  shippingProvider: string | null; trackingNumber: string | null;
  createdAt: string; items: OrderItem[]; payments?: Payment[];
}
interface OrderPage { data: Order[]; meta: { page: number; total: number; totalPages: number } }

async function token(): Promise<string | undefined> {
  return (await cookies()).get('access_token')?.value;
}
export async function getOrders(page = 1, orderNumber?: string): Promise<OrderPage> {
  const accessToken = await token();
  if (!accessToken) return { data: [], meta: { page: 1, total: 0, totalPages: 0 } };
  const query = new URLSearchParams({ page: String(page) });
  if (orderNumber) query.set('orderNumber', orderNumber);
  return apiRequest<OrderPage>(`/orders?${query}`, { headers: { Authorization: `Bearer ${accessToken}` } });
}
export async function getOrder(id: string): Promise<Order | null> {
  const accessToken = await token();
  if (!accessToken) return null;
  try { return await apiRequest<Order>(`/orders/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } }); }
  catch (error: unknown) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
