import Link from 'next/link';
import { redirect } from 'next/navigation';
import { quotationOrderAction } from '@/actions/quotation-order.actions';
import { getMyQuotation } from '@/lib/quotation-api';
import { getAddresses } from '@/lib/user-api';
import { getSession } from '@/lib/api';
export default async function QuotationOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  if (!await getSession()) redirect(`/login?returnTo=${encodeURIComponent(`/account/quotations/${id}/order`)}`);
  const [quote, addresses, query] = await Promise.all([getMyQuotation(id), getAddresses(), searchParams]);
  return <section className="container section"><h1>Order dari {quote.quotationNumber}</h1>{query.error && <p role="alert" className="form-error">{query.error}</p>}{quote.status === 'ACCEPTED' && addresses.length ? <form action={quotationOrderAction.bind(null, id)} className="admin-form"><p>Harga mengikuti penawaran yang telah Anda terima. Ongkir dihitung berdasarkan berat dan ditambahkan ke order.</p><label className="field">Alamat<select name="addressId" defaultValue={addresses.find(a => a.isDefault)?.id} required>{addresses.map(a => <option key={a.id} value={a.id}>{a.label} — {a.city}</option>)}</select></label><button className="button button-primary">Buat order dan tinjau pembayaran</button></form> : <p>Terima penawaran dan tambahkan alamat sebelum membuat order.</p>}<Link href="/account/profile">Kelola alamat</Link></section>;
}
