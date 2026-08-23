import { notFound } from 'next/navigation';
import { updateQuotationAction } from '@/actions/admin-quotation.actions';
import { QuotationReviewForm } from '@/components/quotation-review-form';
import { getAdminQuotation } from '@/lib/admin-api';
import { formatPrice } from '@/lib/catalog';

export default async function AdminQuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { const quotation = await getAdminQuotation(id); const total = quotation.items.reduce((sum, item) => sum + Number(item.unitPrice ?? 0) * item.quantity, 0);
    return <section className="section admin-quotation-detail"><p className="eyebrow"><span/> Sales pipeline</p><div className="admin-heading"><div><h1>{quotation.quotationNumber}</h1><p>{quotation.projectName} · {quotation.user.fullName}</p></div><span className={`status status-${quotation.status.toLowerCase()}`}>{quotation.status}</span></div><div className="quotation-admin-grid"><div><article className="shipping-card"><h2>Kontak</h2><strong>{quotation.contactName}</strong><p>{quotation.companyName ?? 'Personal'} · {quotation.contactPhone}</p><small>{quotation.user.email}</small></article><div className="data-table quote-items">{quotation.items.map((item) => <div key={item.id}><span><strong>{item.product?.name ?? item.description}</strong><small>{item.product?.sku ?? 'Custom item'} · {item.quantity} unit</small></span><strong>{item.unitPrice ? formatPrice(Number(item.unitPrice)) : 'Belum dihargai'}</strong></div>)}</div>{total > 0 && <p className="quote-total">Total proposal <strong>{formatPrice(total)}</strong></p>}</div><QuotationReviewForm quotation={quotation} action={updateQuotationAction.bind(null, id)}/></div></section>;
  } catch { notFound(); }
}
