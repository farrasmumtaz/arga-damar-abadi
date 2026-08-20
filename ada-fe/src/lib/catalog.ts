import type { Product } from './types';

export const categories = [
  { name: 'Power Tools', slug: 'power-tools', icon: '⌁', count: 24 },
  { name: 'Kelistrikan', slug: 'kelistrikan', icon: 'ϟ', count: 38 },
  { name: 'Pompa & Air', slug: 'pompa-air', icon: '◉', count: 16 },
  { name: 'Keselamatan', slug: 'keselamatan', icon: '◇', count: 21 },
];

export const products: Product[] = [
  {
    id: 'prod-001',
    slug: 'mesin-bor-impact-13mm',
    sku: 'ADA-PT-001',
    name: 'Mesin Bor Impact 13mm',
    category: 'Power Tools',
    brand: 'Makita',
    description:
      'Mesin bor profesional dengan mode impact, chuck 13 mm, dan kontrol kecepatan presisi untuk pekerjaan berat.',
    price: 1485000,
    unit: 'unit',
    stock: 18,
    featured: true,
    accent: '#e8b34f',
    icon: 'drill',
  },
  {
    id: 'prod-002',
    slug: 'lampu-led-highbay-100w',
    sku: 'ADA-EL-014',
    name: 'Lampu LED Highbay 100W',
    category: 'Kelistrikan',
    brand: 'Philips',
    description:
      'Pencahayaan area industri berefisiensi tinggi dengan distribusi cahaya merata dan umur pakai panjang.',
    price: 875000,
    unit: 'unit',
    stock: 42,
    featured: true,
    accent: '#7db9a8',
    icon: 'lamp',
  },
  {
    id: 'prod-003',
    slug: 'pompa-air-otomatis-200w',
    sku: 'ADA-PA-008',
    name: 'Pompa Air Otomatis 200W',
    category: 'Pompa & Air',
    brand: 'Shimizu',
    description:
      'Pompa otomatis ringkas untuk kebutuhan rumah dan bangunan, dilengkapi thermal protector.',
    price: 1125000,
    unit: 'unit',
    stock: 12,
    featured: true,
    accent: '#6da7cb',
    icon: 'pump',
  },
  {
    id: 'prod-004',
    slug: 'kabel-nym-3x25mm-50m',
    sku: 'ADA-EL-027',
    name: 'Kabel NYM 3×2.5mm 50m',
    category: 'Kelistrikan',
    brand: 'Supreme',
    description:
      'Kabel instalasi berstandar SNI dengan isolasi ganda, cocok untuk instalasi tetap bangunan.',
    price: 1375000,
    unit: 'roll',
    stock: 27,
    featured: false,
    accent: '#d77b60',
    icon: 'cable',
  },
  {
    id: 'prod-005',
    slug: 'helm-safety-ventilasi',
    sku: 'ADA-K3-011',
    name: 'Helm Safety Ventilasi',
    category: 'Keselamatan',
    brand: 'MSA',
    description:
      'Pelindung kepala industrial dengan suspensi empat titik dan ventilasi untuk kenyamanan kerja.',
    price: 325000,
    unit: 'pcs',
    stock: 65,
    featured: false,
    accent: '#edc654',
    icon: 'helmet',
  },
  {
    id: 'prod-006',
    slug: 'digital-clamp-meter',
    sku: 'ADA-EL-032',
    name: 'Digital Clamp Meter',
    category: 'Kelistrikan',
    brand: 'Kyoritsu',
    description:
      'Alat ukur arus AC/DC True RMS dengan layar terang dan proteksi input untuk teknisi profesional.',
    price: 2190000,
    unit: 'unit',
    stock: 9,
    featured: false,
    accent: '#e48b48',
    icon: 'meter',
  },
];

export function findProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(price);
}
