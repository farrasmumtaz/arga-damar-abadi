import { apiRequest, ApiError } from './api';
import type { Product } from './types';
import { catalogApiQuery, type CatalogFilters } from './catalog-query';
import { collectCatalogPages, type CatalogPage } from './catalog-pages';

interface ApiProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  price: string;
  isFeatured: boolean;
  category: { name: string };
  brand: { name: string } | null;
  inventory: { quantity: number; reserved: number } | null;
  images: Array<{ url: string; altText: string | null }>;
}

interface ProductPageResponse {
  data: ApiProduct[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CatalogOption { id: string; name: string; slug: string }
export async function getCatalogOptions() {
  const [categories, brands] = await Promise.all([
    collectCatalogPages(page => apiRequest<CatalogPage<CatalogOption>>(`/categories?isActive=true&limit=100&page=${page}`)),
    collectCatalogPages(page => apiRequest<CatalogPage<CatalogOption>>(`/brands?isActive=true&limit=100&page=${page}`)),
  ]);
  return { categories, brands };
}

export async function getCatalogPage(filters: CatalogFilters) {
  const response = await apiRequest<ProductPageResponse>(`/products?${catalogApiQuery(filters)}`);
  return { data: response.data.map(mapProduct), meta: response.meta };
}

const visuals: Array<Pick<Product, 'accent' | 'icon'>> = [
  { accent: '#c9a227', icon: 'drill' },
  { accent: '#8da8a0', icon: 'lamp' },
  { accent: '#7b9eb6', icon: 'pump' },
  { accent: '#ba745e', icon: 'cable' },
  { accent: '#d8b646', icon: 'helmet' },
  { accent: '#c17a42', icon: 'meter' },
];

function mapProduct(product: ApiProduct, index = 0): Product {
  const visual = visuals[index % visuals.length] ?? visuals[0];
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    category: product.category.name,
    brand: product.brand?.name ?? 'Arga Damar',
    description:
      product.shortDescription ?? product.description ?? 'Informasi produk tersedia melalui tim kami.',
    price: Number(product.price),
    unit: 'unit',
    stock: Math.max(
      0,
      (product.inventory?.quantity ?? 0) - (product.inventory?.reserved ?? 0),
    ),
    imageUrl: product.images[0]?.url ?? null,
    imageAlt: product.images[0]?.altText ?? product.name,
    photos: product.images.map(image => ({ url: image.url, alt: image.altText ?? product.name })),
    featured: product.isFeatured,
    accent: visual.accent,
    icon: visual.icon,
  };
}

export async function getProducts(): Promise<Product[]> {
  const products = await collectCatalogPages(page => apiRequest<ProductPageResponse>(
    `/products?limit=100&page=${page}&sortBy=createdAt&sortDirection=desc`,
  ));
  return products.map(mapProduct);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  try {
    return mapProduct(await apiRequest<ApiProduct>(`/products/${slug}`));
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) return undefined;
    throw error;
  }
}

export async function getRecommendations(slug: string): Promise<Product[]> {
  try { return (await apiRequest<ApiProduct[]>(`/products/${encodeURIComponent(slug)}/recommendations`)).map(mapProduct); }
  catch { return []; }
}
