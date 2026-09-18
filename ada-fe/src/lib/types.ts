export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  imageUrl?: string | null;
  imageAlt?: string;
  photos?: Array<{ url: string; alt: string }>;
  featured: boolean;
  accent: string;
  icon: 'drill' | 'lamp' | 'pump' | 'cable' | 'helmet' | 'meter';
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';
}

export interface AuthResponse {
  user: SessionUser;
  accessToken: string;
  expiresIn: number;
}
