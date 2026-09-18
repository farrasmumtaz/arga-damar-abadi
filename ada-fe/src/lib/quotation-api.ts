import { cookies } from 'next/headers';
import { apiRequest } from './api';
export interface CustomerQuotation { attachmentId: string | null; id: string; quotationNumber: string; projectName: string; companyName: string | null; status: string; validUntil: string | null; createdAt: string; items: Array<{ id: string; description: string; quantity: number; unitPrice: string | null }> }
async function request<T>(path: string): Promise<T> { const token = (await cookies()).get('access_token')?.value; if (!token) throw new Error('Unauthenticated'); return apiRequest<T>(path, { headers: { Authorization: `Bearer ${token}` } }); }
export function getMyQuotations() { return request<CustomerQuotation[]>('/quotations'); }
export function getMyQuotation(id: string) { return request<CustomerQuotation>(`/quotations/${id}`); }
