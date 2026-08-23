import { cookies } from 'next/headers';
import { apiRequest } from './api';

export interface AdminDashboard {
  metrics: { customers: number; activeProducts: number; pendingOrders: number; openQuotations: number; lowStock: number; revenue: string };
  recentOrders: Array<{ id: string; orderNumber: string; status: string; total: string; createdAt: string; user: { fullName: string }; _count: { items: number } }>;
  recentQuotations: Array<{ id: string; quotationNumber: string; projectName: string; status: string; createdAt: string; user: { fullName: string }; _count: { items: number } }>;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) throw new Error('Unauthenticated');
  return apiRequest<AdminDashboard>('/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
}

async function adminRequest<T>(path: string): Promise<T> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) throw new Error('Unauthenticated');
  return apiRequest<T>(path, { headers: { Authorization: `Bearer ${token}` } });
}
export interface AdminInventory { productId: string; quantity: number; reserved: number; lowStockLevel: number; available: number; isLowStock: boolean; product: { sku: string; name: string; status: string } }
export interface AdminOrder { id: string; orderNumber: string; status: string; total: string; createdAt: string; user: { fullName: string; email: string }; items: Array<{ id: string }> }
export interface AdminQuotation { id: string; quotationNumber: string; projectName: string; status: string; createdAt: string; user: { fullName: string; email: string }; items: Array<{ id: string; description: string; quantity: number; unitPrice: string | null }> }
export interface AdminProduct { id: string; sku: string; name: string; status: string; price: string; category: { name: string }; brand: { name: string } | null; inventory: { quantity: number; reserved: number } | null }
export async function getAdminInventory() { return adminRequest<{ data: AdminInventory[] }>('/inventory?limit=100'); }
export async function getAdminOrders() { return adminRequest<AdminOrder[]>('/orders/admin/all'); }
export async function getAdminQuotations() { return adminRequest<AdminQuotation[]>('/quotations/admin'); }
export async function getAdminProducts() { return adminRequest<{ data: AdminProduct[] }>('/products/admin?limit=100'); }
