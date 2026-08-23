'use server';
import { cookies } from 'next/headers'; import { revalidatePath } from 'next/cache';
const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export async function quotationDecisionAction(id: string, decision: 'ACCEPTED' | 'REJECTED'): Promise<void> { const token = (await cookies()).get('access_token')?.value; if (!token) return; await fetch(`${API_URL}/quotations/${id}/decision`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }), cache: 'no-store' }); revalidatePath(`/account/quotations/${id}`); revalidatePath('/account/quotations'); }
