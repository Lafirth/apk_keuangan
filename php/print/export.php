<?php
/** Export rekap & transaksi bulanan ke CSV (BOM UTF-8 agar rapi di Excel) */
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/model.php';

requireLogin();

$periode = (string) get('periode', periodeSekarang());
if (!preg_match('/^\d{4}-\d{2}$/', $periode)) {
    $periode = periodeSekarang();
}

$user        = currentUser();
$ringkasan   = ringkasanBulan($periode);
$rekapKeluar = rekapKategori($periode, 'keluar');
$rekapMasuk  = rekapKategori($periode, 'masuk');
$transaksi   = transaksiList(['periode' => $periode]);
$totalKeluar = $ringkasan['pengeluaran'] ?: 1;
$totalMasuk  = $ringkasan['pemasukan'] ?: 1;

$namaFile = 'rekap-keuangan-' . $periode . '.csv';

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $namaFile . '"');
header('Pragma: no-cache');
header('Expires: 0');

$out = fopen('php://output', 'w');
fwrite($out, "\xEF\xBB\xBF"); // BOM

/** Tulis satu baris CSV */
function baris($fh, array $cols): void
{
    fputcsv($fh, $cols, ';', '"', '\\');
}

function rupiahCsv($n): string
{
    return number_format((float) $n, 0, ',', '.');
}

$baris = 0;
$judul = ['LAPORAN KEUANGAN BULANAN - ' . strtoupper(periodeIndo($periode))];
baris($out, $judul); $baris++;

baris($out, ['Nama', $user['nama']]);
baris($out, ['Username', $user['username']]);
baris($out, ['Periode', periodeIndo($periode)]);
baris($out, ['Dicetak pada', date('d/m/Y H:i')]);
baris($out, []);

baris($out, ['=== RINGKASAN ===']);
baris($out, ['Keterangan', 'Nilai (Rp)']);
baris($out, ['Total Pemasukan', rupiahCsv($ringkasan['pemasukan'])]);
baris($out, ['Total Pengeluaran', rupiahCsv($ringkasan['pengeluaran'])]);
baris($out, ['Sisa Bulan Ini', rupiahCsv($ringkasan['sisa'])]);
baris($out, ['Rata-rata Pengeluaran / Hari', rupiahCsv(rataHarian($periode))]);
baris($out, ['Jumlah Transaksi', $ringkasan['jumlah']]);
baris($out, ['Hari Aktif', $ringkasan['hari_aktif']]);
baris($out, ['Rasio Pengeluaran (%)', $ringkasan['persen']]);
baris($out, ['Saldo Tersedia (saat ini)', rupiahCsv(saldoSekarang())]);
baris($out, []);

baris($out, ['=== REKAP PENGELUARAN PER KATEGORI ===']);
baris($out, ['No', 'Kategori', 'Jumlah Transaksi', 'Persentase (%)', 'Total (Rp)']);
$no = 0;
foreach ($rekapKeluar as $k) {
    $t = (float) $k['total'];
    if ($t <= 0) continue;
    $no++;
    baris($out, [$no, $k['nama'], (int) $k['jml'], number_format($t / $totalKeluar * 100, 1, ',', '.'), rupiahCsv($t)]);
}
baris($out, ['', 'TOTAL PENGELUARAN', '', '', rupiahCsv($ringkasan['pengeluaran'])]);
baris($out, []);

baris($out, ['=== REKAP PEMASUKAN PER KATEGORI ===']);
baris($out, ['No', 'Kategori', 'Jumlah Transaksi', 'Persentase (%)', 'Total (Rp)']);
$no = 0;
foreach ($rekapMasuk as $k) {
    $t = (float) $k['total'];
    if ($t <= 0) continue;
    $no++;
    baris($out, [$no, $k['nama'], (int) $k['jml'], number_format($t / $totalMasuk * 100, 1, ',', '.'), rupiahCsv($t)]);
}
baris($out, ['', 'TOTAL PEMASUKAN', '', '', rupiahCsv($ringkasan['pemasukan'])]);
baris($out, []);

baris($out, ['=== RINCIAN TRANSAKSI HARIAN ===']);
baris($out, ['No', 'Tanggal', 'Hari', 'Jenis', 'Kategori', 'Nominal (Rp)', 'Metode', 'Keterangan']);
$no = 0;
foreach ($transaksi as $t) {
    $no++;
    baris($out, [
        $no,
        date('d/m/Y', strtotime($t['tanggal'])),
        tanggalIndo($t['tanggal']),
        $t['jenis'] === 'masuk' ? 'Masuk' : 'Keluar',
        $t['kategori_nama'] ?: 'Tanpa Kategori',
        rupiahCsv($t['nominal']),
        metodeList()[$t['metode']] ?? $t['metode'],
        $t['keterangan'] ?: '',
    ]);
}
baris($out, []);
baris($out, ['', 'TOTAL PEMASUKAN', '', '', '', rupiahCsv($ringkasan['pemasukan'])]);
baris($out, ['', 'TOTAL PENGELUARAN', '', '', '', rupiahCsv($ringkasan['pengeluaran'])]);
baris($out, ['', 'SELISIH', '', '', '', rupiahCsv($ringkasan['sisa'])]);

fclose($out);
exit;
