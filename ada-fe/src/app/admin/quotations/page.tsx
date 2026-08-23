import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminQuotations } from '@/lib/admin-api';
import { getSession } from '@/lib/api';

export default async function AdminQuotationsPage() {
  const user = await getSession(); if (!user || user.role === 'CUSTOMER') redirect('/');
  const quotations = await getAdminQuotations();
  return <section className="container section admin-list-page"><div className="admin-heading"><div><p className="eyebrow"><span/> Sales pipeline</p><h1>Quotations</h1></div></div><div className="data-table">{quotations.map((quote) => <div key={quote.id}><span><strong>{quote.quotationNumber}</strong><small>{quote.user.fullName} · {quote.projectName}</small></span><span>{quote.items.length} item</span><span className={`status status-${quote.status.toLowerCase()}`}>{quote.status}</span><Link className="table-link" href={`/admin/quotations/${quote.id}`}>Review</Link></div>)}</div></section>;
}
