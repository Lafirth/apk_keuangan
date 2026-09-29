<?php
/** Front controller / router */
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/model.php';

requireLogin();

$page     = (string) get('page', 'dashboard');
$periode  = (string) get('periode', periodeSekarang());

if (!preg_match('/^\d{4}-\d{2}$/', $periode)) {
    $periode = periodeSekarang();
}

$valid = ['dashboard', 'transaksi', 'kategori', 'rekap'];
if (!in_array($page, $valid, true)) {
    $page = 'dashboard';
}

switch ($page) {
    case 'dashboard':
        $judul    = 'Dashboard';
        $subjudul = 'Ringkasan keuanganmu hari ini';
        require __DIR__ . '/pages/dashboard.php';
        break;

    case 'transaksi':
        $judul    = 'Transaksi Harian';
        $subjudul = 'Catat & kelola setiap pemasukan dan pengeluaran';
        require __DIR__ . '/pages/transaksi.php';
        break;

    case 'kategori':
        $judul    = 'Kategori';
        $subjudul = 'Kelola kategori pemasukan & pengeluaran';
        require __DIR__ . '/pages/kategori.php';
        break;

    case 'rekap':
        $judul    = 'Rekap Bulanan';
        $subjudul = 'Rincian lengkap pengeluaran per bulan';
        require __DIR__ . '/pages/rekap.php';
        break;
}
