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
export interface StockMovement { id: string; quantityBefore: number; quantityDelta: number; quantityAfter: number; reason: string; createdAt: string; actor: { fullName: string; email: string } }
export interface AdminOrder { id: string; orderNumber: string; status: string; subtotal: string; shippingCost: string; total: string; shippingAddress: Record<string, unknown>; customerNote: string | null; shippingProvider: string | null; trackingNumber: string | null; shippedAt: string | null; deliveredAt: string | null; createdAt: string; user: { fullName: string; email: string; phone?: string | null }; items: Array<{ id: string; sku: string; productName: string; unitPrice: string; quantity: number; subtotal: string }>; payments?: Array<{ id: string; status: string; method: string | null }>; statusHistories?: Array<{ id: string; fromStatus: string; toStatus: string; note: string | null; createdAt: string; actor: { fullName: string; email: string } | null }> }
export interface AdminQuotation { id: string; quotationNumber: string; projectName: string; companyName?: string | null; contactName?: string; contactPhone?: string; notes?: string | null; validUntil?: string | null; status: string; createdAt: string; user: { fullName: string; email: string; phone?: string | null }; items: Array<{ id: string; description: string; quantity: number; unitPrice: string | null; product?: { name: string; sku: string } | null }> }
export interface AdminProduct { id: string; categoryId: string; brandId: string | null; sku: string; name: string; slug: string; shortDescription: string | null; description: string | null; status: string; price: string; weightGram: number; isFeatured: boolean; category: { name: string }; brand: { name: string } | null; images: Array<{ url: string; altText: string | null; sortOrder: number }>; inventory: { quantity: number; reserved: number; lowStockLevel: number } | null }
export interface CatalogOption { id: string; name: string }
export interface AdminCategory extends CatalogOption { slug: string; parentId: string | null; isActive: boolean; sortOrder: number }
export interface AdminBrand extends CatalogOption { slug: string; logoUrl: string | null; isActive: boolean }
export interface AdminUser { id: string; email: string; fullName: string; phone: string | null; role: 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN'; isActive: boolean; createdAt: string; _count: { orders: number; quotations: number } }
export async function getAdminInventory() { return adminRequest<{ data: AdminInventory[] }>('/inventory?limit=100'); }
export async function getInventoryDetail(productId: string) { return adminRequest<AdminInventory>(`/inventory/${productId}`); }
export async function getStockMovements(productId: string) { return adminRequest<StockMovement[]>(`/inventory/${productId}/movements`); }
export async function getAdminOrders() { return adminRequest<AdminOrder[]>('/orders/admin/all'); }
export async function getAdminOrder(id: string) { return adminRequest<AdminOrder>(`/orders/admin/${id}`); }
export async function getAdminQuotations() { return adminRequest<AdminQuotation[]>('/quotations/admin'); }
export async function getAdminQuotation(id: string) { return adminRequest<AdminQuotation>(`/quotations/admin/${id}`); }
export async function getAdminProducts() { return adminRequest<{ data: AdminProduct[] }>('/products/admin?limit=100'); }
export async function getAdminProduct(id: string) { return adminRequest<AdminProduct>(`/products/admin/${id}`); }
export async function getCatalogOptions() {
  const [categories, brands] = await Promise.all([
    adminRequest<{ data: CatalogOption[] }>('/categories?limit=100&isActive=true'),
    adminRequest<{ data: CatalogOption[] }>('/brands?limit=100&isActive=true'),
  ]);
  return { categories: categories.data, brands: brands.data };
}
export async function getAdminCatalog() {
  const [categories, brands] = await Promise.all([
    adminRequest<{ data: AdminCategory[] }>('/categories?limit=100'),
    adminRequest<{ data: AdminBrand[] }>('/brands?limit=100'),
  ]);
  return { categories: categories.data, brands: brands.data };
}
export async function getAdminUsers() { return adminRequest<AdminUser[]>('/users/admin'); }
