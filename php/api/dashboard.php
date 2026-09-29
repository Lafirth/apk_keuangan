<?php
/** API Dashboard: statistik, grafik, saldo awal */
require_once __DIR__ . '/bootstrap.php';

$action = (string) get('action', 'statistik');

try {
    switch ($action) {

        // ---------------------------------------------------------------
        case 'statistik':
            $periode = (string) get('periode', periodeSekarang());
            if (!preg_match('/^\d{4}-\d{2}$/', $periode)) {
                $periode = periodeSekarang();
            }

            $hariMinggu  = 0;
            $st = db()->prepare(
                "SELECT COALESCE(SUM(nominal),0) FROM transaksi
                 WHERE user_id = ? AND jenis = 'keluar' AND tanggal = CURDATE()"
            );
            $st->execute([userId()]);
            $hariMinggu = (float) $st->fetchColumn();

            $st = db()->prepare(
                "SELECT COALESCE(SUM(nominal),0) FROM transaksi
                 WHERE user_id = ? AND jenis = 'masuk' AND tanggal = CURDATE()"
            );
            $st->execute([userId()]);
            $hariIniMasuk = (float) $st->fetchColumn();

            $kategori = rekapKategori($periode, 'keluar');
            $donat = array_values(array_filter($kategori, static fn($k) => (float) $k['total'] > 0));

            jsonResponse([
                'success' => true,
                'data'    => [
                    'ringkasan'     => ringkasanBulan($periode),
                    'perbandingan'  => perbandinganBulan($periode),
                    'saldo'         => saldoSekarang(),
                    'saldo_awal'    => saldoAwal(),
                    'rata_harian'   => rataHarian($periode),
                    'hari_ini'      => [
                        'keluar' => $hariMinggu,
                        'masuk'  => $hariIniMasuk,
                    ],
                    'harian_keluar' => harianKeluar($periode),
                    'harian_masuk'  => harianMasuk($periode),
                    'kategori'      => $donat,
                    'tren'          => trenBulan(6),
                    'terakhir'      => array_slice(transaksiList(), 0, 7),
                ],
            ]);

        // ---------------------------------------------------------------
        // Padanan api-dashboard.mjs: seluruh agregat rekap dalam satu
        // panggilan, supaya kontrak kedua versi sama.
        case 'rekap':
            $periode = (string) get('periode', periodeSekarang());
            if (!preg_match('/^\d{4}-\d{2}$/', $periode)) {
                $periode = periodeSekarang();
            }

            $user = currentUser();

            jsonResponse([
                'success' => true,
                'data'    => [
                    'periode'       => $periode,
                    'ringkasan'     => ringkasanBulan($periode),
                    'perbandingan'  => perbandinganBulan($periode),
                    'rekap_keluar'  => rekapKategori($periode, 'keluar'),
                    'rekap_masuk'   => rekapKategori($periode, 'masuk'),
                    'harian_keluar' => harianKeluar($periode),
                    'transaksi'     => transaksiList(['periode' => $periode]),
                    'saldo'         => saldoSekarang(),
                    'saldo_awal'    => saldoAwal(),
                    'rata_harian'   => rataHarian($periode),
                    'user'          => [
                        'nama'     => $user['nama'] ?? '',
                        'username' => $user['username'] ?? '',
                    ],
                ],
            ]);

        // ---------------------------------------------------------------
        case 'saldo_awal':
            if (isPost()) {
                $nilai = angka(post('saldo_awal', 0));
                if ($nilai < 0) {
                    jsonError('Saldo awal tidak boleh negatif.');
                }
                saldoAwalSet($nilai);
                jsonResponse([
                    'success' => true,
                    'message' => 'Saldo awal berhasil disimpan.',
                    'data'    => ['saldo_awal' => saldoAwal(), 'saldo' => saldoSekarang()],
                ]);
            }
            jsonResponse(['success' => true, 'data' => ['saldo_awal' => saldoAwal()]]);

        default:
            jsonError('Aksi tidak dikenal.', 400);
    }

} catch (PDOException $e) {
    error_log('Kesalahan database: ' . $e->getMessage());
    jsonError(
        APP_DEBUG ? 'Kesalahan database: ' . $e->getMessage() : 'Kesalahan database.',
        500
    );
}
