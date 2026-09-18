import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ApiError, getSession } from '@/lib/api';
import { getPromotion } from '@/lib/promotions-api';
import { PromotionForm } from '@/components/promotion-form';
import { deletePromotionAction } from '@/actions/promotions.actions';
export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) redirect('/admin');
  const { id } = await params;
  const promotion = await getPromotion(id).catch((error: unknown) => { if (error instanceof ApiError && error.status === 404) notFound(); throw error; });
  return <><Link href="/admin/promotions">Kembali ke voucher</Link><h1>Edit {promotion.code}</h1><PromotionForm promotion={promotion} />
    {promotion.usedCount === 0 && <form action={deletePromotionAction.bind(null, id)} className="admin-form"><p>Penghapusan hanya tersedia untuk voucher yang belum pernah digunakan.</p><label className="check-field"><input type="checkbox" required />Saya ingin menghapus voucher ini.</label><button className="button button-outline">Hapus voucher</button></form>}
  </>;
}
