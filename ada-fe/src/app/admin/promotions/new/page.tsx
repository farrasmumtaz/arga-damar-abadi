import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api';
import { PromotionForm } from '@/components/promotion-form';
export default async function NewPromotionPage() {
  const user = await getSession();
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) redirect('/admin');
  return <><Link href="/admin/promotions">Kembali ke voucher</Link><h1>Buat voucher</h1><PromotionForm /></>;
}
