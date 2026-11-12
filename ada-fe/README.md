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

Katalog mengambil data dari Product API. Jika API tidak tersedia, UI menampilkan
pesan gagal dan pilihan mencoba kembali; tidak menampilkan katalog demo sebagai data toko.
Storefront mencakup katalog publik, cart, checkout,
akun, order, dan quotation. Admin console mencakup dashboard, produk, struktur
katalog, inventory, fulfillment order, quotation, dan kontrol akses pengguna.

Checkout menyimpan alamat sebelum menghitung ongkir. Ringkasan subtotal, diskon,
ongkir dan total berasal dari backend; perubahan nominal mengharuskan review ulang.
Hasil pembayaran dibaca dari order milik pengguna, bukan parameter status callback.
Pilihan tambah ke keranjang diteruskan setelah login/registrasi melalui cookie
httpOnly berumur 10 menit. Form quotation mendukung pencarian katalog berhalaman,
banyak item, dan spesifikasi di luar katalog.
