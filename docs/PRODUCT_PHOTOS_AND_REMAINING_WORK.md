# Foto produk dan pekerjaan tersisa

Pemeriksaan codebase: 18 September 2026. Ini catatan implementasi, bukan klaim bahwa seluruh PRD sudah production-ready.

## Foto produk

- Admin: `/admin/products/new` atau `/admin/products/[id]/edit` → **Foto produk**.
- Pilih beberapa foto atau drag-and-drop. Maksimal 10 foto per produk, JPEG/PNG/WebP, 5 MB per file.
- Upload langsung ke endpoint backend; server memeriksa isi gambar, membatasi pixel, resize maksimal 1600×1600, menghapus metadata lewat re-encoding, dan menyimpan WebP.
- Pratinjau menampilkan foto yang berhasil diunggah. Pilih **Jadikan utama** untuk mengganti foto kartu produk.
- Klik **Simpan produk** setelah upload. Tombol simpan diblokir selama upload berlangsung.
- Detail produk menampilkan galeri thumbnail. Kartu, cart, checkout, dan detail memakai foto, bukan ilustrasi ikon.
- Foto kosong/rusak menampilkan teks netral “Foto belum tersedia”. Backend gagal tidak lagi diganti katalog produk demo.
- Menghapus foto dari daftar hanya melepasnya dari produk setelah disimpan; objek storage tidak langsung dihapus.

### Yang masih diperlukan agar upload berjalan

Pada `.env` backend, `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` belum terisi saat pemeriksaan. Nilai secret tidak ditampilkan atau diubah.

1. Gunakan Supabase project milik toko, buat bucket **public** bernama `product-images`. Bucket ini hanya untuk foto produk, bukan BOQ.
2. Isi `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `STORAGE_IMAGES_BUCKET=product-images` pada `ada-be/.env`. Contoh nama variabel ada di `ada-be/.env.example`.
3. Service-role key hanya untuk backend. Jangan gunakan `NEXT_PUBLIC_*`, jangan commit `.env`, dan jangan membuat anonymous write policy untuk bucket.
4. Periksa status migrasi. Tabel `media_assets` diperlukan oleh upload. Terapkan migrasi yang sudah ditinjau pada database development/staging lebih dahulu; lakukan backup sebelum production. Tidak ada migrasi/reset database remote yang dijalankan dalam pekerjaan ini.
5. Restart backend, login sebagai Staff/Admin/Super Admin, upload satu foto dari halaman produk, simpan, lalu cek storefront sebagai guest.

Bucket dan upload remote belum diverifikasi karena konfigurasi storage belum tersedia. Foto asli harus diunggah oleh pengelola; aplikasi tidak membuat foto produk palsu.

## Masalah/backlog yang belum selesai

| Prioritas | Masalah | Dampak / tindak lanjut |
|---|---|---|
| P0 | Storage belum dikonfigurasi | UI upload ada, tetapi upload foto sungguhan belum dapat dijalankan sampai konfigurasi dan bucket tersedia. |
| P0 | Migrasi baru belum diverifikasi pada database aktual | Perlu deploy urut ke DB test kosong, uji upgrade data lama, backup dan restore drill sebelum production. |
| P0 | Voucher belum diseimbangkan dengan payload Midtrans | Checkout mengurangi `Order.total`, tetapi `item_details` pada Snap belum memuat diskon. Jangan aktifkan voucher untuk transaksi nyata sebelum integrasi nominal dan sandbox test diperbaiki. |
| P0 | Verifikasi end-to-end belum lengkap | Dua test PostgreSQL dilewati karena `TEST_DATABASE_URL` tidak tersedia; ini bukan kelulusan E2E. Upload storage, sandbox payment/refund, RBAC, fulfillment, dan quotation perlu smoke test nyata. |
| P0 | Production operations belum tuntas | TLS, centralized monitoring/alerting, backup/restore, deployment rollback, dan distributed rate limit belum tervalidasi. Health endpoint saat ini hanya liveness, bukan readiness DB. |
| P1 | Email dan BOQ scanner belum dikonfigurasi | `SMTP_HOST` dan `CLAMAV_HOST` belum terisi; recovery email serta scan BOQ belum dapat diuji live. Notifikasi/maintenance worker default nonaktif. |
| P1 | Lifecycle foto belum lengkap | File yang terlepas belum dibersihkan otomatis. Penghapusan fisik foto sengaja ditolak untuk mencegah race dengan penggunaan URL oleh produk. Perlu relasi media yang kuat dan garbage collection aman. |
| P1 | Kurir/tracking dan WhatsApp belum lengkap | Adapter estimasi Biteship awal tersedia, default tarif internal; pengujian akun kurir, tracking, dan kanal WhatsApp belum selesai. |
| P1 | Pagination/admin navigation belum merata | Laporan memiliki pagination, tetapi beberapa list/editor lama masih terbatas 100–200 data. Modul baru belum semuanya memiliki navigasi admin. |
| P2 | Supplier/PO belum terhubung ke aplikasi | File backend/UI sudah tersedia, tetapi `ProcurementModule` belum dimasukkan ke root AppModule dan belum diuji end-to-end. |
| P2 | Multi-gudang belum diimplementasikan | Baru ada rancangan schema fragment. Reservasi, pembayaran, pembatalan, refund, dan fulfillment masih memakai stok agregat satu inventory per produk. Pilihan pengguna: order boleh mengambil dari beberapa gudang. |
| P2 | ERP/accounting belum diimplementasikan | Belum ada adapter sinkronisasi atau mapping akuntansi yang tervalidasi. |
| P2 | Analytics belum menutup seluruh metrik PRD | Ringkasan operasional/rekomendasi produk tersedia dalam kode, tetapi conversion funnel dan pengukuran performa lapangan belum tersedia. |

Tambahan audit: reset password masih mengirim email sinkron (ada potensi perbedaan timing antar akun); audit interceptor bukan transaksi atomik untuk semua mutasi; retry SMTP memiliki semantik at-least-once. Ini perlu ditangani sebelum klaim hardening production penuh.

## Hasil verifikasi lokal

- Frontend `typecheck`: lulus.
- Frontend production `build`: lulus.
- Backend `build`: lulus setelah perbaikan typing analytics/shipping.
- Backend `lint --max-warnings=0`: lulus.
- Backend unit tests: **28 suites, 80 tests lulus**. Termasuk validasi MIME, decoding/resize WebP, batas ukuran, dan akses media.
- PostgreSQL E2E: **1 suite / 2 test skipped**, bukan pass; database test belum dikonfigurasi.
- Upload remote dan interaksi browser admin berautentikasi: belum diuji.

Tidak dilakukan push, deploy, pengisian secret, atau reset database.
