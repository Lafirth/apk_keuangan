-- =====================================================================
--  APK KEUANGAN - HAPUS DATA CONTOH
--  Menghapus seluruh transaksi contoh. Data asli Anda tidak tersentuh.
--  Jalankan SETELAH apk_keuangan.sql
-- =====================================================================

USE `apk_keuangan`;

-- Hapus transaksi contoh (semua ditandai keterangan diawali "[contoh]")
DELETE FROM `transaksi` WHERE `keterangan` LIKE '[contoh]%';

-- Reset saldo awal ke 0
UPDATE `pengaturan` SET `nilai` = '0' WHERE `kunci` = 'saldo_awal' AND `user_id` = 1;

SELECT 'Data contoh berhasil dihapus.' AS `info`,
       (SELECT COUNT(*) FROM `transaksi`) AS `sisa_transaksi`;
