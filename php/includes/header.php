<?php
/** Layout header + sidebar */
require_once __DIR__ . '/model.php';

$user = currentUser();
$menu = [
    ['page' => 'dashboard',  'icon' => 'grid',     'label' => 'Dashboard'],
    ['page' => 'transaksi',  'icon' => 'repeat',   'label' => 'Transaksi'],
    ['page' => 'kategori',   'icon' => 'tag',      'label' => 'Kategori'],
    ['page' => 'rekap',      'icon' => 'chart',    'label' => 'Rekap Bulanan'],
];
?><!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= e($judul ?? APP_NAME) ?> &middot; <?= e(APP_NAME) ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= e(baseUrl('assets/css/style.css')) ?>">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💰</text></svg>">
</head>
<body data-page="<?= e($page ?? '') ?>">

<div class="aurora" aria-hidden="true">
  <span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>
</div>

<div class="shell">
  <!-- ================= SIDEBAR ================= -->
  <aside class="sidebar" id="sidebar">
    <div class="brand">
      <div class="brand-logo">💰</div>
      <div class="brand-text">
        <strong><?= e(APP_NAME) ?></strong>
        <small>Keuangan Harian</small>
      </div>
    </div>

    <nav class="nav">
      <p class="nav-label">MENU</p>
      <?php foreach ($menu as $m): ?>
        <a href="<?= e(baseUrl('index.php?page=' . $m['page'])) ?>"
           class="nav-item <?= ($page ?? '') === $m['page'] ? 'active' : '' ?>">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
               stroke-linecap="round" stroke-linejoin="round">
            <?php if ($m['icon'] === 'grid'): ?>
              <rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/>
              <rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>
            <?php elseif ($m['icon'] === 'repeat'): ?>
              <path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/>
              <path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
            <?php elseif ($m['icon'] === 'tag'): ?>
              <path d="M20.6 13.4L12 22l-9-9V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>
            <?php else: ?>
              <path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="1"/>
              <rect x="12" y="8" width="3" height="10" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/>
            <?php endif; ?>
          </svg>
          <span><?= e($m['label']) ?></span>
        </a>
      <?php endforeach; ?>

      <p class="nav-label">SALDO SAWA</p>
      <div class="side-balance">
        <small>Saldo Tersisa</small>
        <strong id="sideSaldo"><?= e(rupiahRingkas(saldoSekarang())) ?></strong>
      </div>
    </nav>

    <div class="side-foot">
      <div class="side-user">
        <div class="avatar"><?= e(mb_strtoupper(mb_substr($user['nama'], 0, 1))) ?></div>
        <div>
          <strong><?= e($user['nama']) ?></strong>
          <small>@<?= e($user['username']) ?></small>
        </div>
      </div>
      <a class="side-logout" href="<?= e(baseUrl('logout.php')) ?>" title="Keluar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>
        </svg>
      </a>
    </div>
  </aside>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>

  <!-- ================= MAIN ================= -->
  <main class="main">
    <header class="topbar">
      <button class="icon-btn burger" id="burger" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M3 6h18M3 12h18M3 18h18"/>
        </svg>
      </button>
      <div class="page-head">
        <h1><?= e($judul ?? 'Dashboard') ?></h1>
        <?php if (!empty($subjudul)): ?><p><?= e($subjudul) ?></p><?php endif; ?>
      </div>
      <div class="topbar-right">
        <div class="today" id="jamHidup"><?= e(tanggalIndo(date('Y-m-d'))) ?></div>
        <button class="btn btn-primary" data-modal="modalTransaksi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>Transaksi Baru</span>
        </button>
      </div>
    </header>

    <div class="content">
      <?php foreach (flashGet() as $f): ?>
        <div class="alert alert-<?= e($f['tipe']) ?>">
          <span><?= e($f['pesan']) ?></span>
          <button class="alert-x" onclick="this.parentElement.remove()">&times;</button>
        </div>
      <?php endforeach; ?>
