# Deployment runbook — Arga Damar Abadi

Status: konfigurasi deploy tersedia; **belum deploy live**. Belum ada server/domain tujuan yang ditetapkan. Jangan memakai production untuk integration test.

## Topologi default

Satu VPS dengan Docker Compose: Caddy TLS → Next.js BFF → Nest API → PostgreSQL eksternal (contoh Supabase). Hanya port 80/443 publik; Nest dan frontend tidak menerbitkan port host. API publik hanya callback Midtrans `/api/v1/payments/webhooks/midtrans`. Admin tetap `/admin`, dilindungi role di frontend **dan** backend.

Mulai dengan satu replica frontend/backend. Refresh-token single-flight dan rate limiter masih in-memory; sebelum horizontal scaling, gunakan koordinasi sesi/rate limiting bersama. Backend menerima trafik BFF melalui satu IP; load-test limit default sebelum go-live dan jangan mempercayai `X-Forwarded-For` arbitrer.

## Persiapan

1. Tetapkan VPS, domain milik Anda, DNS A/AAAA yang benar, akses Docker, serta firewall 80/443. Caddy memperoleh TLS otomatis setelah DNS dapat diakses. Jangan arahkan DNS produksi sebelum staging lolos.
2. Salin `deploy/.env.example` ke `deploy/.env`. Isi APP_DOMAIN (tanpa skema/path) dan ACME_EMAIL.
3. Salin `ada-be/.env.example` ke `deploy/.env.backend`; ganti DATABASE_URL dengan koneksi PostgreSQL yang mendukung transaksi/migrasi. JWT secrets harus acak, berbeda, minimal 32 karakter. Jangan commit file ini atau mengirim isinya ke chat.
4. Gunakan Midtrans **sandbox** dulu. Notification URL: `https://<domain>/api/v1/payments/webhooks/midtrans`; finish URL: `https://<domain>/payment/finish`. Verifikasi signature dan ulangi webhook yang sama untuk membuktikan stok tidak berkurang dua kali.
5. SMTP production, MAIL_FROM, Supabase Storage (public `product-images`, private `boq-private`) dan scanner ClamAV wajib diisi untuk mengaktifkan fitur terkait. ClamAV harus dapat dijangkau dari container, bukan `localhost` VPS. Jangan membuka port scanner ke internet.
6. `SHIPPING_PROVIDER=INTERNAL` adalah default. BITESHIP memerlukan API key dan origin postal code. Tracking ID harus berasal dari shipment Biteship, bukan nomor resi. WhatsApp membutuhkan opt-in customer, template utility disetujui (2 parameter body: subject/message), versi Graph API yang aktif, serta token server-only.
7. Aktifkan NOTIFICATIONS_ENABLED hanya setelah SMTP diuji. Aktifkan MAINTENANCE_ENABLED setelah sandbox expiry/refund berhasil. Jalankan satu worker awalnya. Pengiriman notifikasi at-least-once: provider sukses lalu transaksi lokal gagal dapat menyebabkan pengiriman ulang.

Tidak ada password admin bawaan. Registrasikan akun dengan email sendiri, lalu gunakan prosedur bootstrap admin di bawah. Jangan membuat kredensial bersama/hardcoded.

### Bootstrap admin pertama

Setelah registrasi dan verifikasi email pemilik toko, set environment operator `ADMIN_BOOTSTRAP_EMAIL` ke email tersebut dan `ADMIN_BOOTSTRAP_CONFIRM=CREATE_FIRST_SUPER_ADMIN`. Jalankan satu kali di VPS:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yml exec -e ADMIN_BOOTSTRAP_EMAIL -e ADMIN_BOOTSTRAP_CONFIRM api node dist/scripts/bootstrap-admin.js
```

Script menolak jika akun belum diverifikasi atau SUPER_ADMIN sudah ada. Tidak membuat/mengganti password. Role assignment tercatat di audit log. Hapus environment bootstrap setelah selesai; login ulang, buka `/admin`. Admin berikutnya dikelola melalui `/admin/users` oleh SUPER_ADMIN.

## Release (jalankan di VPS dari root repo)

```sh
docker compose --env-file deploy/.env -f deploy/compose.yml build
# Backup dahulu. Hentikan semua writer termasuk worker/instance lama.
docker compose --env-file deploy/.env -f deploy/compose.yml stop web api
docker compose --env-file deploy/.env -f deploy/compose.yml --profile tools run --rm migrate
# Hanya lanjut jika migrasi exit 0; jangan reset DB atau resolve applied secara buta.
docker compose --env-file deploy/.env -f deploy/compose.yml up -d api web caddy
docker compose --env-file deploy/.env -f deploy/compose.yml ps
```

Migration `20260919100000_warehouses` mengunci tabel inventory/order dan memeriksa reserved sama dengan pending orders. Jika gagal, rollback transaksi migration dan rekonsiliasi stok dengan audit; **jangan bypass**. Index composite warehouse/product dan order/product/warehouse menjaga lookup/alokasi efisien; transfer tidak mengubah stok agregat. Jalankan `ANALYZE` setelah migrasi besar, lalu periksa EXPLAIN di staging sebelum menambah index.

Migrasi yang ditambahkan sesudahnya: `20260919110000_notification_channels`, `20260919120000_tracking`.

## Backup & rollback

- Gunakan backup/PITR provider dan simpan backup sebelum migrasi. Verifikasi jadwal/retensi, jangan menganggap plan gratis menyediakan PITR.
- Dengan PostgreSQL client yang kompatibel, set PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD/PGSSLMODE melalui secret manager/environment, bukan argumen command. `pg_dump --format=custom --file=<path-backup-baru>.dump` menghasilkan backup; jangan menimpa backup sebelumnya. File berisi data pribadi: enkripsi dan simpan off-host.
- Restore drill hanya ke database kosong **terpisah** berakhiran `_restore_test`: arahkan environment ke DB tersebut, jalankan `pg_restore --exit-on-error --no-owner --no-acl --dbname=<nama_restore_test> <backup>.dump`. Jangan gunakan `--clean` atau target production. Periksa row counts, relasi order/items/payment, migrasi, dan balance gudang.
- Simpan tag image/revision terakhir yang lolos. Rollback aplikasi dengan image lama hanya jika kompatibel dengan schema yang sudah dimigrasikan. Jangan otomatis rollback schema/restore production karena bisa menghilangkan order baru; hentikan writer dan rencanakan forward-fix bila tidak kompatibel.

## Go-live gate

- CI lint/unit/build frontend-backend hijau; PostgreSQL integration suite dan migrasi dari DB kosong lolos.
- Docker image build dan startup benar-benar diuji di VPS/CI (Docker tidak tersedia di workstation saat penyusunan).
- Customer anonim dapat browse/search/filter; checkout meminta login dan kembali ke tujuan aman.
- Register/login/refresh/logout/recovery; customer tidak dapat mengakses admin, BOQ atau order milik orang lain.
- Upload foto asli, BOQ clean diterima, file invalid/terinfeksi ditolak.
- Dua checkout berebut stok terakhir: hanya satu menang. Voucher, pembayaran sandbox, duplikasi webhook, expiry, cancel, refund/restock, PO receipt ulang, transfer gudang tervalidasi.
- Fulfillment, resi, notifikasi, laporan, quotation accepted → order diuji manual.
- Backup berhasil **dan** restore drill dibuktikan. Monitor `/api/health` eksternal dan `/api/v1/health/ready` internal; alert pada unhealthy/restart, payment reconciliation failure dan notification delivery failure.

## Referensi

- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Docker health-dependent startup](https://docs.docker.com/compose/how-tos/startup-order/)
- [Midtrans cancel Snap](https://docs.midtrans.com/reference/cancel-a-snap-session)
- [Biteship tracking](https://biteship.com/en/docs/api/trackings/retrieve)
