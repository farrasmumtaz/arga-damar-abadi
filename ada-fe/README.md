# Arga Damar Storefront

Customer storefront berbasis Next.js App Router.

## Menjalankan lokal

```bash
cp .env.example .env.local
npm install
npm run dev
```

Frontend berjalan di `http://localhost:3001` dan mengakses backend melalui
`API_URL`.

## Quality gate

```bash
npm run typecheck
npm run build
```

Katalog mengambil data dari Product API dan otomatis memakai typed local fallback
saat backend belum tersedia. Storefront mencakup katalog publik, cart, checkout,
akun, order, dan quotation. Admin console mencakup dashboard, produk, struktur
katalog, inventory, fulfillment order, quotation, dan kontrol akses pengguna.
