# Arga Damar API

Backend modular monolith untuk e-commerce material dan peralatan listrik PT Arga Damar Abadi.

## Stack

- NestJS 11
- Prisma ORM 7
- PostgreSQL 17
- JWT/Passport foundation
- Swagger/OpenAPI
- Docker Compose

## Menjalankan lokal

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run start:dev
```

API tersedia pada `http://localhost:3000/api/v1` dan Swagger pada `http://localhost:3000/docs` selama bukan production.

## Validasi

```bash
npm run lint
npm test
npm run build
```

## Modul domain

- `auth`: autentikasi, refresh-token rotation, dan RBAC
- `users`: profil, alamat, serta manajemen role/status pengguna oleh admin
- `catalog`: produk, kategori, brand, gambar, dan spesifikasi
- `inventory`: stok tersedia dan stok reservasi
- `carts`: keranjang belanja
- `orders`: checkout transaksional, ongkir berbasis berat, dan lifecycle pesanan
- `payments`: payment provider dan webhook
- `quotations`: permintaan, review harga, dan keputusan quotation

## Konfigurasi ongkir

`SHIPPING_BASE_COST` adalah tarif kilogram pertama dan
`SHIPPING_PER_KG_COST` adalah tambahan per kilogram berikutnya. Berat dibulatkan
ke atas dan dihitung sepenuhnya di backend agar total Midtrans tidak dapat
dimanipulasi client.

## Catatan keamanan

- Jangan commit `.env` atau credential.
- Ganti seluruh secret contoh sebelum menjalankan aplikasi.
- Validasi signature webhook payment provider sebelum mengubah status pembayaran.
- Checkout wajib menggunakan transaction dan idempotency key.
- Upload BOQ harus dibatasi berdasarkan ukuran, MIME type, dan hasil malware scan.
