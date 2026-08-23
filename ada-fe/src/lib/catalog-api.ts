import { apiRequest } from './api';
import { findProduct as findFallbackProduct, products as fallbackProducts } from './catalog';
import type { Product } from './types';

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
  meta: { total: number };
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
    featured: product.isFeatured,
    accent: visual.accent,
    icon: visual.icon,
  };
}

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await apiRequest<ProductPageResponse>(
      '/products?limit=8&sortBy=createdAt&sortDirection=desc',
    );
    return response.data.map(mapProduct);
  } catch {
    return fallbackProducts;
  }
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  try {
    return mapProduct(await apiRequest<ApiProduct>(`/products/${slug}`));
  } catch {
    return findFallbackProduct(slug);
  }
}
