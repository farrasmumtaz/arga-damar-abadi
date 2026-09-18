'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export async function submitQuotationAction(formData: FormData): Promise<void> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) redirect('/login?returnTo=%2Fquotation');
  const response = await fetch(`${API_URL}/quotations`, {
    method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectName: formData.get('projectName'), companyName: formData.get('companyName') || undefined, contactName: formData.get('contactName'), contactPhone: formData.get('contactPhone'), notes: formData.get('notes') || undefined, attachmentId: formData.get('attachmentId') || undefined, items: [{ productId: formData.get('productId'), description: 'Permintaan produk katalog', quantity: Number(formData.get('quantity')) }] }),
  });
  if (!response.ok) redirect('/quotation?error=submit');
  redirect('/quotation?success=1');
}
