-- Arga Damar Abadi initial catalog seed for an EMPTY or pre-launch database.
-- Idempotent for the deterministic records below. It intentionally does not create
-- fake users, carts, orders, payments, quotations, refunds, notifications, or audits.
-- Run after every Prisma migration has succeeded.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.products') IS NULL
     OR to_regclass('public.warehouse_stocks') IS NULL
     OR to_regclass('public.promotions') IS NULL THEN
    RAISE EXCEPTION 'Schema belum lengkap. Jalankan semua Prisma migration sebelum seed.';
  END IF;
  IF EXISTS (SELECT 1 FROM orders LIMIT 1)
     OR EXISTS (SELECT 1 FROM purchase_orders LIMIT 1)
     OR EXISTS (SELECT 1 FROM quotations LIMIT 1)
     OR EXISTS (SELECT 1 FROM cart_items LIMIT 1)
     OR EXISTS (SELECT 1 FROM stock_movements LIMIT 1)
     OR EXISTS (SELECT 1 FROM warehouse_transfers LIMIT 1)
     OR EXISTS (SELECT 1 FROM promotion_redemptions LIMIT 1) THEN
    RAISE EXCEPTION 'Seed katalog awal ditolak karena transaksi bisnis sudah ada.';
  END IF;
END $$;

INSERT INTO categories (id, parent_id, name, slug, is_active, sort_order, created_at, updated_at)
VALUES
  ('10000000-0000-4000-8000-000000000001', NULL, 'Perkakas', 'perkakas', true, 10, NOW(), NOW()),
  ('10000000-0000-4000-8000-000000000002', NULL, 'Material Bangunan', 'material-bangunan', true, 20, NOW(), NOW()),
  ('10000000-0000-4000-8000-000000000003', NULL, 'Kelistrikan', 'kelistrikan', true, 30, NOW(), NOW()),
  ('10000000-0000-4000-8000-000000000004', NULL, 'Plumbing', 'plumbing', true, 40, NOW(), NOW()),
  ('10000000-0000-4000-8000-000000000005', NULL, 'Cat & Finishing', 'cat-finishing', true, 50, NOW(), NOW()),
  ('10000000-0000-4000-8000-000000000006', NULL, 'Keselamatan Kerja', 'keselamatan-kerja', true, 60, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id, name = EXCLUDED.name, slug = EXCLUDED.slug,
  is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO categories (id, parent_id, name, slug, is_active, sort_order, created_at, updated_at)
VALUES
  ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Power Tools', 'power-tools', true, 11, NOW(), NOW()),
  ('11000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Hand Tools', 'hand-tools', true, 12, NOW(), NOW()),
  ('11000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Semen & Mortar', 'semen-mortar', true, 21, NOW(), NOW()),
  ('11000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'Kabel & Instalasi', 'kabel-instalasi', true, 31, NOW(), NOW()),
  ('11000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000004', 'Pipa & Fitting', 'pipa-fitting', true, 41, NOW(), NOW()),
  ('11000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000005', 'Cat Interior & Eksterior', 'cat-interior-eksterior', true, 51, NOW(), NOW()),
  ('11000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000006', 'APD Proyek', 'apd-proyek', true, 61, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id, name = EXCLUDED.name, slug = EXCLUDED.slug,
  is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO brands (id, name, slug, logo_url, is_active, created_at, updated_at)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'Bosch Professional', 'bosch-professional', NULL, true, NOW(), NOW()),
  ('20000000-0000-4000-8000-000000000002', 'Makita', 'makita', NULL, true, NOW(), NOW()),
  ('20000000-0000-4000-8000-000000000003', 'Krisbow', 'krisbow', NULL, true, NOW(), NOW()),
  ('20000000-0000-4000-8000-000000000004', 'Supreme Cable', 'supreme-cable', NULL, true, NOW(), NOW()),
  ('20000000-0000-4000-8000-000000000005', 'Rucika', 'rucika', NULL, true, NOW(), NOW()),
  ('20000000-0000-4000-8000-000000000006', 'Dulux', 'dulux', NULL, true, NOW(), NOW()),
  ('20000000-0000-4000-8000-000000000007', 'Semen Tiga Roda', 'semen-tiga-roda', NULL, true, NOW(), NOW()),
  ('20000000-0000-4000-8000-000000000008', 'ProGuard', 'proguard', NULL, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, logo_url = EXCLUDED.logo_url,
  is_active = EXCLUDED.is_active, updated_at = NOW();

INSERT INTO products
  (id, category_id, brand_id, sku, name, slug, short_description, description,
   specifications, price, weight_gram, status, is_featured, created_at, updated_at)
VALUES
  ('30000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','ADA-BOS-GSB13','Bosch GSB 13 RE Impact Drill','bosch-gsb-13-re-impact-drill','Bor impact ringkas untuk pekerjaan instalasi dan renovasi.','Mesin bor profesional dengan kontrol kecepatan variabel, mode impact, dan desain ergonomis untuk penggunaan harian.', '{"daya":"600 W","kapasitas_beton":"13 mm","kecepatan":"0-2800 rpm","garansi":"1 tahun"}'::jsonb, 925000, 1800, 'ACTIVE', true, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','ADA-MAK-GA4030','Makita GA4030 Angle Grinder 4 Inch','makita-ga4030-angle-grinder','Gerinda kompak untuk potong dan finishing logam.','Angle grinder 4 inci dengan bodi ramping, pelindung cakram, dan performa stabil untuk pekerjaan fabrikasi.', '{"daya":"720 W","diameter_cakram":"100 mm","kecepatan":"11000 rpm","garansi":"1 tahun"}'::jsonb, 1185000, 1900, 'ACTIVE', true, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','ADA-MAK-HS7600','Makita HS7600 Circular Saw','makita-hs7600-circular-saw','Circular saw presisi untuk kayu dan panel.','Gergaji circular dengan pengaturan kedalaman dan sudut potong untuk kebutuhan workshop maupun proyek.', '{"daya":"1200 W","diameter_pisau":"185 mm","kedalaman_potong":"64 mm"}'::jsonb, 2395000, 4800, 'ACTIVE', true, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','ADA-KRI-TOOL108','Krisbow Tool Set 108 Pieces','krisbow-tool-set-108-pieces','Set perkakas lengkap untuk teknisi dan maintenance.','Koper perkakas dengan socket, kunci, tang, obeng, dan ratchet untuk pekerjaan mekanikal umum.', '{"jumlah":"108 pcs","material":"chrome vanadium","kemasan":"hard case"}'::jsonb, 1899000, 8500, 'ACTIVE', true, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000005','11000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','ADA-KRI-HAM500','Krisbow Claw Hammer 500 g','krisbow-claw-hammer-500g','Palu cakar untuk pekerjaan konstruksi dan pertukangan.','Kepala baja tempa dengan gagang anti-slip untuk memukul dan mencabut paku secara aman.', '{"berat_kepala":"500 g","material":"forged steel","gagang":"fiberglass"}'::jsonb, 159000, 700, 'ACTIVE', false, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000006','11000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000007','ADA-STR-PCC50','Semen Tiga Roda PCC 50 kg','semen-tiga-roda-pcc-50kg','Semen serbaguna untuk pasangan, plester, dan beton.','Portland Composite Cement untuk kebutuhan konstruksi umum dengan workability baik dan hasil akhir padat.', '{"berat":"50 kg","tipe":"PCC","aplikasi":"beton, pasangan, plester"}'::jsonb, 73500, 50000, 'ACTIVE', true, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000003',NULL,'ADA-MTR-INST25','Mortar Instan Perekat Bata Ringan 25 kg','mortar-instan-perekat-bata-ringan-25kg','Perekat tipis untuk pemasangan bata ringan.','Mortar siap pakai dengan daya rekat stabil, konsumsi efisien, dan hasil sambungan rapi.', '{"berat":"25 kg","tebal_aplikasi":"3 mm","perkiraan_cakupan":"10-12 m2"}'::jsonb, 89500, 25000, 'ACTIVE', false, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','ADA-SUP-NYM3X25','Supreme NYM 3 x 2.5 mm 50 m','supreme-nym-3x25mm-50m','Kabel instalasi bangunan tiga inti dalam gulungan 50 meter.','Kabel tembaga berisolasi untuk instalasi listrik tetap. Pemasangan wajib mengikuti PUIL oleh teknisi kompeten.', '{"inti":"3","luas_penampang":"2.5 mm2","panjang":"50 m","tegangan":"300/500 V"}'::jsonb, 1649000, 7600, 'ACTIVE', true, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000009','11000000-0000-4000-8000-000000000004',NULL,'ADA-MCB-1P16A','MCB 1 Pole 16A 6kA','mcb-1-pole-16a-6ka','Proteksi sirkuit satu fasa untuk panel distribusi.','Miniature circuit breaker kurva C untuk proteksi arus lebih dan hubung singkat pada instalasi sesuai spesifikasi.', '{"pole":"1P","arus":"16 A","breaking_capacity":"6 kA","curve":"C"}'::jsonb, 97500, 180, 'ACTIVE', false, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000010','11000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000005','ADA-RCK-AW075','Rucika AW 3/4 Inch x 4 m','rucika-aw-34-inch-4m','Pipa PVC tekanan untuk distribusi air bersih.','Pipa PVC kelas AW dengan panjang empat meter untuk instalasi air bertekanan.', '{"kelas":"AW","diameter":"3/4 inch","panjang":"4 m","material":"PVC"}'::jsonb, 68500, 1600, 'ACTIVE', true, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000011','11000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000005','ADA-RCK-ELB075','Rucika Elbow 90 Derajat AW 3/4 Inch','rucika-elbow-90-aw-34-inch','Fitting siku PVC untuk perubahan arah jalur pipa.','Elbow 90 derajat kelas AW dengan sambungan solvent cement.', '{"sudut":"90 derajat","kelas":"AW","diameter":"3/4 inch"}'::jsonb, 8900, 80, 'ACTIVE', false, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000012','11000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000006','ADA-DLX-PW5W','Dulux Pentalite White 5 L','dulux-pentalite-white-5l','Cat interior matte untuk dinding dan plafon.','Cat berbasis air dengan hasil halus, bau rendah, dan perawatan mudah untuk ruang hunian maupun komersial.', '{"volume":"5 L","warna":"white","hasil":"matte","aplikasi":"interior"}'::jsonb, 428000, 7200, 'ACTIVE', true, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000013','11000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000006','ADA-DLX-WP4W','Dulux Weathershield Powerflexx 4 L','dulux-weathershield-powerflexx-4l','Cat eksterior tahan cuaca untuk fasad bangunan.','Lapisan eksterior elastomerik yang membantu melindungi permukaan dari hujan dan retak rambut.', '{"volume":"4 L","warna":"white","aplikasi":"eksterior","hasil":"low sheen"}'::jsonb, 765000, 6000, 'ACTIVE', false, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000014','11000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000008','ADA-PGD-HELMW','ProGuard Safety Helmet White','proguard-safety-helmet-white','Helm proyek dengan suspensi yang dapat disetel.','Pelindung kepala untuk area proyek. Kesesuaian standar dan masa pakai harus diverifikasi sebelum penggunaan.', '{"warna":"putih","suspensi":"ratchet","ukuran":"adjustable"}'::jsonb, 89500, 420, 'ACTIVE', false, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000015','11000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000008','ADA-PGD-VESTY','ProGuard Safety Vest Yellow','proguard-safety-vest-yellow','Rompi high-visibility untuk pekerja lapangan.','Rompi warna terang dengan strip reflektif untuk meningkatkan visibilitas di area kerja.', '{"warna":"kuning","strip":"reflektif","ukuran":"all size"}'::jsonb, 54900, 220, 'ACTIVE', false, NOW(), NOW()),
  ('30000000-0000-4000-8000-000000000016','11000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000008','ADA-PGD-GLOVE','ProGuard Nitrile Coated Gloves','proguard-nitrile-coated-gloves','Sarung tangan kerja berlapis nitrile untuk handling.','Sarung tangan dengan grip untuk pekerjaan material handling ringan dan maintenance umum.', '{"lapisan":"nitrile","ukuran":"L","kemasan":"1 pasang"}'::jsonb, 32500, 120, 'ACTIVE', false, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id, brand_id = EXCLUDED.brand_id, sku = EXCLUDED.sku,
  name = EXCLUDED.name, slug = EXCLUDED.slug, short_description = EXCLUDED.short_description,
  description = EXCLUDED.description, specifications = EXCLUDED.specifications,
  price = EXCLUDED.price, weight_gram = EXCLUDED.weight_gram, status = EXCLUDED.status,
  is_featured = EXCLUDED.is_featured, updated_at = NOW();

-- Real photographs, not generated sticker/icon placeholders. Replace these editorial
-- URLs through the admin upload flow before a commercial launch if you need exact pack shots.
INSERT INTO product_images (id, product_id, url, alt_text, sort_order, created_at)
VALUES
  ('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=1200&q=82','Bor listrik untuk pekerjaan konstruksi',0,NOW()),
  ('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=82','Perkakas listrik di area kerja',0,NOW()),
  ('50000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=82&crop=entropy','Perkakas potong untuk workshop',0,NOW()),
  ('50000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000004','https://images.unsplash.com/photo-1586864387789-628af9feed72?auto=format&fit=crop&w=1200&q=82','Kumpulan perkakas tangan profesional',0,NOW()),
  ('50000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000005','https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1200&q=82','Perkakas tangan untuk pertukangan',0,NOW()),
  ('50000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000006','https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=82','Material semen pada proyek konstruksi',0,NOW()),
  ('50000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000007','https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=82','Material bangunan untuk pemasangan dinding',0,NOW()),
  ('50000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000008','https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=82&crop=left','Instalasi kabel listrik bangunan',0,NOW()),
  ('50000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000009','https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=82','Komponen panel listrik',0,NOW()),
  ('50000000-0000-4000-8000-000000000010','30000000-0000-4000-8000-000000000010','https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1200&q=82','Pipa untuk instalasi air',0,NOW()),
  ('50000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000011','https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1200&q=82','Fitting dan instalasi plumbing',0,NOW()),
  ('50000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000012','https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=82','Cat interior dan perlengkapan pengecatan',0,NOW()),
  ('50000000-0000-4000-8000-000000000013','30000000-0000-4000-8000-000000000013','https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=82&crop=right','Pengecatan eksterior bangunan',0,NOW()),
  ('50000000-0000-4000-8000-000000000014','30000000-0000-4000-8000-000000000014','https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=82','Helm keselamatan di lokasi proyek',0,NOW()),
  ('50000000-0000-4000-8000-000000000015','30000000-0000-4000-8000-000000000015','https://images.unsplash.com/photo-1578269174936-2709b6aeb913?auto=format&fit=crop&w=1200&q=82','Pekerja memakai perlengkapan keselamatan',0,NOW()),
  ('50000000-0000-4000-8000-000000000016','30000000-0000-4000-8000-000000000016','https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=1200&q=82','Sarung tangan pelindung untuk pekerjaan lapangan',0,NOW())
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id, url = EXCLUDED.url, alt_text = EXCLUDED.alt_text,
  sort_order = EXCLUDED.sort_order;

INSERT INTO warehouses (id, code, name, is_active, created_at)
VALUES
  ('11111111-1111-4111-8111-111111111111','DEFAULT','Gudang Utama Jakarta',true,NOW()),
  ('12000000-0000-4000-8000-000000000001','BDG','Gudang Bandung',true,NOW()),
  ('12000000-0000-4000-8000-000000000002','SBY','Gudang Surabaya',true,NOW())
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name, is_active = EXCLUDED.is_active;

WITH seeded_stock(warehouse_id, product_id, quantity) AS (VALUES
  ('11111111-1111-4111-8111-111111111111'::uuid,'30000000-0000-4000-8000-000000000001'::uuid,18),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',8),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001',6),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000002',12),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002',5),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002',5),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000003',7),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003',3),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003',2),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000004',9),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000004',4),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000004',2),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000005',35),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000005',20),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000005',15),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000006',180),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000006',90),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000006',80),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000007',100),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000007',50),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000007',40),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000008',20),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000008',10),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000008',8),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000009',45),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000009',20),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000009',15),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000010',75),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000010',40),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000010',35),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000011',160),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000011',80),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000011',60),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000012',25),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000012',12),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000012',8),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000013',16),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000013',8),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000013',6),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000014',60),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000014',30),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000014',25),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000015',55),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000015',25),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000015',20),
  ('11111111-1111-4111-8111-111111111111','30000000-0000-4000-8000-000000000016',80),('12000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000016',40),('12000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000016',30)
)
INSERT INTO warehouse_stocks (id, warehouse_id, product_id, quantity, reserved)
SELECT md5(warehouse_id::text || product_id::text)::uuid, warehouse_id, product_id, quantity, 0
FROM seeded_stock
ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity, reserved = 0;

INSERT INTO inventories (id, product_id, quantity, reserved, low_stock_level, updated_at)
SELECT md5('inventory:' || product_id::text)::uuid, product_id, SUM(quantity)::integer, 0,
       CASE WHEN SUM(quantity) >= 100 THEN 25 WHEN SUM(quantity) >= 40 THEN 10 ELSE 5 END, NOW()
FROM warehouse_stocks
WHERE product_id::text LIKE '30000000-0000-4000-8000-%'
GROUP BY product_id
ON CONFLICT (product_id) DO UPDATE SET
  quantity = EXCLUDED.quantity, reserved = 0,
  low_stock_level = EXCLUDED.low_stock_level, updated_at = NOW();

INSERT INTO suppliers (id, code, name, contact_name, email, phone, address, is_active, created_at, updated_at)
VALUES
  ('60000000-0000-4000-8000-000000000001','SUP-TOOLS','Nusantara Teknik Distribusi','Tim Sales','sales.tools@example.invalid','+62215550101','Jakarta, Indonesia',true,NOW(),NOW()),
  ('60000000-0000-4000-8000-000000000002','SUP-MATERIAL','Mitra Material Utama','Tim Proyek','sales.material@example.invalid','+62225550102','Bandung, Indonesia',true,NOW(),NOW()),
  ('60000000-0000-4000-8000-000000000003','SUP-MEP','Sumber MEP Indonesia','Tim Distribusi','sales.mep@example.invalid','+62315550103','Surabaya, Indonesia',true,NOW(),NOW())
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code, name = EXCLUDED.name, contact_name = EXCLUDED.contact_name,
  email = EXCLUDED.email, phone = EXCLUDED.phone, address = EXCLUDED.address,
  is_active = EXCLUDED.is_active, updated_at = NOW();

INSERT INTO promotions
  (id, code, name, kind, amount, min_subtotal, max_discount, starts_at, ends_at,
   is_active, usage_limit, per_user_limit, used_count, created_at, updated_at)
VALUES
  ('70000000-0000-4000-8000-000000000001','SELAMATDATANG','Diskon Pelanggan Baru','PERCENTAGE',5,250000,100000,NOW() - INTERVAL '1 day',NOW() + INTERVAL '180 days',true,500,1,0,NOW(),NOW()),
  ('70000000-0000-4000-8000-000000000002','PROYEKHEMAT','Potongan Belanja Proyek','FIXED',150000,2500000,NULL,NOW() - INTERVAL '1 day',NOW() + INTERVAL '90 days',true,100,1,0,NOW(),NOW())
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code, name = EXCLUDED.name, kind = EXCLUDED.kind,
  amount = EXCLUDED.amount, min_subtotal = EXCLUDED.min_subtotal,
  max_discount = EXCLUDED.max_discount, starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at, is_active = EXCLUDED.is_active,
  usage_limit = EXCLUDED.usage_limit, per_user_limit = EXCLUDED.per_user_limit,
  updated_at = NOW();

DO $$
DECLARE mismatch_count integer;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM inventories i
  JOIN products p ON p.id = i.product_id
  LEFT JOIN (
    SELECT product_id, SUM(quantity)::integer quantity, SUM(reserved)::integer reserved
    FROM warehouse_stocks GROUP BY product_id
  ) ws ON ws.product_id = i.product_id
  WHERE p.id::text LIKE '30000000-0000-4000-8000-%'
    AND (i.quantity <> COALESCE(ws.quantity, 0) OR i.reserved <> COALESCE(ws.reserved, 0));
  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION 'Seed dibatalkan: % saldo inventory tidak cocok dengan gudang.', mismatch_count;
  END IF;
  IF (SELECT COUNT(*) FROM products WHERE id::text LIKE '30000000-0000-4000-8000-%' AND status = 'ACTIVE') <> 16 THEN
    RAISE EXCEPTION 'Seed dibatalkan: jumlah produk aktif tidak sesuai.';
  END IF;
END $$;

COMMIT;

-- Verification result set. Expected: 13 categories, 8 brands, 16 products,
-- 16 inventories, 48 warehouse balances, 3 warehouses, 3 suppliers, 2 promotions.
SELECT 'categories' AS entity, COUNT(*) AS total FROM categories
WHERE id::text LIKE '10000000-0000-4000-8000-%' OR id::text LIKE '11000000-0000-4000-8000-%'
UNION ALL SELECT 'brands', COUNT(*) FROM brands WHERE id::text LIKE '20000000-0000-4000-8000-%'
UNION ALL SELECT 'products', COUNT(*) FROM products WHERE id::text LIKE '30000000-0000-4000-8000-%'
UNION ALL SELECT 'product_images', COUNT(*) FROM product_images WHERE id::text LIKE '50000000-0000-4000-8000-%'
UNION ALL SELECT 'inventories', COUNT(*) FROM inventories WHERE product_id::text LIKE '30000000-0000-4000-8000-%'
UNION ALL SELECT 'warehouse_stocks', COUNT(*) FROM warehouse_stocks WHERE product_id::text LIKE '30000000-0000-4000-8000-%'
UNION ALL SELECT 'warehouses', COUNT(*) FROM warehouses WHERE id IN ('11111111-1111-4111-8111-111111111111','12000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000002')
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers WHERE id::text LIKE '60000000-0000-4000-8000-%'
UNION ALL SELECT 'promotions', COUNT(*) FROM promotions WHERE id::text LIKE '70000000-0000-4000-8000-%'
ORDER BY entity;
