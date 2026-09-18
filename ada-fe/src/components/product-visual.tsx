'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';

export function ProductVisual({ product, large = false }: { product: Pick<Product, 'name' | 'sku' | 'imageUrl' | 'imageAlt'>; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const source = product.imageUrl;
  const available = Boolean(source && source !== failedUrl);
  return (
    <div
      className={`product-visual ${large ? 'product-visual-large' : ''}`}
    >
      {available ? (
        <img src={source ?? undefined} alt={product.imageAlt ?? product.name} loading={large ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedUrl(source ?? undefined)} />
      ) : (
        <div className="product-photo-placeholder" role="img" aria-label={`Foto ${product.name} belum tersedia`}><strong>Foto belum tersedia</strong><span>{product.name}</span></div>
      )}
      <span className="visual-sku">{product.sku}</span>
    </div>
  );
}
