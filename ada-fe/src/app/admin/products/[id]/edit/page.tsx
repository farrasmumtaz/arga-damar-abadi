import { notFound } from 'next/navigation';
import { updateProductAction } from '@/actions/admin-product.actions';
import { AdminProductForm } from '@/components/admin-product-form';
import { getAdminProduct, getCatalogOptions } from '@/lib/admin-api';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [product, options] = await Promise.all([getAdminProduct(id), getCatalogOptions()]);
    return <section className="section admin-editor"><p className="eyebrow"><span/> Catalog</p><h1>Edit produk</h1><AdminProductForm action={updateProductAction.bind(null, id)} product={product} {...options}/></section>;
  } catch { notFound(); }
}
