# Status release — 19 September 2026

## Implementasi batch ini

- Katalog publik: pencarian, kategori/brand, harga, sorting, pagination, empty/error/loading states, foto asli, badge cart dinamis. Tidak mewajibkan login untuk browse.
- Sesi frontend: POST same-origin refresh, HTTP-only cookies, single-flight, retry sementara, safe returnTo dan renewal halaman private. Server Actions menggunakan token yang diperbarui.
- Gudang: saldo per gudang, reservasi split order, consume/release/return sesuai state pembayaran, transfer idempotent, halaman admin gudang, pilihan gudang adjustment dan penerimaan PO. Pengiriman **konsolidasi**, bukan shipment terpisah tiap gudang.
- Midtrans: total detail termasuk diskon voucher, validasi URL/session provider, lifecycle expiry/deny, pembatalan Snap sebelum release pada rekonsiliasi, refund reconciliation.
- Tracking: lookup Biteship tracking ID yang cocok dengan resi order, admin linking, timeline customer/admin, mode manual bila provider belum dikonfigurasi.
- Notifikasi: email + WhatsApp template opt-in, retry admin, pencabutan consent diperiksa ulang sebelum pengiriman.
- Deploy: Docker frontend/backend/migrator, dependency runtime diperbaiki, Compose+Caddy HTTPS, readiness DB, bootstrap admin terverifikasi tanpa default password, runbook backup/restore/rollback. Tidak ada deployment otomatis ke production.

## Verifikasi lokal

- Backend: lint dan build lulus; 32 suites / 96 unit tests lulus.
- Frontend: typecheck, 11 tests, production build lulus, termasuk pilihan gudang adjustment.
- PostgreSQL integration: suite tersedia, kini 3 skenario termasuk split gudang; belum dieksekusi lokal karena TEST_DATABASE_URL terisolasi tidak tersedia. CI menggunakan database `arga_damar_test` khusus.
- Docker tidak tersedia lokal. CI container-build ditambahkan; hasil harus diperiksa sebelum release.
- Tidak mengubah data production, tidak menjalankan bootstrap admin, tidak mengirim email/WhatsApp/pembayaran nyata.

## Yang masih menahan go-live

1. Server/platform dan domain belum ditetapkan. Konfigurasi deploy default adalah satu VPS; perlu deployment credentials melalui environment/secret manager, bukan chat.
2. Supabase Storage, SMTP, scanner, Midtrans sandbox/webhook perlu konfigurasi dan pengujian nyata. WhatsApp/Biteship opsional; default tarif internal, notifikasi WhatsApp off.
3. Verifikasi CI PostgreSQL/container, smoke role matrix, upload, pembayaran sandbox, notification dan restore drill belum dibuktikan.
4. ERP/accounting sinkronisasi, recommendation/personalization, dan analytics funnel lanjut masih backlog P2. Analytics operasional, supplier/PO, voucher dan multi-gudang sudah memiliki implementasi. Mapping chart of accounts/tax dan ERP instance nyata belum tersedia; jangan anggap export laporan setara integrasi ERP.
5. Penghapusan fisik foto storage masih sengaja diblokir untuk mencegah race dengan URL produk. Foto bisa dilepas dari produk; lifecycle orphan cleanup/FK media belum diimplementasikan.
6. Beberapa daftar admin lama masih memakai batas 100–200, belum semuanya paginated. Daftar gudang selector maksimum 100; transfer terakhir 25.
7. Sebelum multi-instance: shared session refresh coordinator dan rate limiter, load-test limit BFF, serta alerting eksternal. Saat ini observability berupa structured logs/health, belum layanan alert terkonfigurasi.

Panduan operasional dan gate lengkap: [deploy/README.md](../deploy/README.md). Jangan menyebut release siap production sebelum gate itu lulus.
