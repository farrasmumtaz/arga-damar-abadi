import {
  Cable,
  Drill,
  Gauge,
  HardHat,
  LampCeiling,
  Waves,
} from 'lucide-react';
import type { Product } from '@/lib/types';

const icons = {
  drill: Drill,
  lamp: LampCeiling,
  pump: Waves,
  cable: Cable,
  helmet: HardHat,
  meter: Gauge,
};

export function ProductVisual({ product, large = false }: { product: Product; large?: boolean }) {
  const Icon = icons[product.icon];
  return (
    <div
      className={`product-visual ${large ? 'product-visual-large' : ''}`}
      style={{ '--accent': product.accent } as React.CSSProperties}
    >
      <span className="visual-orbit" />
      <Icon strokeWidth={1.25} />
      <span className="visual-sku">{product.sku}</span>
    </div>
  );
}
