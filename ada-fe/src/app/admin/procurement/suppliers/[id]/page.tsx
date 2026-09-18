import { DeleteSupplierForm, SupplierForm } from '@/components/procurement-forms';
import { procurementRequest } from '@/lib/procurement-api';
import type { Supplier } from '@/lib/procurement-api';
export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const supplier = await procurementRequest<Supplier>(`/suppliers/${encodeURIComponent(id)}`); return <section className="section"><h1>Kelola supplier</h1><SupplierForm supplier={supplier}/><h2>Penghapusan</h2><DeleteSupplierForm id={id}/></section>; }
