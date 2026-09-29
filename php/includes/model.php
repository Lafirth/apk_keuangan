<?php
/**
 * Model - semua query database
 */

require_once __DIR__ . '/auth.php';

// =====================================================================
//  KATEGORI
// =====================================================================

function kategoriAll(?string $jenis = null, bool $aktifSaja = true): array
{
    $sql    = 'SELECT * FROM kategori WHERE user_id = ?';
    $params = [userId()];

    if ($jenis)   { $sql .= ' AND jenis = ?';   $params[] = $jenis; }
    if ($aktifSaja) { $sql .= ' AND is_active = 1'; }

    $sql .= ' ORDER BY jenis DESC, nama ASC';

    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
}

function kategoriById(int $id): ?array
{
    $st = db()->prepare('SELECT * FROM kategori WHERE id = ? AND user_id = ?');
    $st->execute([$id, userId()]);
    return $st->fetch() ?: null;
}

/** Hitung jumlah transaksi per kategori */
function kategoriWithJumlah(?string $jenis = null): array
{
    $sql = 'SELECT k.*, (
                SELECT COUNT(*) FROM transaksi t
                WHERE t.kategori_id = k.id AND t.user_id = k.user_id
            ) AS jml_transaksi
            FROM kategori k
            WHERE k.user_id = ? AND k.is_active = 1';

    $params = [userId()];
    if ($jenis) { $sql .= ' AND k.jenis = ?'; $params[] = $jenis; }
    $sql .= ' ORDER BY k.jenis DESC, k.nama ASC';

    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
}

function kategoriSimpan(array $data): int
{
    $st = db()->prepare(
        'INSERT INTO kategori (user_id, nama, ikon, warna, jenis, is_active)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $st->execute([
        userId(),
        $data['nama'],
        $data['ikon'] ?: '🏷️',
        $data['warna'],
        $data['jenis'],
        $data['is_active'] ?? 1,
    ]);
    return (int) db()->lastInsertId();
}

function kategoriUpdate(int $id, array $data): bool
{
    $st = db()->prepare(
        'UPDATE kategori SET nama = ?, ikon = ?, warna = ?, jenis = ?, is_active = ?
         WHERE id = ? AND user_id = ?'
    );
    return $st->execute([
        $data['nama'], $data['ikon'], $data['warna'],
        $data['jenis'], $data['is_active'], $id, userId(),
    ]);
}

function kategoriHapus(int $id): bool
{
    $st = db()->prepare('DELETE FROM kategori WHERE id = ? AND user_id = ?');
    return $st->execute([$id, userId()]);
}

// =====================================================================
//  TRANSAKSI
// =====================================================================

/**
 * Daftar transaksi dengan filter
 * @param string $periode  "2026-09" (kosong = semua)
 * @param array  $filter   jenis, kategori_id, cari
 */
function transaksiList(array $filter = []): array
{
    $sql = 'SELECT t.*, k.nama AS kategori_nama, k.ikon AS kategori_ikon, k.warna AS kategori_warna
            FROM transaksi t
            LEFT JOIN kategori k ON k.id = t.kategori_id
            WHERE t.user_id = ?';
    $params = [userId()];

    if (!empty($filter['periode'])) {
        $sql .= ' AND DATE_FORMAT(t.tanggal, "%Y-%m") = ?';
        $params[] = $filter['periode'];
    }
    if (!empty($filter['jenis'])) {
        $sql .= ' AND t.jenis = ?';
        $params[] = $filter['jenis'];
    }
    if (!empty($filter['kategori_id'])) {
        $sql .= ' AND t.kategori_id = ?';
        $params[] = (int) $filter['kategori_id'];
    }
    if (!empty($filter['cari'])) {
        $sql .= ' AND (t.keterangan LIKE ? OR k.nama LIKE ?)';
        $params[] = '%' . $filter['cari'] . '%';
        $params[] = '%' . $filter['cari'] . '%';
    }

    $sql .= ' ORDER BY t.tanggal DESC, t.id DESC';

    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
}

function transaksiById(int $id): ?array
{
    $st = db()->prepare(
        'SELECT t.*, k.nama AS kategori_nama, k.ikon AS kategori_ikon, k.warna AS kategori_warna
         FROM transaksi t
         LEFT JOIN kategori k ON k.id = t.kategori_id
         WHERE t.id = ? AND t.user_id = ?'
    );
    $st->execute([$id, userId()]);
    return $st->fetch() ?: null;
}

function transaksiSimpan(array $d): int
{
    $st = db()->prepare(
        'INSERT INTO transaksi (user_id, tanggal, jenis, kategori_id, nominal, keterangan, metode)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $st->execute([
        userId(),
        $d['tanggal'],
        $d['jenis'],
        $d['kategori_id'] ?: null,
        $d['nominal'],
        $d['keterangan'],
        $d['metode'],
    ]);
    return (int) db()->lastInsertId();
}

function transaksiUpdate(int $id, array $d): bool
{
    $st = db()->prepare(
        'UPDATE transaksi
         SET tanggal = ?, jenis = ?, kategori_id = ?, nominal = ?, keterangan = ?, metode = ?
         WHERE id = ? AND user_id = ?'
    );
    return $st->execute([
        $d['tanggal'], $d['jenis'], $d['kategori_id'] ?: null,
        $d['nominal'], $d['keterangan'], $d['metode'], $id, userId(),
    ]);
}

function transaksiHapus(int $id): bool
{
    $st = db()->prepare('DELETE FROM transaksi WHERE id = ? AND user_id = ?');
    return $st->execute([$id, userId()]);
}

// =====================================================================
//  RINGKASAN & DASHBOARD
// =====================================================================

/** Total satu jenis dalam satu periode */
function totalJenis(string $periode, string $jenis, array $extra = []): float
{
    $sql    = 'SELECT COALESCE(SUM(nominal), 0) FROM transaksi
               WHERE user_id = ? AND jenis = ? AND DATE_FORMAT(tanggal, "%Y-%m") = ?';
    $params = [userId(), $jenis, $periode];

    if (!empty($extra['kategori_id'])) {
        $sql .= ' AND kategori_id = ?';
        $params[] = (int) $extra['kategori_id'];
    }

    $st = db()->prepare($sql);
    $st->execute($params);
    return (float) $st->fetchColumn();
}

/** Saldo: saldo_awal + semua pemasukan - semua pengeluaran */
function saldoSekarang(): float
{
    $st = db()->prepare(
        "SELECT
            COALESCE(CAST((SELECT nilai FROM pengaturan
                           WHERE user_id = ? AND kunci = 'saldo_awal') AS DECIMAL(15,2)), 0)
          + COALESCE((SELECT SUM(nominal) FROM transaksi
                      WHERE user_id = ? AND jenis = 'masuk'), 0)
          - COALESCE((SELECT SUM(nominal) FROM transaksi
                      WHERE user_id = ? AND jenis = 'keluar'), 0)"
    );
    $st->execute([userId(), userId(), userId()]);
    return (float) $st->fetchColumn();
}

function saldoAwal(): float
{
    $st = db()->prepare("SELECT CAST(COALESCE(nilai,'0') AS DECIMAL(15,2)) FROM pengaturan
                         WHERE user_id = ? AND kunci = 'saldo_awal'");
    $st->execute([userId()]);
    return (float) ($st->fetchColumn() ?: 0);
}

function saldoAwalSet(float $nilai): void
{
    $st = db()->prepare(
        "INSERT INTO pengaturan (user_id, kunci, nilai) VALUES (?, 'saldo_awal', ?)
         ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)"
    );
    $st->execute([userId(), (string) $nilai]);
}

/** Ringkasan satu bulan */
function ringkasanBulan(string $periode): array
{
    $pemasukan  = totalJenis($periode, 'masuk');
    $pengeluaran = totalJenis($periode, 'keluar');

    $st = db()->prepare('SELECT COUNT(*) FROM transaksi
                         WHERE user_id = ? AND DATE_FORMAT(tanggal, "%Y-%m") = ?');
    $st->execute([userId(), $periode]);
    $jumlah = (int) $st->fetchColumn();

    $st = db()->prepare('SELECT COUNT(DISTINCT tanggal) FROM transaksi
                         WHERE user_id = ? AND DATE_FORMAT(tanggal, "%Y-%m") = ?');
    $st->execute([userId(), $periode]);
    $hariAktif = (int) $st->fetchColumn();

    return [
        'periode'     => $periode,
        'pemasukan'   => $pemasukan,
        'pengeluaran' => $pengeluaran,
        'sisa'        => $pemasukan - $pengeluaran,
        'jumlah'      => $jumlah,
        'hari_aktif'  => $hariAktif,
        'persen'      => $pemasukan > 0 ? round(($pengeluaran / $pemasukan) * 100, 1) : 0,
    ];
}

/** Pengeluaran harian dalam satu bulan (untuk grafik batang) */
function harianKeluar(string $periode): array
{
    $st = db()->prepare(
        'SELECT tanggal, COALESCE(SUM(nominal),0) AS total
         FROM transaksi
         WHERE user_id = ? AND jenis = \'keluar\' AND DATE_FORMAT(tanggal, "%Y-%m") = ?
         GROUP BY tanggal ORDER BY tanggal ASC'
    );
    $st->execute([userId(), $periode]);
    return $st->fetchAll();
}

/** Pemasukan harian dalam satu bulan */
function harianMasuk(string $periode): array
{
    $st = db()->prepare(
        'SELECT tanggal, COALESCE(SUM(nominal),0) AS total
         FROM transaksi
         WHERE user_id = ? AND jenis = \'masuk\' AND DATE_FORMAT(tanggal, "%Y-%m") = ?
         GROUP BY tanggal ORDER BY tanggal ASC'
    );
    $st->execute([userId(), $periode]);
    return $st->fetchAll();
}

/** Rekap per kategori dalam satu bulan */
function rekapKategori(string $periode, string $jenis = 'keluar'): array
{
    $st = db()->prepare(
        'SELECT k.id, k.nama, k.ikon, k.warna,
                COUNT(t.id) AS jml,
                COALESCE(SUM(t.nominal), 0) AS total
         FROM kategori k
         LEFT JOIN transaksi t
                ON t.kategori_id = k.id
               AND DATE_FORMAT(t.tanggal, "%Y-%m") = ?
               AND t.user_id = k.user_id
         WHERE k.user_id = ? AND k.jenis = ? AND k.is_active = 1
         GROUP BY k.id, k.nama, k.ikon, k.warna
         ORDER BY total DESC, k.nama ASC'
    );
    $st->execute([$periode, userId(), $jenis]);
    return $st->fetchAll();
}

/** Rata-rata belanja harian */
function rataHarian(string $periode): float
{
    $r = ringkasanBulan($periode);
    return $r['hari_aktif'] > 0 ? $r['pengeluaran'] / $r['hari_aktif'] : 0;
}

/** Total pengeluaran bulan ini vs bulan lalu (persen) */
function perbandinganBulan(string $periode): array
{
    $bulanIni  = totalJenis($periode, 'keluar');
    $ts        = strtotime($periode . '-01');
    $bulanLalu = date('Y-m', strtotime('-1 month', $ts));
    $sebelumnya = totalJenis($bulanLalu, 'keluar');

    $selisih = $bulanIni - $sebelumnya;
    $persen  = $sebelumnya > 0 ? round(($selisih / $sebelumnya) * 100, 1) : 0;

    return [
        'bulan_ini'    => $bulanIni,
        'bulan_lalu'   => $sebelumnya,
        'bulan_lalu_nama' => periodeIndo($bulanLalu),
        'selisih'      => $selisih,
        'persen'       => $persen,
    ];
}

/** 6 bulan terakhir untuk grafik tren */
function trenBulan(int $jumlah = 6): array
{
    $st = db()->prepare(
        'SELECT DATE_FORMAT(tanggal, "%Y-%m") AS periode,
                COALESCE(SUM(CASE WHEN jenis = "masuk"  THEN nominal END), 0) AS pemasukan,
                COALESCE(SUM(CASE WHEN jenis = "keluar" THEN nominal END), 0) AS pengeluaran
         FROM transaksi
         WHERE user_id = ?
         GROUP BY periode
         ORDER BY periode DESC
         LIMIT ' . (int) $jumlah
    );
    $st->execute([userId()]);
    $rows = array_reverse($st->fetchAll());

    // lengkapi periode kosong
    $hasil = [];
    $ada  = array_column($rows, 'periode');
    for ($i = $jumlah - 1; $i >= 0; $i--) {
        $p = date('Y-m', strtotime("-$i month"));
        if (in_array($p, $ada, true)) {
            foreach ($rows as $r) {
                if ($r['periode'] === $p) { $hasil[] = $r; }
            }
        } else {
            $hasil[] = ['periode' => $p, 'pemasukan' => 0, 'pengeluaran' => 0];
        }
    }
    return $hasil;
}

/** Daftar bulan yang punya transaksi (untuk dropdown) */
function daftarBulanAda(): array
{
    $st = db()->prepare(
        'SELECT DISTINCT DATE_FORMAT(tanggal, "%Y-%m") AS periode
         FROM transaksi WHERE user_id = ? ORDER BY periode DESC'
    );
    $st->execute([userId()]);
    return $st->fetchAll(PDO::FETCH_COLUMN);
}
