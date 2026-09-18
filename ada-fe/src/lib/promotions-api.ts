import { cookies } from 'next/headers';
import { apiRequest } from './api';

export interface Promotion {
  id: string; code: string; name: string; kind: 'FIXED' | 'PERCENTAGE'; amount: string;
  minSubtotal: string; maxDiscount: string | null; startsAt: string; endsAt: string;
  isActive: boolean; usageLimit: number; perUserLimit: number; usedCount: number;
}
export interface PromotionPage { data: Promotion[]; meta: { page: number; limit: number; total: number; totalPages: number } }

export async function getPromotions(page: number, search: string): Promise<PromotionPage> {
  const token = (await cookies()).get('access_token')?.value;
  return apiRequest<PromotionPage>(`/promotions?${new URLSearchParams({ page: String(page), limit: '25', search })}`, { headers: { Authorization: `Bearer ${token ?? ''}` } });
}

export async function getPromotion(id: string): Promise<Promotion> {
  const token = (await cookies()).get('access_token')?.value;
  return apiRequest<Promotion>(`/promotions/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token ?? ''}` } });
}
