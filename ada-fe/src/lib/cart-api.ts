import { cookies } from 'next/headers';
import { apiRequest } from './api';
import type { Product } from './types';

export interface CartItemView {
  id: string;
  quantity: number;
  product: Product;
  subtotal: number;
}

export interface CartView {
  items: CartItemView[];
  subtotal: number;
  itemCount: number;
}

interface ApiCart {
  items: Array<{
    id: string;
    quantity: number;
    product: {
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
    };
  }>;
  subtotal: string;
  itemCount: number;
}

const icons: Product['icon'][] = ['drill', 'lamp', 'pump', 'cable', 'helmet', 'meter'];

export async function getCart(): Promise<CartView | null> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return null;
  try {
    const cart = await apiRequest<ApiCart>('/cart', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      itemCount: cart.itemCount,
      subtotal: Number(cart.subtotal),
      items: cart.items.map((item, index) => {
        const available = Math.max(
          0,
          (item.product.inventory?.quantity ?? 0) -
            (item.product.inventory?.reserved ?? 0),
        );
        const product: Product = {
          id: item.product.id,
          slug: item.product.slug,
          sku: item.product.sku,
          name: item.product.name,
          category: item.product.category.name,
          brand: item.product.brand?.name ?? 'Arga Damar',
          description:
            item.product.shortDescription ?? item.product.description ?? '',
          price: Number(item.product.price),
          unit: 'unit',
          stock: available,
          featured: item.product.isFeatured,
          accent: ['#c9a227', '#8da8a0', '#7b9eb6'][index % 3] ?? '#c9a227',
          icon: icons[index % icons.length] ?? 'drill',
        };
        return {
          id: item.id,
          quantity: item.quantity,
          product,
          subtotal: product.price * item.quantity,
        };
      }),
    };
  } catch {
    return { items: [], subtotal: 0, itemCount: 0 };
  }
}
