<?php
/** Halaman Login */
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

requireGuest();

$error = '';

if (isPost()) {
    $username = teks((string) post('username', ''), 50);
    $password = (string) post('password', '');

    if ($username === '' || $password === '') {
        $error = 'Username dan password wajib diisi.';
    } elseif (attemptLogin($username, $password)) {
        redirect('index.php');
    } else {
        $error = 'Username atau password salah.';
    }
}
?><!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Masuk &middot; <?= e(APP_NAME) ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= e(baseUrl('assets/css/style.css')) ?>">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💰</text></svg>">
</head>
<body class="auth-body">

<div class="aurora" aria-hidden="true">
  <span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>
</div>

<div class="auth-wrap">
  <!-- Panel kiri -->
  <section class="auth-hero">
    <div class="auth-brand">
      <div class="brand-logo lg">💰</div>
      <div>
        <strong><?= e(APP_NAME) ?></strong>
        <small><?= e(APP_TAGLINE) ?></small>
      </div>
    </div>

    <h2 class="hero-title">
      Kendalikan uangmu,<br>
      <span class="grad">hari demi hari.</span>
    </h2>
    <p class="hero-sub">
      Catat gaji masuk setiap bulan, rinci setiap pengeluaran harian,
      dan lihat sisa uangmu kapan saja.
    </p>

    <ul class="hero-list">
      <li><span class="hl-ico">💸</span> Rinci pengeluaran per kategori &amp; per hari</li>
      <li><span class="hl-ico">📊</span> Grafik &amp; rekap bulanan otomatis</li>
      <li><span class="hl-ico">🧾</span> Rekap siap cetak kapan saja</li>
    </ul>

    <div class="hero-stats">
      <div><b>Harian</b><small>pencatatan</small></div>
      <div><b>Bulanan</b><small>rekap</small></div>
      <div><b>Real-time</b><small>sisa saldo</small></div>
    </div>
  </section>

  <!-- Panel kanan: form -->
  <section class="auth-card">
    <div class="auth-card-head">
      <h1>Selamat Datang</h1>
      <p>Masuk untuk melanjutkan pencatatan keuanganmu.</p>
    </div>

    <?php if ($error): ?>
      <div class="alert alert-danger">
        <span><?= e($error) ?></span>
      </div>
    <?php endif; ?>

    <form method="post" class="auth-form" autocomplete="off">
      <label class="field">
        <span>Username</span>
        <div class="input-ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>
          </svg>
          <input type="text" name="username" placeholder="Masukkan username"
                 value="<?= e((string) post('username', '')) ?>" required autofocus>
        </div>
      </label>

      <label class="field">
        <span>Password</span>
        <div class="input-ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="10" width="16" height="11" rx="2"/>
            <path d="M8 10V7a4 4 0 018 0v3"/>
          </svg>
          <input type="password" name="password" id="passInput"
                 placeholder="Masukkan password" required>
          <button type="button" class="eye" id="togglePass" aria-label="Lihat password">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </label>

      <button type="submit" class="btn btn-primary btn-block btn-lg">
        Masuk ke Aplikasi
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6"/>
        </svg>
      </button>
    </form>

    <?php if (DEMO_LOGIN): ?>
    <div class="auth-hint">
      <b>Akun demo</b>
      <div class="hint-creds">
        <code>christa</code> <span>/</span> <code>wira26</code>
        <button class="chip ghost" type="button" id="fillDemo">Isi Otomatis</button>
      </div>
    </div>
    <?php endif; ?>
  </section>
</div>

<script>
  document.getElementById('togglePass').addEventListener('click', function () {
    var i = document.getElementById('passInput');
    i.type = i.type === 'password' ? 'text' : 'password';
  });
  <?php if (DEMO_LOGIN): ?>
  document.getElementById('fillDemo').addEventListener('click', function () {
    document.querySelector('[name=username]').value = 'christa';
    document.getElementById('passInput').value = 'wira26';
  });
  <?php endif; ?>
</script>
</body>
</html>
