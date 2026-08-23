import Link from 'next/link';
export function AdminNav() { return <nav className="admin-nav"><Link href="/admin">Overview</Link><Link href="/admin/inventory">Inventory</Link><Link href="/admin/orders">Orders</Link><Link href="/admin/quotations">Quotation</Link></nav>; }
