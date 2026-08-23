import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin-nav';
import { getAdminInventory } from '@/lib/admin-api';
import { getSession } from '@/lib/api';
export default async function AdminInventoryPage() {
  const user = await getSession(); if (!user || user.role === 'CUSTOMER') redirect('/');
  const result = await getAdminInventory();
  return <section className="container section admin-list-page"><div className="admin-heading"><div><p className="eyebrow"><span/> Operasional</p><h1>Inventory</h1></div><AdminNav/></div><div className="data-table">{result.data.map((item) => <div key={item.productId}><span><strong>{item.product.name}</strong><small>{item.product.sku}</small></span><span>Fisik <strong>{item.quantity}</strong></span><span>Reserved <strong>{item.reserved}</strong></span><span className={item.isLowStock ? 'stock-warning' : ''}>Tersedia <strong>{item.available}</strong></span></div>)}</div></section>;
}
