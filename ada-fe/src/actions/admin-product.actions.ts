'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export interface ProductActionState { error?: string }

function payload(formData: FormData) {
  const brandId = String(formData.get('brandId') ?? '');
  const images = String(formData.get('imageUrls') ?? '')
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url, sortOrder) => ({ url, sortOrder }));
  return {
    categoryId: String(formData.get('categoryId')),
    brandId: brandId || null,
    sku: String(formData.get('sku')),
    name: String(formData.get('name')),
    slug: String(formData.get('slug') ?? '') || undefined,
    shortDescription: String(formData.get('shortDescription') ?? ''),
    description: String(formData.get('description') ?? ''),
    price: Number(formData.get('price')),
    weightGram: Number(formData.get('weightGram') ?? 0),
    status: String(formData.get('status')),
    isFeatured: formData.get('isFeatured') === 'on',
    initialStock: Number(formData.get('initialStock') ?? 0),
    lowStockLevel: Number(formData.get('lowStockLevel') ?? 5),
    images,
  };
}
async function mutate(path: string, method: string, body?: unknown): Promise<string | null> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) redirect('/login?returnTo=%2Fadmin%2Fproducts');
  const response = await fetch(`${API_URL}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  if (response.ok) return null;
  const result: unknown = await response.json().catch(() => null);
  return typeof result === 'object' && result !== null && 'message' in result ? String(result.message) : 'Produk tidak dapat disimpan';
}
export async function createProductAction(_state: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const error = await mutate('/products', 'POST', payload(formData));
  if (error) return { error }; revalidatePath('/admin/products'); revalidatePath('/'); revalidatePath('/products/[slug]', 'page'); redirect('/admin/products');
}
export async function updateProductAction(id: string, _state: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const { initialStock: _initialStock, ...data } = payload(formData);
  const error = await mutate(`/products/${id}`, 'PATCH', data);
  if (error) return { error }; revalidatePath('/admin/products'); revalidatePath('/'); revalidatePath('/products/[slug]', 'page'); redirect('/admin/products');
}
export async function deleteProductAction(id: string): Promise<void> {
  const error = await mutate(`/products/${id}`, 'DELETE');
  if (error) redirect(`/admin/products?error=${encodeURIComponent(error)}`); revalidatePath('/admin/products'); redirect('/admin/products');
}
