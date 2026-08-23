'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

export async function updateUserAccessAction(userId: string, formData: FormData): Promise<void> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) redirect('/login?returnTo=%2Fadmin%2Fusers');
  const response = await fetch(`${API_URL}/users/admin/${userId}/access`, {
    method: 'PATCH',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: String(formData.get('role')),
      isActive: formData.get('isActive') === 'on',
    }),
  });
  if (!response.ok) {
    const result: unknown = await response.json().catch(() => null);
    const message = typeof result === 'object' && result !== null && 'message' in result
      ? String(result.message)
      : 'Akses pengguna gagal diperbarui';
    redirect(`/admin/users?error=${encodeURIComponent(message)}`);
  }
  revalidatePath('/admin/users');
}
