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

export async function getAddresses(): Promise<Address[]> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return [];
  return apiRequest<Address[]>('/users/me/addresses', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
