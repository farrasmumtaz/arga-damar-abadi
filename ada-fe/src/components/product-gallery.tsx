'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductVisual } from './product-visual';

export function ProductGallery({ product }: { product: Product }) {
  const [selected, setSelected] = useState(0);
  const photos = product.photos ?? [];
  const photo = photos[selected] ?? photos[0];
  return <div className="product-gallery">
    <ProductVisual product={photo ? { ...product, imageUrl: photo.url, imageAlt: photo.alt } : product} large/>
    {photos.length > 1 && <div className="product-gallery-thumbnails" role="group" aria-label="Pilih foto produk">{photos.map((item,index) => <button type="button" key={`${item.url}-${index}`} aria-label={`Lihat foto ${index + 1} dari ${photos.length}`} aria-pressed={selected === index} onClick={() => setSelected(index)}><img src={item.url} alt={item.alt} loading="lazy"/></button>)}</div>}
  </div>;
}
