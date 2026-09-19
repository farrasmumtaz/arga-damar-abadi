import Link from 'next/link';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { apiRequest, getSession } from '@/lib/api';
import { warehouseAction } from '@/actions/warehouses.actions';

interface Warehouse { id: string; code: string; name: string; isActive: boolean }
interface Stock { id: string; productId: string; warehouseId: string; quantity: number; reserved: number; available: number; product: { name: string; sku: string }; warehouse: { code: string } }
interface Transfer { id: string; quantity: number; reason: string; createdAt: string; product: { sku: string }; fromWarehouse: { code: string }; toWarehouse: { code: string } }
interface Page<T> { data: T[]; meta: { totalPages: number } }
export default async function WarehousesPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; error?: string; saved?: string }> }) {
  const query = await searchParams;
  const page = Math.min(100000, Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1));
  const search = (query.search ?? '').slice(0,120);
  const token = (await cookies()).get('access_token')?.value;
  const options = { headers: { Authorization: `Bearer ${token}` } };
  const user = await getSession();
  let data: [Warehouse[], Page<Stock>, Page<Transfer>];
  try { data = await Promise.all([
    apiRequest<Warehouse[]>('/warehouses?limit=100', options),
    apiRequest<Page<Stock>>(`/warehouses/stocks?${new URLSearchParams({ page: String(page), search })}`, options),
    apiRequest<Page<Transfer>>('/warehouses/transfers?limit=25', options),
  ]); } catch { return <section className="section"><h1>Gudang</h1><p role="alert">Data gudang tidak dapat dimuat. Pastikan migrasi sudah diterapkan dan API aktif.</p></section>; }
  const [warehouses, stocks, transfers] = data;
  const active = warehouses.filter(row => row.isActive);
  const href = (next: number) => `/admin/warehouses?${new URLSearchParams({ page: String(next), search })}`;
  return <section className="section"><h1>Gudang & transfer stok</h1><p>Reservasi dapat dibagi antar-gudang. Pengiriman dikonsolidasikan dari titik asal utama.</p>
    {query.error && <p className="form-error" role="alert">{query.error}</p>}{query.saved && <p role="status">Perubahan tersimpan.</p>}
    <details><summary>Daftar gudang (maksimal 100)</summary>{warehouses.map(row => <p key={row.id}><strong>{row.code} — {row.name}</strong><br/><code>{row.id}</code></p>)}</details>
    {user?.role !== 'STAFF' && <form action={warehouseAction.bind(null, 'create')} className="admin-form"><h2>Tambah gudang</h2><label className="field">Kode<input name="code" required maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9_-]*"/></label><label className="field">Nama<input name="name" required maxLength={150}/></label><button className="button button-primary">Simpan gudang</button></form>}
    <form method="get" className="admin-form"><label className="field">Cari nama / SKU<input name="search" defaultValue={search} maxLength={120}/></label><button className="button button-secondary">Cari stok</button></form>
    {stocks.data.map(row => <article key={row.id} className="shipping-card"><h3>{row.product.name}</h3><p>{row.product.sku} · {row.warehouse.code} · Fisik {row.quantity} · Reservasi {row.reserved} · Tersedia {row.available}</p>
      {row.available > 0 && active.length > 1 && <details><summary>Transfer stok tersedia</summary><form action={warehouseAction.bind(null, 'transfer')} className="admin-form"><input type="hidden" name="idempotencyKey" value={randomUUID()}/><input type="hidden" name="productId" value={row.productId}/><input type="hidden" name="fromWarehouseId" value={row.warehouseId}/><label className="field">Gudang tujuan<select name="toWarehouseId" required>{active.filter(warehouse => warehouse.id !== row.warehouseId).map(warehouse => <option value={warehouse.id} key={warehouse.id}>{warehouse.code} — {warehouse.name}</option>)}</select></label><label className="field">Jumlah<input name="quantity" type="number" required min={1} max={Math.min(row.available,1000000)} step={1}/></label><label className="field">Alasan<input name="reason" required minLength={3} maxLength={300}/></label><button className="button button-secondary">Transfer stok</button></form></details>}
    </article>)}{stocks.data.length === 0 && <p>Tidak ada saldo stok yang sesuai.</p>}
    <nav aria-label="Halaman stok">{page > 1 && <Link href={href(page-1)}>Sebelumnya</Link>} <span>Halaman {page}</span> {page < stocks.meta.totalPages && <Link href={href(page+1)}>Berikutnya</Link>}</nav>
    <h2>25 transfer terakhir</h2>{transfers.data.map(row => <p key={row.id}>{new Date(row.createdAt).toLocaleString('id-ID')} · {row.product.sku} · {row.fromWarehouse.code} → {row.toWarehouse.code} · {row.quantity} unit · {row.reason}</p>)}
  </section>;
}
