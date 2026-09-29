<?php
/** API Kategori: list | simpan | update | hapus */
require_once __DIR__ . '/bootstrap.php';

$action = (string) get('action', 'list');

function warnaValid(string $w): bool
{
    return (bool) preg_match('/^#[0-9a-fA-F]{6}$/', $w);
}

try {
    switch ($action) {

        case 'list':
            jsonResponse([
                'success' => true,
                'data'    => kategoriWithJumlah((string) get('jenis', '')),
            ]);

        // ---------------------------------------------------------------
        case 'simpan':
        case 'update':
            $id    = (int) post('id', 0);
            $nama  = teks((string) post('nama', ''), 50);
            $ikon  = (string) post('ikon', '🏷️');
            $warna = (string) post('warna', '#6366f1');
            $jenis = (string) post('jenis', 'keluar');
            $aktif = (int) post('is_active', 1) === 1 ? 1 : 0;

            if ($nama === '') {
                jsonError('Nama kategori wajib diisi.');
            }
            if (mb_strlen($nama) < 2) {
                jsonError('Nama kategori minimal 2 karakter.');
            }
            if (!in_array($jenis, ['masuk', 'keluar'], true)) {
                jsonError('Jenis kategori tidak valid.');
            }
            if (!warnaValid($warna)) {
                $warna = '#6366f1';
            }
            $ikon = mb_substr(trim($ikon) ?: '🏷️', 0, 8);

            // Cegah nama duplikat pada jenis yang sama
            $cek = db()->prepare(
                'SELECT id FROM kategori WHERE user_id = ? AND nama = ? AND jenis = ? AND id <> ?'
            );
            $cek->execute([userId(), $nama, $jenis, $id]);
            if ($cek->fetch()) {
                jsonError('Kategori "' . $nama . '" sudah ada di daftar ' . $jenis . '.');
            }

            $data = [
                'nama'      => $nama,
                'ikon'      => $ikon,
                'warna'     => $warna,
                'jenis'     => $jenis,
                'is_active' => $aktif,
            ];

            if ($action === 'update') {
                if ($id <= 0 || !kategoriById($id)) {
                    jsonError('Kategori tidak ditemukan.');
                }
                kategoriUpdate($id, $data);
                $pesan = 'Kategori berhasil diperbarui.';
            } else {
                $id = kategoriSimpan($data);
                $pesan = 'Kategori berhasil ditambahkan.';
            }

            jsonResponse(['success' => true, 'message' => $pesan, 'id' => $id]);

        // ---------------------------------------------------------------
        case 'hapus':
            $id = (int) post('id', 0);
            if ($id <= 0 || !kategoriById($id)) {
                jsonError('Kategori tidak ditemukan.');
            }

            // Pindahkan transaksi ke kategori tanpa kategori (SET NULL)
            $stmt = db()->prepare(
                'SELECT COUNT(*) FROM transaksi WHERE kategori_id = ? AND user_id = ?'
            );
            $stmt->execute([$id, userId()]);
            $jml = (int) $stmt->fetchColumn();

            kategoriHapus($id);

            jsonResponse([
                'success' => true,
                'message' => 'Kategori dihapus.' . ($jml > 0 ? " $jml transaksi terkait kini tanpa kategori." : ''),
            ]);

        default:
            jsonError('Aksi tidak dikenal.', 400);
    }

} catch (PDOException $e) {
    // Detail PDO hanya untuk mode debug; di produksi cukup pesan generik
    // supaya nama tabel/kolom tidak bocor lewat response.
    error_log('Kesalahan database: ' . $e->getMessage());
    jsonError(
        APP_DEBUG ? 'Kesalahan database: ' . $e->getMessage() : 'Kesalahan database.',
        500
    );
}
