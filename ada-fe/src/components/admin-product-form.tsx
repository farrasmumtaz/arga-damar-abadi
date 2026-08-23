'use client';

import { useActionState } from 'react';
import type { ProductActionState } from '@/actions/admin-product.actions';
import type { AdminProduct, CatalogOption } from '@/lib/admin-api';

export function AdminProductForm({ action, product, categories, brands }: { action: (state: ProductActionState, formData: FormData) => Promise<ProductActionState>; product?: AdminProduct; categories: CatalogOption[]; brands: CatalogOption[] }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="admin-form">
    {state.error && <p className="form-error">{state.error}</p>}
    <div className="form-row"><label className="field"><span>Nama produk</span><input name="name" defaultValue={product?.name} required maxLength={200}/></label><label className="field"><span>SKU</span><input name="sku" defaultValue={product?.sku} required maxLength={80}/></label></div>
    <div className="form-row"><label className="field"><span>Kategori</span><select name="categoryId" defaultValue={product?.categoryId} required><option value="">Pilih kategori</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Brand</span><select name="brandId" defaultValue={product?.brandId ?? ''}><option value="">Tanpa brand</option>{brands.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>
    <div className="form-row"><label className="field"><span>Harga</span><input name="price" type="number" min="0" step="0.01" defaultValue={product?.price} required/></label><label className="field"><span>Berat (gram)</span><input name="weightGram" type="number" min="0" defaultValue={product?.weightGram ?? 0}/></label></div>
    <div className="form-row"><label className="field"><span>Stok fisik</span><input name="initialStock" type="number" min="0" defaultValue={product?.inventory?.quantity ?? 0} disabled={Boolean(product)}/></label><label className="field"><span>Batas low-stock</span><input name="lowStockLevel" type="number" min="0" defaultValue={product?.inventory?.lowStockLevel ?? 5}/></label></div>
    <label className="field"><span>Slug (opsional)</span><input name="slug" defaultValue={product?.slug}/></label>
    <label className="field"><span>Deskripsi singkat</span><input name="shortDescription" defaultValue={product?.shortDescription ?? ''} maxLength={500}/></label>
    <label className="field"><span>Deskripsi</span><textarea name="description" rows={6} defaultValue={product?.description ?? ''}/></label>
    <label className="field"><span>URL gambar (satu URL per baris, maksimal 10)</span><textarea name="imageUrls" rows={4} defaultValue={product?.images.map((image) => image.url).join('\n') ?? ''} placeholder="https://cdn.example.com/product.jpg"/></label>
    <div className="form-row"><label className="field"><span>Status</span><select name="status" defaultValue={product?.status ?? 'DRAFT'}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select></label><label className="check-field"><input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured}/><span>Produk unggulan</span></label></div>
    <button className="button button-primary" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan produk'}</button>
  </form>;
}
