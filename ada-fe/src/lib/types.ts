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
  featured: boolean;
  accent: string;
  icon: 'drill' | 'lamp' | 'pump' | 'cable' | 'helmet' | 'meter';
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';
}

export interface AuthResponse {
  user: SessionUser;
  accessToken: string;
  expiresIn: number;
}
