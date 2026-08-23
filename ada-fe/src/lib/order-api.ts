import { cookies } from 'next/headers';
import { apiRequest } from './api';

export interface OrderItem { id: string; productName: string; sku: string; unitPrice: string; quantity: number; subtotal: string }
export interface Payment { id: string; status: string; method: string | null; paidAt: string | null }
export interface Order {
  id: string; orderNumber: string; status: string; subtotal: string; shippingCost: string;
  total: string; shippingAddress: Record<string, unknown>; customerNote: string | null;
  createdAt: string; items: OrderItem[]; payments?: Payment[];
}
interface OrderPage { data: Order[]; meta: { page: number; total: number; totalPages: number } }

async function token(): Promise<string | undefined> {
  return (await cookies()).get('access_token')?.value;
}
export async function getOrders(): Promise<OrderPage> {
  const accessToken = await token();
  if (!accessToken) return { data: [], meta: { page: 1, total: 0, totalPages: 0 } };
  return apiRequest<OrderPage>('/orders', { headers: { Authorization: `Bearer ${accessToken}` } });
}
export async function getOrder(id: string): Promise<Order | null> {
  const accessToken = await token();
  if (!accessToken) return null;
  try { return await apiRequest<Order>(`/orders/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } }); }
  catch { return null; }
}
