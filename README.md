# Arga Damar Abadi Commerce

Platform e-commerce B2C/B2B PT Arga Damar Abadi untuk penjualan material dan
peralatan listrik. Repository ini berisi storefront customer, dashboard admin,
REST API, skema PostgreSQL, serta konfigurasi deployment satu VPS.

## Stack

| Bagian | Teknologi |
| --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript |
| Backend | NestJS 11, Prisma 7, TypeScript |
| Database | PostgreSQL 17 (lokal atau Supabase) |
| Payment | Midtrans Snap dan webhook |
| Storage | Supabase Storage |
| Deployment | Docker Compose, Caddy, TLS otomatis |

## Fitur

- Katalog publik dengan pencarian, filter, kategori, brand, dan foto produk.
- Registrasi, verifikasi email, login, refresh token, pemulihan akun, dan RBAC.
- Keranjang, alamat, checkout transaksional, ongkir, pembayaran, order, dan refund.
- Quotation/BOQ untuk kebutuhan proyek.
- Multi-gudang, reservasi stok, transfer, tracking, supplier, dan purchase order.
- Promosi/voucher, notifikasi email/WhatsApp, analytics, laporan, dan audit log.
- Dashboard admin untuk produk, katalog, inventory, gudang, procurement, order,
  quotation, promosi, notifikasi, laporan, serta pengguna.

## Struktur repository

```text
.
|-- ada-be/    NestJS API, Prisma schema, migration, dan seed
|-- ada-fe/    Next.js storefront dan dashboard admin
|-- deploy/    Docker Compose, Caddy, dan runbook production
`-- docs/      Status implementasi dan prosedur database
```

Dokumentasi lebih rinci tersedia di [backend](./ada-be/README.md),
[frontend](./ada-fe/README.md), dan [deployment](./deploy/README.md).

## Prasyarat

- Node.js 24 dan npm
- PostgreSQL 17 atau project Supabase aktif
- Docker Desktop jika memakai database/service lokal

## Menjalankan secara lokal

### 1. Backend

Jalankan dari PowerShell:

```powershell
Set-Location .\ada-be
Copy-Item .env.example .env
docker compose up -d
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run start:dev
```

Sesuaikan `ada-be/.env` sebelum start. Minimal ganti `DATABASE_URL`,
`JWT_ACCESS_SECRET`, dan `JWT_REFRESH_SECRET`. Kedua JWT secret harus berbeda dan
minimal 32 karakter.

Backend tersedia di:

- API: `http://localhost:3000/api/v1`
- Swagger (non-production): `http://localhost:3000/docs`
- Health check: `http://localhost:3000/api/v1/health`

Untuk email lokal dan pemindaian BOQ:

```powershell
docker compose -f docker-compose.operations.yml up -d
```

Mailpit tersedia di `http://localhost:8025`.

### 2. Frontend

Buka terminal PowerShell kedua dari root repository:

```powershell
Set-Location .\ada-fe
Copy-Item .env.example .env.local
npm ci
npm run dev
```

- Storefront: `http://localhost:3001`
- Login: `http://localhost:3001/login`
- Dashboard admin: `http://localhost:3001/admin`

Customer dapat melihat katalog tanpa login. Login diwajibkan saat checkout,
membuka data akun, order, atau quotation miliknya.

## Database dan data awal

Untuk Supabase, gunakan connection string PostgreSQL server-side pada
`DATABASE_URL`; frontend tidak mengakses tabel Supabase secara langsung.

```powershell
Set-Location .\ada-be
npm run prisma:deploy
```

Setelah migration berhasil, ikuti
[prosedur initial data Supabase](./docs/SUPABASE_INITIAL_DATA.md). Seed katalog
production berada di `ada-be/prisma/seed.production-catalog.sql` dan hanya boleh
dijalankan pada database baru atau pre-launch.

Storage membutuhkan dua bucket:

- `product-images`: public
- `boq-private`: private

Simpan `SUPABASE_SERVICE_ROLE_KEY` hanya di environment backend. Jangan memakai
service-role key di frontend atau melakukan commit file `.env`.

## Payment Midtrans

Gunakan Midtrans Sandbox selama pengembangan:

```dotenv
MIDTRANS_SERVER_KEY=SB-Mid-server-your-key
MIDTRANS_IS_PRODUCTION=false
FRONTEND_URL=http://localhost:3001
```

- Finish URL: `http://localhost:3001/payment/finish`
- Notification URL production:
  `https://<domain>/api/v1/payments/webhooks/midtrans`
- Data transaksi tersimpan di tabel PostgreSQL `payments`.
- Operasi payment dan refund admin berada di `/admin/orders`, bukan halaman
  `/admin/payments` terpisah.

## Administrator pertama

Tidak ada password admin bawaan. Daftarkan akun melalui aplikasi, verifikasi
emailnya, lalu promosikan akun pertama dari `ada-be`:

```powershell
$env:ADMIN_BOOTSTRAP_EMAIL='admin@domain-toko.id'
$env:ADMIN_BOOTSTRAP_CONFIRM='CREATE_FIRST_SUPER_ADMIN'
npm run build
node dist/scripts/bootstrap-admin.js
Remove-Item Env:ADMIN_BOOTSTRAP_EMAIL
Remove-Item Env:ADMIN_BOOTSTRAP_CONFIRM
```

Script hanya menerima akun aktif dan terverifikasi, menolak jika `SUPER_ADMIN`
sudah ada, serta mencatat perubahan ke audit log. Admin berikutnya dikelola dari
`/admin/users`.

## Quality gate

Backend:

```powershell
Set-Location .\ada-be
npm run lint
npm test -- --runInBand
npm run build
```

Frontend:

```powershell
Set-Location .\ada-fe
npm test
npm run typecheck
npm run build
```

CI juga menjalankan migration dan E2E terhadap PostgreSQL 17, memvalidasi seed,
serta membangun image Docker backend dan frontend.

## Deployment

Konfigurasi production tersedia, tetapi repository tidak menetapkan server,
domain, atau deployment live. Ikuti [deployment runbook](./deploy/README.md) untuk
setup VPS, DNS, TLS, backup, migration, bootstrap admin, dan go-live gate.

Jangan mengaktifkan Midtrans production sebelum webhook, duplicate delivery,
expiry, cancel, refund/restock, dan rekonsiliasi payment lolos di sandbox.

## Lisensi

Private project. Seluruh hak cipta milik PT Arga Damar Abadi.
