-- =====================================================================
--  APK KEUANGAN - Skema Database
--  Target : MySQL / MariaDB (XAMPP)
--  Login  : christa / wira26
--
--  CARA IMPORT (pilih salah satu):
--   1. phpMyAdmin -> htdocs/apk_keuangan/php/database/ -> Import
--   2. Command Prompt:
--        cd C:\xampp\mysql\bin
--        mysql -u root --default-character-set=utf8mb4 -e "source C:/xampp/htdocs/apk_keuangan/php/database/apk_keuangan.sql"
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `apk_keuangan`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `apk_keuangan`;

-- ---------------------------------------------------------------------
-- Tabel pengguna
--   Password di-seed sebagai hash bcrypt (dibuat dengan password_hash()).
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `pengaturan`;
DROP TABLE IF EXISTS `transaksi`;
DROP TABLE IF EXISTS `kategori`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(50)  NOT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `nama`       VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Kategori pemasukan & pengeluaran
--   jenis : 'masuk' (pemasukan) | 'keluar' (pengeluaran)
--   ikon  : emoji UTF-8
--   warna : hex warna untuk bar/kartu/kategori
-- ---------------------------------------------------------------------
CREATE TABLE `kategori` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `nama`       VARCHAR(50)  NOT NULL,
  `ikon`       VARCHAR(20)  NOT NULL DEFAULT '🏷️',
  `warna`      CHAR(7)      NOT NULL DEFAULT '#6366f1',
  `jenis`      ENUM('masuk','keluar') NOT NULL DEFAULT 'keluar',
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kategori_user` (`user_id`, `jenis`),
  CONSTRAINT `fk_kategori_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Transaksi harian
--   jenis  : 'masuk' (gaji/pemasukan) | 'keluar' (pengeluaran)
--   metode : tunai | transfer | qris | debit
-- ---------------------------------------------------------------------
CREATE TABLE `transaksi` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED  NOT NULL,
  `tanggal`     DATE          NOT NULL,
  `jenis`       ENUM('masuk','keluar') NOT NULL,
  `kategori_id` INT UNSIGNED  NULL,
  `nominal`     DECIMAL(15,2) NOT NULL,
  `keterangan`  VARCHAR(255)  NULL,
  `metode`      ENUM('tunai','transfer','qris','debit') NOT NULL DEFAULT 'tunai',
  `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transaksi_user_tgl` (`user_id`, `tanggal`),
  KEY `idx_transaksi_user_bln` (`user_id`, `jenis`, `tanggal`),
  KEY `idx_transaksi_kategori` (`kategori_id`),
  CONSTRAINT `fk_transaksi_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_transaksi_kategori`
    FOREIGN KEY (`kategori_id`) REFERENCES `kategori` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Pengaturan per pengguna (key-value)
-- ---------------------------------------------------------------------
CREATE TABLE `pengaturan` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `kunci`      VARCHAR(50)  NOT NULL,
  `nilai`      VARCHAR(255) NULL,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_kunci` (`user_id`, `kunci`),
  CONSTRAINT `fk_pengaturan_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  DATA AWAL
-- =====================================================================

-- Password untuk "wira26"
INSERT INTO `users` (`username`, `password`, `nama`) VALUES
('christa', '$2y$10$q2cawRC3AoLjQJUECH76IeiqR87B4c9GcVsMYVHGv1JGrdpVteIK6', 'Christa');

INSERT INTO `pengaturan` (`user_id`, `kunci`, `nilai`) VALUES
(1, 'saldo_awal', '0');

-- ---------- Kategori PEMASUKAN ----------
INSERT INTO `kategori` (`user_id`, `nama`, `ikon`, `warna`, `jenis`) VALUES
(1, 'Gaji',       '💰', '#10b981', 'masuk'),
(1, 'Bonus',      '🎉', '#34d399', 'masuk'),
(1, 'Usaha',      '💼', '#22d3ee', 'masuk'),
(1, 'Lainnya',    '✨', '#2dd4bf', 'masuk');

-- ---------- Kategori PENGELUARAN ----------
INSERT INTO `kategori` (`user_id`, `nama`, `ikon`, `warna`, `jenis`) VALUES
(1, 'Makan',      '🍚', '#f97316', 'keluar'),
(1, 'Transport',  '🚌', '#38bdf8', 'keluar'),
(1, 'Tagihan',    '🧾', '#f43f5e', 'keluar'),
(1, 'Belanja',    '🛍️', '#a855f7', 'keluar'),
(1, 'Hiburan',    '🎬', '#ec4899', 'keluar'),
(1, 'Kesehatan',  '⚕️', '#14b8a6', 'keluar'),
(1, 'Pendidikan', '📚', '#6366f1', 'keluar'),
(1, 'Sosial',     '🎉', '#f59e0b', 'keluar'),
(1, 'Lainnya',    '🏷️', '#94a3b8', 'keluar');
