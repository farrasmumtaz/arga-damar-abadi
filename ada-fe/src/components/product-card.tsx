import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { formatPrice } from '@/lib/catalog';
import type { Product } from '@/lib/types';
import { ProductVisual } from './product-visual';

export function ProductCard({ product }: { product: Product }) {
  return <article className="product-card">
    <Link className="product-photo-link" href={`/products/${product.slug}`} aria-label={`Lihat ${product.name}`}><ProductVisual product={product} /></Link>
    <div className="product-copy"><div className="product-meta"><span>{product.brand}</span><span>{product.stock > 0 ? `${product.stock} tersedia` : 'Stok habis'}</span></div>
      <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3><p className="product-sku">{product.sku}</p>
      <div className="product-bottom"><p className="price">{formatPrice(product.price)}<small> / {product.unit}</small></p><Link href={`/products/${product.slug}`} className="product-arrow" aria-label={`Lihat detail ${product.name}`}><ArrowUpRight size={19}/></Link></div>
    </div>
  </article>;
}
