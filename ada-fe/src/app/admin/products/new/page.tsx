import { createProductAction } from '@/actions/admin-product.actions';
import { AdminProductForm } from '@/components/admin-product-form';
import { getCatalogOptions } from '@/lib/admin-api';

export default async function NewProductPage() {
  const options = await getCatalogOptions();
  return <section className="section admin-editor"><p className="eyebrow"><span/> Catalog</p><h1>Tambah produk</h1><AdminProductForm action={createProductAction} {...options}/></section>;
}
