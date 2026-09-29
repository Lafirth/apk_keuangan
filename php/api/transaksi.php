<?php
/** API Transaksi: list | simpan | update | hapus */
require_once __DIR__ . '/bootstrap.php';

$action = (string) get('action', 'list');

try {
    switch ($action) {

        // ---------------------------------------------------------------
        case 'list':
            $rows = transaksiList([
                'periode'     => (string) get('periode', ''),
                'jenis'       => (string) get('jenis', ''),
                'kategori_id' => (string) get('kategori_id', ''),
                'cari'        => (string) get('cari', ''),
            ]);

            $totalMasuk = $totalKeluar = 0;
            foreach ($rows as $r) {
                if ($r['jenis'] === 'masuk')  $totalMasuk  += (float) $r['nominal'];
                else                          $totalKeluar += (float) $r['nominal'];
            }

            jsonResponse([
                'success' => true,
                'data'    => array_map(static function ($r) {
                    $r['nominal'] = (float) $r['nominal'];
                    return $r;
                }, $rows),
                'summary' => [
                    'masuk'      => $totalMasuk,
                    'keluar'     => $totalKeluar,
                    'selisih'    => $totalMasuk - $totalKeluar,
                    'jumlah'     => count($rows),
                ],
            ]);

        // ---------------------------------------------------------------
        case 'simpan':
        case 'update':
            $id = (int) post('id', 0);

            $tanggal    = (string) post('tanggal', '');
            $jenis      = (string) post('jenis', 'keluar');
            $kategoriId = (int) post('kategori_id', 0);
            $nominal    = angka(post('nominal', 0));
            $keterangan = teks((string) post('keterangan', ''));
            $metode     = (string) post('metode', 'tunai');

            // Validasi
            if (!$tanggal || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $tanggal)) {
                jsonError('Tanggal tidak valid.');
            }
            if (!in_array($jenis, ['masuk', 'keluar'], true)) {
                jsonError('Jenis transaksi tidak valid.');
            }
            if ($nominal <= 0) {
                jsonError('Nominal harus lebih dari 0.');
            }
            if ($nominal > 999_999_999_999) {
                jsonError('Nominal terlalu besar.');
            }
            if (!array_key_exists($metode, metodeList())) {
                jsonError('Metode pembayaran tidak valid.');
            }
            if ($kategoriId > 0) {
                $kat = kategoriById($kategoriId);
                if (!$kat) {
                    jsonError('Kategori tidak ditemukan.');
                }
                if ($kat['jenis'] !== $jenis) {
                    jsonError('Kategori "' . $kat['nama'] . '" tidak sesuai dengan jenis transaksi.');
                }
            }

            $data = [
                'tanggal'     => $tanggal,
                'jenis'       => $jenis,
                'kategori_id' => $kategoriId ?: null,
                'nominal'     => $nominal,
                'keterangan'  => $keterangan,
                'metode'      => $metode,
            ];

            if ($action === 'update') {
                if ($id <= 0 || !transaksiById($id)) {
                    jsonError('Transaksi tidak ditemukan.');
                }
                transaksiUpdate($id, $data);
                $pesan = 'Transaksi berhasil diperbarui.';
            } else {
                $id = transaksiSimpan($data);
                $pesan = 'Transaksi berhasil disimpan.';
            }

            jsonResponse([
                'success' => true,
                'message' => $pesan,
                'id'      => $id,
                'data'    => transaksiById($id),
                'ringkasan' => [
                    'saldo'  => saldoSekarang(),
                    'bulan'  => ringkasanBulan(date('Y-m', strtotime($tanggal))),
                ],
            ]);

        // ---------------------------------------------------------------
        case 'hapus':
            $id = (int) post('id', 0);
            if ($id <= 0 || !transaksiById($id)) {
                jsonError('Transaksi tidak ditemukan.');
            }
            transaksiHapus($id);

            jsonResponse([
                'success' => true,
                'message' => 'Transaksi berhasil dihapus.',
                'ringkasan' => ['saldo' => saldoSekarang()],
            ]);

        // ---------------------------------------------------------------
        case 'get':
            $row = transaksiById((int) get('id', 0));
            if (!$row) jsonError('Transaksi tidak ditemukan.', 404);
            $row['nominal'] = (float) $row['nominal'];
            jsonResponse(['success' => true, 'data' => $row]);

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
