# Supabase initial data

Gunakan prosedur ini hanya untuk database baru atau database pre-launch. Seed akan
berhenti otomatis jika sudah menemukan cart item, quotation, order, pergerakan
stok, transfer gudang, purchase order, atau redemption voucher.

## 1. Terapkan schema dan pengamanan Data API

Dari `ada-be`, dengan `DATABASE_URL` production sudah tersedia melalui environment:

```powershell
npm run prisma:deploy
```

Migration terakhir mengaktifkan RLS dan mencabut akses tabel aplikasi dari role
Supabase `anon` dan `authenticated`. Arsitektur aplikasi ini mengakses database
melalui NestJS, sehingga `DATABASE_URL` backend harus memakai database owner/server
role, bukan anon key atau authenticated role.

## 2. Isi katalog awal

Buka Supabase Dashboard > SQL Editor, salin seluruh isi
`ada-be/prisma/seed.production-catalog.sql`, lalu pilih **Run**. Script berjalan
dalam satu transaction, dapat diulang untuk record seed yang sama, dan melakukan
validasi saldo inventory sebelum commit.

Hasil verifikasi yang diharapkan:

| Entity | Total |
| --- | ---: |
| categories | 13 |
| brands | 8 |
| products | 16 |
| product_images | 16 |
| inventories | 16 |
| warehouse_stocks | 48 |
| warehouses | 3 |
| suppliers | 3 |
| promotions | 2 |

Voucher awal yang aktif adalah `SELAMATDATANG` dan `PROYEKHEMAT`.

## 3. Konfigurasi media production

Di Supabase Storage, buat bucket public `product-images` dan bucket private
`boq-private`. Isi `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`STORAGE_IMAGES_BUCKET`, dan `STORAGE_BOQ_BUCKET` hanya pada environment backend.
Jangan pernah memasukkan service-role key ke frontend.

Foto seed adalah foto katalog eksternal agar storefront langsung layak dilihat.
Sebelum penjualan nyata, admin harus mengganti foto tersebut dengan packshot produk
milik toko melalui fitur upload admin dan memperbarui kontak supplier contoh.

## 4. Buat administrator pertama

Tidak ada password admin bawaan di SQL. Daftarkan dan verifikasi akun melalui
aplikasi, build backend, lalu promosikan email tersebut secara eksplisit:

```powershell
$env:ADMIN_BOOTSTRAP_EMAIL='admin@domain-toko.id'
$env:ADMIN_BOOTSTRAP_CONFIRM='CREATE_FIRST_SUPER_ADMIN'
npm run build
node dist/scripts/bootstrap-admin.js
```

Hapus kedua environment variable sesudah bootstrap. Jangan menyimpan password atau
service-role key di repository.
