<?php
/** Halaman cetak rekap bulanan (A4 friendly) */
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/model.php';

requireLogin();

$periode = (string) get('periode', periodeSekarang());
if (!preg_match('/^\d{4}-\d{2}$/', $periode)) {
    $periode = periodeSekarang();
}

$user        = currentUser();
$ringkasan   = ringkasanBulan($periode);
$perbandingan = perbandinganBulan($periode);
$rekapKeluar = rekapKategori($periode, 'keluar');
$rekapMasuk  = rekapKategori($periode, 'masuk');
$semua       = transaksiList(['periode' => $periode]);
$totalKeluar = $ringkasan['pengeluaran'] ?: 1;
$totalMasuk  = $ringkasan['pemasukan'] ?: 1;

// Kelompokkan transaksi per tanggal
$perTanggal = [];
foreach ($semua as $t) {
    $perTanggal[$t['tanggal']][] = $t;
}
ksort($perTanggal);
?><!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rekap <?= e(periodeIndo($periode)) ?> &middot; <?= e(APP_NAME) ?></title>
<link rel="stylesheet" href="<?= e(baseUrl('assets/css/style.css')) ?>">
</head>
<body>

<div class="no-print" style="position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:12px;
     padding:14px 24px;background:rgba(12,17,32,.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)">
  <div>
    <b>Pratinjau Cetak</b>
    <div class="tiny mute2"><?= e(periodeIndo($periode)) ?> &middot; atur ukuran kertas A4</div>
  </div>
  <div style="flex:1"></div>
  <button class="btn btn-ghost btn-sm" onclick="window.close()">Tutup</button>
  <button class="btn btn-primary btn-sm" onclick="window.print()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
      <path d="M6 14h12v8H6z"/>
    </svg>
    Cetak / Simpan PDF
  </button>
</div>

<div style="max-width:900px;margin:0 auto;padding:26px 24px 50px">

  <!-- Kop -->
  <div class="print-head" style="display:block;margin-bottom:20px">
    <div style="display:flex;align-items:flex-start;gap:14px;border-bottom:2px solid #18181b;padding-bottom:14px">
      <div style="font-size:32px;line-height:1">💰</div>
      <div style="flex:1">
        <h2 style="font-family:var(--font-display);font-size:21px;letter-spacing:-.4px">
          Laporan Keuangan Bulanan
        </h2>
        <p style="font-size:12.5px;color:#52525b;margin-top:3px">
          Periode <b><?= e(periodeIndo($periode)) ?></b>
        </p>
      </div>
      <div style="text-align:right;font-size:11.5px;color:#71717a;line-height:1.7">
        <div><b style="color:#111"><?= e($user['nama']) ?></b></div>
        <div>Dicetak: <?= e(date('d/m/Y H:i')) ?></div>
      </div>
    </div>
  </div>

  <!-- Ringkasan -->
  <div class="grid g-4" style="gap:12px;margin-bottom:20px">
    <div class="stat">
      <div class="stat-label">Total Pemasukan</div>
      <div class="stat-val sm"><?= e(rupiah($ringkasan['pemasukan'])) ?></div>
    </div>
    <div class="stat">
      <div class="stat-label">Total Pengeluaran</div>
      <div class="stat-val sm"><?= e(rupiah($ringkasan['pengeluaran'])) ?></div>
    </div>
    <div class="stat">
      <div class="stat-label">Sisa Bulan Ini</div>
      <div class="stat-val sm"><?= e(rupiah($ringkasan['sisa'])) ?></div>
    </div>
    <div class="stat">
      <div class="stat-label">Rata-rata / Hari</div>
      <div class="stat-val sm"><?= e(rupiah(rataHarian($periode))) ?></div>
    </div>
  </div>

  <!-- Info tambahan -->
  <div class="card" style="margin-bottom:20px">
    <div class="card-body tight">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;font-size:13px">
        <div>
          <div class="cat-sub">Jumlah Transaksi</div>
          <b><?= (int) $ringkasan['jumlah'] ?> transaksi</b>
        </div>
        <div>
          <div class="cat-sub">Hari Aktif</div>
          <b><?= (int) $ringkasan['hari_aktif'] ?> hari</b>
        </div>
        <div>
          <div class="cat-sub">Rasio Pengeluaran</div>
          <b><?= e($ringkasan['persen']) ?>% dari pemasukan</b>
        </div>
      </div>
      <?php if ($perbandingan['bulan_lalu'] > 0): ?>
        <div class="divider"></div>
        <div style="font-size:13px">
          <b>Perbandingan <?= e($perbandingan['bulan_lalu_nama']) ?>:</b>
          pengeluaran bulan ini <b><?= e(rupiah($perbandingan['bulan_ini'])) ?></b>,
          bulan lalu <b><?= e(rupiah($perbandingan['bulan_lalu'])) ?></b>
          (<?= $perbandingan['selisih'] > 0 ? 'naik' : ($perbandingan['selisih'] < 0 ? 'turun' : 'sama') ?>
          <?= e(abs($perbandingan['persen'])) ?>%).
        </div>
      <?php endif; ?>
    </div>
  </div>

  <!-- Rekap kategori pengeluaran -->
  <div class="card" style="margin-bottom:20px">
    <div class="card-head"><h2>Rekap Pengeluaran per Kategori</h2></div>
    <div class="card-body flush">
      <table>
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th>Kategori</th>
            <th class="t-center" style="width:80px">Trx</th>
            <th class="t-right" style="width:80px">%</th>
            <th class="t-right" style="width:140px">Total</th>
          </tr>
        </thead>
        <tbody>
          <?php $no = 0; foreach ($rekapKeluar as $k):
              $t = (float) $k['total']; if ($t <= 0) continue; $no++;
              $pct = $t / $totalKeluar * 100; ?>
            <tr>
              <td class="t-center"><?= $no ?></td>
              <td><?= e($k['ikon']) ?> <?= e($k['nama']) ?></td>
              <td class="t-center"><?= (int) $k['jml'] ?></td>
              <td class="t-right t-num"><?= e(number_format($pct, 1)) ?>%</td>
              <td class="t-right t-num"><b><?= e(rupiah($t)) ?></b></td>
            </tr>
          <?php endforeach; ?>
          <?php if (!$no): ?>
            <tr><td colspan="5" class="t-center mute2" style="padding:20px">Tidak ada pengeluaran.</td></tr>
          <?php endif; ?>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="t-right">TOTAL PENGELUARAN</td>
            <td class="t-right t-num"><?= e(rupiah($ringkasan['pengeluaran'])) ?></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  <!-- Rekap kategori pemasukan -->
  <div class="card" style="margin-bottom:20px">
    <div class="card-head"><h2>Rekap Pemasukan</h2></div>
    <div class="card-body flush">
      <table>
        <thead>
          <tr>
            <th>Kategori</th>
            <th class="t-center" style="width:80px">Trx</th>
            <th class="t-right" style="width:80px">%</th>
            <th class="t-right" style="width:140px">Total</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($rekapMasuk as $k):
              $t = (float) $k['total']; if ($t <= 0) continue;
              $pct = $t / $totalMasuk * 100; ?>
            <tr>
              <td><?= e($k['ikon']) ?> <?= e($k['nama']) ?></td>
              <td class="t-center"><?= (int) $k['jml'] ?></td>
              <td class="t-right t-num"><?= e(number_format($pct, 1)) ?>%</td>
              <td class="t-right t-num"><b><?= e(rupiah($t)) ?></b></td>
            </tr>
          <?php endforeach; ?>
          <?php if (!array_filter($rekapMasuk, fn($k) => (float) $k['total'] > 0)): ?>
            <tr><td colspan="4" class="t-center mute2" style="padding:20px">Tidak ada pemasukan.</td></tr>
          <?php endif; ?>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="t-right">TOTAL PEMASUKAN</td>
            <td class="t-right t-num"><?= e(rupiah($ringkasan['pemasukan'])) ?></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  <!-- Rincian harian -->
  <div class="card">
    <div class="card-head">
      <h2>Rincian Transaksi Harian</h2>
      <p><?= e(periodeIndo($periode)) ?></p>
    </div>
    <div class="card-body flush">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:130px">Tanggal</th>
              <th>Kategori</th>
              <th>Keterangan</th>
              <th class="t-center" style="width:80px">Metode</th>
              <th class="t-right" style="width:80px">Jenis</th>
              <th class="t-right" style="width:140px">Nominal</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($perTanggal as $tgl => $list):
                $harianMasuk = 0; $harianKeluar = 0;
                foreach ($list as $t) {
                    if ($t['jenis'] === 'masuk') $harianMasuk += (float) $t['nominal'];
                    else                          $harianKeluar += (float) $t['nominal']; ?>
              <tr>
                <td class="nowrap t-num"><?= e(tanggalIndo($tgl)) ?></td>
                <td class="nowrap"><?= e($t['kategori_ikon'] ?: '') ?> <?= e($t['kategori_nama'] ?: 'Tanpa Kategori') ?></td>
                <td><?= e($t['keterangan'] ?: '—') ?></td>
                <td class="t-center"><?= e(metodeList()[$t['metode']] ?? $t['metode']) ?></td>
                <td class="t-right"><?= $t['jenis'] === 'masuk' ? 'Masuk' : 'Keluar' ?></td>
                <td class="t-right t-num"><b><?= e(rupiah($t['nominal'])) ?></b></td>
              </tr>
            <?php } ?>
              <tr style="background:rgba(255,255,255,.05)">
                <td colspan="5" class="t-right"><b>Subtotal <?= e(tanggalIndo($tgl, false)) ?></b></td>
                <td class="t-right t-num">
                  <?php if ($harianMasuk > 0): ?>
                    <div class="tiny" style="color:#15803d">+ <?= e(rupiah($harianMasuk)) ?></div>
                  <?php endif; ?>
                  <b><?= e(rupiah($harianKeluar)) ?></b>
                </td>
              </tr>
            <?php endforeach; ?>
            <?php if (!$perTanggal): ?>
              <tr><td colspan="6" class="t-center mute2" style="padding:26px">
                Belum ada transaksi pada <?= e(periodeIndo($periode)) ?>.
              </td></tr>
            <?php endif; ?>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="t-right">SELISIH (Pemasukan − Pengeluaran)</td>
              <td class="t-right t-num"><?= e(rupiah($ringkasan['sisa'])) ?></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>

  <div class="print-foot">
    <?= e(APP_NAME) ?> &middot; Laporan keuangan <b><?= e($user['nama']) ?></b>
    &middot; Periode <?= e(periodeIndo($periode)) ?>
    &middot; Dicetak <?= e(date('d/m/Y H:i')) ?>
  </div>
</div>

<script>window.addEventListener('load', () => { /* siap dipindai / di-trigger print */ });</script>
</body>
</html>
