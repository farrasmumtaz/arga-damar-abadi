import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, ShieldCheck, Truck } from 'lucide-react';
import { ProductVisual } from '@/components/product-visual';
import { formatPrice, products } from '@/lib/catalog';
import { getProduct } from '@/lib/catalog-api';

interface ProductPageProps { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product?.name ?? 'Produk tidak ditemukan' };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  return (
    <section className="container product-detail section">
      <Link href="/#products" className="back-link"><ArrowLeft size={16} /> Kembali ke produk</Link>
      <div className="detail-grid">
        <ProductVisual product={product} large />
        <div className="detail-copy">
          <p className="eyebrow"><span /> {product.category}</p>
          <h1>{product.name}</h1>
          <div className="detail-meta"><span>{product.brand}</span><span>{product.sku}</span><span className="in-stock"><Check size={14} /> {product.stock} tersedia</span></div>
          <p className="detail-description">{product.description}</p>
          <div className="detail-price"><strong>{formatPrice(product.price)}</strong><span>per {product.unit} · termasuk PPN</span></div>
          <Link href={`/checkout?product=${product.slug}`} className="button button-primary purchase-button">Lanjut ke pembayaran</Link>
          <div className="detail-assurance"><span><ShieldCheck /> Produk original & bergaransi</span><span><Truck /> Estimasi pengiriman saat checkout</span></div>
        </div>
      </div>
    </section>
  );
}
