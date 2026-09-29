-- =====================================================================
--  APK KEUANGAN - DATA CONTOH (opsional)
--  Hanya untuk mencoba tampilan. Hapus dengan perintah di bagian bawah.
--  Jalankan SETELAH apk_keuangan.sql
-- =====================================================================

USE `apk_keuangan`;

-- Hapus data contoh sebelumnya (agar aman di-run berulang)
DELETE FROM transaksi WHERE keterangan LIKE '[contoh]%';
UPDATE pengaturan SET nilai = '0' WHERE kunci = 'saldo_awal' AND user_id = 1;

-- Saldo awal sebelum mulai pakai aplikasi
INSERT INTO `pengaturan` (`user_id`, `kunci`, `nilai`)
VALUES (1, 'saldo_awal', '1500000')
ON DUPLICATE KEY UPDATE nilai = '1500000';

-- ================= PEMASUKAN =================
INSERT INTO `transaksi` (`user_id`, `tanggal`, `jenis`, `kategori_id`, `nominal`, `keterangan`, `metode`) VALUES
(1, '2026-09-01', 'masuk', 1, 5500000, '[contoh] Gaji September',        'transfer'),
(1, '2026-09-15', 'masuk', 2,  750000, '[contoh] Bonus performance',  'transfer'),
(1, '2026-09-22', 'masuk', 3,  450000, '[contoh] Hasil usaha sampingan',  'qris');

-- ================= PENGELUARAN =================
-- Tanggal 1-7
INSERT INTO `transaksi` (`user_id`, `tanggal`, `jenis`, `kategori_id`, `nominal`, `keterangan`, `metode`) VALUES
(1, '2026-09-01', 'keluar', 5,  35000, '[contoh] Sarapan & kopi',          'qris'),
(1, '2026-09-01', 'keluar', 6,  20000, '[contoh] Ojek ke kantor',         'qris'),
(1, '2026-09-02', 'keluar', 5,  42000, '[contoh] Makan siang warteg',     'qris'),
(1, '2026-09-02', 'keluar', 6,  15000, '[contoh] Angkut bus',            'qris'),
(1, '2026-09-02', 'keluar', 7, 285000, '[contoh] Tagihan listrik PLN',    'transfer'),
(1, '2026-09-03', 'keluar', 5,  38000, '[contoh] Nasi goreng + es',       'qris'),
(1, '2026-09-03', 'keluar', 6,  25000, '[contoh] Bensin motor',          'qris'),
(1, '2026-09-03', 'keluar', 12, 100000, '[contoh] Nonton bioskop',         'debit'),
(1, '2026-09-04', 'keluar', 5,  45000, '[contoh] Bakso + jus',            'qris'),
(1, '2026-09-04', 'keluar', 6,  15000, '[contoh] Ojek pulang',            'qris'),
(1, '2026-09-04', 'keluar', 8, 180000, '[contoh] Belanja mingguan',       'debit'),
(1, '2026-09-05', 'keluar', 5,  32000, '[contoh] Sarapan',                'qris'),
(1, '2026-09-05', 'keluar', 6,  18000, '[contoh] Parkir + tol',          'qris'),
(1, '2026-09-05', 'keluar', 5,  28000, '[contoh] Snack sore',             'qris'),
(1, '2026-09-06', 'keluar', 5,  52000, '[contoh] Makan keluarga',        'qris'),
(1, '2026-09-06', 'keluar', 9,  85000, '[contoh] Karaoke',               'debit'),
(1, '2026-09-07', 'keluar', 5,  40000, '[contoh] Sarapan + lunch',        'qris'),
(1, '2026-09-07', 'keluar', 6,  20000, '[contoh] Ojek',                   'qris'),
(1, '2026-09-07', 'keluar', 7, 350000, '[contoh] Tagihan internet + HP',  'transfer');

-- Tanggal 8-14
INSERT INTO `transaksi` (`user_id`, `tanggal`, `jenis`, `kategori_id`, `nominal`, `keterangan`, `metode`) VALUES
(1, '2026-09-08', 'keluar', 5,  35000, '[contoh] Kopi susu + roti',        'qris'),
(1, '2026-09-08', 'keluar', 6,  15000, '[contoh] Angkut bus',             'qris'),
(1, '2026-09-09', 'keluar', 5,  47000, '[contoh] Rice bowl + saus',       'qris'),
(1, '2026-09-09', 'keluar', 6,  22000, '[contoh] Bensin + parkir',        'qris'),
(1, '2026-09-09', 'keluar', 11, 250000, '[contoh] Kursus online',          'debit'),
(1, '2026-09-10', 'keluar', 5,  38000, '[contoh] Makan siang',            'qris'),
(1, '2026-09-10', 'keluar', 6,  18000, '[contoh] Ojek',                   'qris'),
(1, '2026-09-10', 'keluar', 8, 320000, '[contoh] Belanja bulanan',        'debit'),
(1, '2026-09-11', 'keluar', 5,  33000, '[contoh] Nasi campur',            'qris'),
(1, '2026-09-11', 'keluar', 6,  16000, '[contoh] Angkut',                 'qris'),
(1, '2026-09-12', 'keluar', 5,  60000, '[contoh] Makan siang + jus',      'qris'),
(1, '2026-09-12', 'keluar', 12, 75000, '[contoh] Hadiah ultah teman',      'qris'),
(1, '2026-09-13', 'keluar', 5,  29000, '[contoh] Sarapan',                'qris'),
(1, '2026-09-13', 'keluar', 6,  19000, '[contoh] Ojek + bensin',          'qris'),
(1, '2026-09-13', 'keluar', 10, 175000, '[contoh] Obat & vitamin',        'qris'),
(1, '2026-09-14', 'keluar', 5,  55000, '[contoh] Makan padagi bareng',      'debit');

-- Tanggal 15-21
INSERT INTO `transaksi` (`user_id`, `tanggal`, `jenis`, `kategori_id`, `nominal`, `keterangan`, `metode`) VALUES
(1, '2026-09-15', 'keluar', 5,  44000, '[contoh] Sarapan & makan siang',   'qris'),
(1, '2026-09-15', 'keluar', 6,  20000, '[contoh] Ojek',                   'qris'),
(1, '2026-09-15', 'keluar', 8, 145000, '[contoh] Baju & sepatu',          'debit'),
(1, '2026-09-16', 'keluar', 5,  36000, '[contoh] Bakso + es teh',         'qris'),
(1, '2026-09-16', 'keluar', 6,  15000, '[contoh] Bus',                    'qris'),
(1, '2026-09-17', 'keluar', 5,  48000, '[contoh] Stir fry + es',         'qris'),
(1, '2026-09-17', 'keluar', 6,  24000, '[contoh] Bensin motor',          'qris'),
(1, '2026-09-18', 'keluar', 5,  41000, '[contoh] Sarapan + kopi',         'qris'),
(1, '2026-09-18', 'keluar', 9, 120000, '[contoh] Gym membership',         'debit'),
(1, '2026-09-19', 'keluar', 5,  50000, '[contoh] Makan keluarga akhir pe', 'qris'),
(1, '2026-09-19', 'keluar', 6,  21000, '[contoh] Ojek + tol',             'qris'),
(1, '2026-09-20', 'keluar', 5,  37000, '[contoh] Nasi + employment',      'qris'),
(1, '2026-09-20', 'keluar', 6,  17000, '[contoh] Angkut',                 'qris'),
(1, '2026-09-20', 'keluar', 7, 240000, '[contoh] Tagihan air PDAM',       'transfer'),
(1, '2026-09-21', 'keluar', 5,  30000, '[contoh] Sarapan',                'qris'),
(1, '2026-09-21', 'keluar', 6,  19000, '[contoh] Bensin + parkir',        'qris');

-- Tanggal 22-28
INSERT INTO `transaksi` (`user_id`, `tanggal`, `jenis`, `kategori_id`, `nominal`, `keterangan`, `metode`) VALUES
(1, '2026-09-22', 'keluar', 5,  46000, '[contoh] Lunch + kopi',           'qris'),
(1, '2026-09-22', 'keluar', 6,  16000, '[contoh] Ojek',                   'qris'),
(1, '2026-09-22', 'keluar', 8, 275000, '[contoh] Belanja household',      'debit'),
(1, '2026-09-23', 'keluar', 5,  39000, '[contoh] Sate + lontong',         'qris'),
(1, '2026-09-23', 'keluar', 6,  22000, '[contoh] Bensin',                 'qris'),
(1, '2026-09-24', 'keluar', 5,  34000, '[contoh] Sarapan',                'qris'),
(1, '2026-09-24', 'keluar', 11,  95000, '[contoh] Beli buku & alat tulis', 'debit'),
(1, '2026-09-25', 'keluar', 5,  58000, '[contoh] Makan siang + kerupuk',         'qris'),
(1, '2026-09-25', 'keluar', 6,  18000, '[contoh] Angkut bus',             'qris'),
(1, '2026-09-25', 'keluar', 12, 90000, '[contoh] Undangan arisan',         'qris'),
(1, '2026-09-26', 'keluar', 5,  42000, '[contoh] Nasi campur + es',       'qris'),
(1, '2026-09-26', 'keluar', 6,  20000, '[contoh] Ojek + bensin',          'qris'),
(1, '2026-09-27', 'keluar', 5,  35000, '[contoh] Kopi + roti',            'qris'),
(1, '2026-09-27', 'keluar', 9,  65000, '[contoh] Game top up',            'debit'),
(1, '2026-09-27', 'keluar', 6,  16000, '[contoh] Parkir',                 'qris'),
(1, '2026-09-28', 'keluar', 5,  47000, '[contoh] Makan siang hari ini',   'qris'),
(1, '2026-09-28', 'keluar', 6,  19000, '[contoh] Ojek pulang',            'qris'),
(1, '2026-09-28', 'keluar', 10,  85000, '[contoh] Pemeriksaan dokter',     'qris');

-- =====================================================================
--  MENGHAPUS DATA CONTOH
--  Lewat phpMyAdmin: buka database apk_keuangan -> SQL -> jalankan:
--
--    DELETE FROM transaksi WHERE keterangan LIKE '[contoh]%';
--    UPDATE pengaturan SET nilai = '0' WHERE kunci = 'saldo_awal' AND user_id = 1;
--
--  Lewat Command Prompt:
--
--    mysql -u root --default-character-set=utf8mb4 -e "source C:/xampp/htdocs/apk_keuangan/php/database/hapus_contoh.sql"
-- =====================================================================
