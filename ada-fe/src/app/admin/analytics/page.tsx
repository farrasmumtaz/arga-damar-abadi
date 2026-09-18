import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiRequest, getSession } from '@/lib/api';
import { formatPrice } from '@/lib/catalog';

interface Analytics {
  since: string; days: number;
  orders: Array<{ status: string; count: number; total: string }>;
  payments: Array<{ status: string; count: number }>;
  quotations: Array<{ status: string; count: number }>;
  daily: Array<{ day: string; orders: number; revenue: string }>;
  topProducts: Array<{ productId: string; name: string; quantity: number; grossSales: string }>;
  inventory: { lowStock: number; stockouts: number; adjustmentDelta: string };
  medianFulfillmentHours: number | null;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await getSession();
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) redirect('/admin');
  const raw = Number((await searchParams).days ?? 30);
  const days = Number.isInteger(raw) && raw >= 1 && raw <= 365 ? raw : 30;
  const token = (await cookies()).get('access_token')?.value;
  const data = await apiRequest<Analytics>(`/admin/analytics?days=${days}`, { headers: { Authorization: `Bearer ${token}` } });
  return <><div className="admin-page-heading"><h1>Analitik operasional</h1><p>Cohort berdasarkan waktu pembuatan transaksi, {days} hari terakhir. Status adalah keadaan saat ini, bukan histori harian.</p></div>
    <form method="get"><label>Periode <select name="days" defaultValue={days}>{[7,30,90,365].map(n => <option key={n} value={n}>{n} hari</option>)}</select></label> <button className="button button-primary">Terapkan</button></form>
    <section className="admin-panel"><h2>Stok & fulfillment</h2><p>Low stock: {data.inventory.lowStock} · Stockout: {data.inventory.stockouts} · Selisih adjustment: {data.inventory.adjustmentDelta}</p><p>Median dibuat → delivered: {data.medianFulfillmentHours === null ? 'Belum ada order delivered' : `${data.medianFulfillmentHours.toFixed(1)} jam`}</p></section>
    {(['orders','payments','quotations'] as const).map(resource => <section className="admin-panel" key={resource}><h2>{resource}</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Status</th><th>Jumlah</th></tr></thead><tbody>{data[resource].map(row => <tr key={row.status}><td>{row.status}</td><td>{row.count}</td></tr>)}</tbody></table></div></section>)}
    <section className="admin-panel"><h2>Penjualan per tanggal order (WIB)</h2><p>Total order dibayar, tidak termasuk cancelled/refunded; termasuk ongkir dan setelah voucher. Bukan laporan kas bank.</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tanggal</th><th>Order</th><th>Total</th></tr></thead><tbody>{data.daily.map(row => <tr key={row.day}><td>{row.day}</td><td>{row.orders}</td><td>{formatPrice(Number(row.revenue))}</td></tr>)}</tbody></table></div></section>
    <section className="admin-panel"><h2>10 produk terlaris</h2><p>Nilai kotor item sebelum voucher, tidak termasuk ongkir.</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Produk</th><th>Unit</th><th>Penjualan kotor</th></tr></thead><tbody>{data.topProducts.map(row => <tr key={row.productId}><td>{row.name}</td><td>{row.quantity}</td><td>{formatPrice(Number(row.grossSales))}</td></tr>)}</tbody></table></div></section>
  </>;
}
