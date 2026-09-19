'use server';
import { getActionAccessToken } from '@/lib/session-server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiRequest } from '@/lib/api';
export async function retryNotificationAction(id: string): Promise<void> {
  const token = await getActionAccessToken();
  if (!token) redirect('/login?returnTo=%2Fadmin%2Fnotifications');
  await apiRequest(`/admin/notifications/${encodeURIComponent(id)}/retry`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  revalidatePath('/admin/notifications');
}
