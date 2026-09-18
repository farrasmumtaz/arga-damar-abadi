import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, ShieldCheck, Truck } from 'lucide-react';
import { ProductGallery } from '@/components/product-gallery';
import { addToCartAction } from '@/actions/cart.actions';
import { formatPrice } from '@/lib/catalog';
import { getProduct, getRecommendations } from '@/lib/catalog-api';
import { ProductCard } from '@/components/product-card';

interface ProductPageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product?.name ?? 'Produk tidak ditemukan' };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const recommendations = await getRecommendations(product.slug);

  return (
    <section className="container product-detail section">
      <Link href="/#products" className="back-link"><ArrowLeft size={16} /> Kembali ke produk</Link>
      <div className="detail-grid">
        <ProductGallery product={product} />
        <div className="detail-copy">
          <p className="eyebrow"><span /> {product.category}</p>
          <h1>{product.name}</h1>
          <div className="detail-meta"><span>{product.brand}</span><span>{product.sku}</span><span className="in-stock"><Check size={14} /> {product.stock} tersedia</span></div>
          <p className="detail-description">{product.description}</p>
          <div className="detail-price"><strong>{formatPrice(product.price)}</strong><span>per {product.unit} · termasuk PPN</span></div>
          <form action={addToCartAction.bind(null, product.id)}>
            <button className="button button-primary purchase-button">Tambah ke keranjang</button>
          </form>
          <Link href={`/checkout?product=${product.slug}`} className="direct-checkout">Beli langsung</Link>
          <div className="detail-assurance"><span><ShieldCheck /> Produk original & bergaransi</span><span><Truck /> Estimasi pengiriman saat checkout</span></div>
        </div>
      </div>
      {recommendations.length > 0 && <section className="section" aria-labelledby="related-products"><h2 id="related-products">Produk terkait</h2><p>Pilihan lain dalam kategori yang sama dan masih tersedia.</p><div className="product-grid">{recommendations.map(item => <ProductCard key={item.id} product={item}/>)}</div></section>}
    </section>
  );
}
