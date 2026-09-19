import { cookies } from 'next/headers';
import { apiRequest } from './api';

export interface Address {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  addressLine: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  isDefault: boolean;
}
export interface UserProfile { id: string; email: string; fullName: string; phone: string | null; role: string; emailVerified: string | null; whatsappOptInAt: string | null }
export async function getProfile(): Promise<UserProfile | null> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return null;
  try {
    return await apiRequest<UserProfile>('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return null;
  }
}

export async function getAddresses(): Promise<Address[]> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return [];
  return apiRequest<Address[]>('/users/me/addresses', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
