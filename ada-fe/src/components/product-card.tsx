import Link from 'next/link';
import { ArrowUpRight, CircleCheck } from 'lucide-react';
import { formatPrice } from '@/lib/catalog';
import type { Product } from '@/lib/types';
import { ProductVisual } from './product-visual';

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} aria-label={product.name}>
        <ProductVisual product={product} />
      </Link>
      <div className="product-copy">
        <div className="product-meta">
          <span>{product.brand}</span>
          <span><CircleCheck size={13} /> {product.stock > 0 ? `${product.stock} tersedia` : 'Stok habis'}</span>
        </div>
        <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
        <p className="price">{formatPrice(product.price)} <small>/ {product.unit}</small></p>
        <Link className="text-link" href={`/products/${product.slug}`}>
          Lihat detail <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}
