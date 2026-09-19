import { cookies } from 'next/headers';
import { apiRequest } from '@/lib/api';
import { notFound } from 'next/navigation';
import { adjustStockAction, updateThresholdAction } from '@/actions/admin-inventory.actions';
import { InventoryMutationForm } from '@/components/inventory-adjustment-form';
import { getInventoryDetail, getStockMovements } from '@/lib/admin-api';

export default async function InventoryDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  try {
    const token = (await cookies()).get('access_token')?.value;
    const warehouses = (await apiRequest<Array<{ id: string; name: string; code: string; isActive: boolean }>>('/warehouses?limit=100', { headers: { Authorization: `Bearer ${token}` } })).filter(row => row.isActive);
    const [inventory, movements] = await Promise.all([getInventoryDetail(productId), getStockMovements(productId)]);
    return <section className="section inventory-detail"><p className="eyebrow"><span/> Inventory control</p><div className="admin-heading"><div><h1>{inventory.product.name}</h1><p>{inventory.product.sku}</p></div><span className={`status ${inventory.isLowStock ? 'status-cancelled' : 'status-paid'}`}>{inventory.isLowStock ? 'LOW STOCK' : 'STOCK AMAN'}</span></div><div className="stock-metrics"><article><span>Fisik</span><strong>{inventory.quantity}</strong></article><article><span>Reserved</span><strong>{inventory.reserved}</strong></article><article><span>Tersedia</span><strong>{inventory.available}</strong></article><article><span>Threshold</span><strong>{inventory.lowStockLevel}</strong></article></div><InventoryMutationForm warehouses={warehouses} adjustmentAction={adjustStockAction.bind(null, productId)} thresholdAction={updateThresholdAction.bind(null, productId)} lowStockLevel={inventory.lowStockLevel}/><section className="movement-panel"><h2>Riwayat pergerakan stok</h2><div className="data-table movement-table">{movements.map((movement) => <div key={movement.id}><span><strong>{movement.reason}</strong><small>{movement.actor.fullName} · {new Date(movement.createdAt).toLocaleString('id-ID')}</small></span><span>{movement.quantityBefore}</span><strong className={movement.quantityDelta > 0 ? 'delta-positive' : 'delta-negative'}>{movement.quantityDelta > 0 ? '+' : ''}{movement.quantityDelta}</strong><span>{movement.quantityAfter}</span></div>)}</div>{!movements.length && <p className="empty-copy">Belum ada adjustment stok.</p>}</section></section>;
  } catch { notFound(); }
}
