<?php
/** Halaman Dashboard */
$bulanIni = periodeSekarang();
$ringkasan = ringkasanBulan($bulanIni);
$perbandingan = perbandinganBulan($bulanIni);
$bulanAda = daftarBulanAda();
$user = currentUser();

// Nilai awal dirender di server agar halaman benar walau JS belum jalan
$rekapAwal   = rekapKategori($bulanIni, 'keluar');
$rekapAwal   = array_values(array_filter($rekapAwal, static fn($k) => (float) $k['total'] > 0));
$totalAwal   = array_sum(array_map(static fn($k) => (float) $k['total'], $rekapAwal)) ?: 1;
$terbaruAwal = array_slice(transaksiList(), 0, 7);
$saldoAwalNow = saldoSekarang();
$rataAwal = rataHarian($bulanIni);

// Belanja hari ini
$stHariIni = db()->prepare(
    "SELECT
        COALESCE(SUM(CASE WHEN jenis = 'keluar' THEN nominal END), 0) AS keluar,
        COALESCE(SUM(CASE WHEN jenis = 'masuk'  THEN nominal END), 0) AS masuk
     FROM transaksi WHERE user_id = ? AND tanggal = CURDATE()"
);
$stHariIni->execute([userId()]);
$hariIni = $stHariIni->fetch();

require __DIR__ . '/../includes/header.php';
?>

<!-- ================= PILIH BULAN ================= -->
<div class="filters fade-up">
  <label class="field" style="min-width:200px">
    <span>Periode</span>
    <select class="select" id="dashPeriode">
      <option value="<?= e($bulanIni) ?>"><?= e(periodeIndo($bulanIni)) ?> (berjalan)</option>
      <?php foreach ($bulanAda as $b): ?>
        <?php if ($b !== $bulanIni): ?>
          <option value="<?= e($b) ?>"><?= e(periodeIndo($b)) ?></option>
        <?php endif; ?>
      <?php endforeach; ?>
    </select>
  </label>
  <div style="flex:1"></div>
  <a class="btn btn-ghost" href="<?= e(baseUrl('print/rekap.php?periode=' . $bulanIni)) ?>" target="_blank">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
      <path d="M6 14h12v8H6z"/>
    </svg>
    <span class="desk-only">Cetak Rekap</span>
  </a>
  <button class="btn btn-ghost" id="btnSaldoAwal">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h6M9 14h6"/>
    </svg>
    <span class="desk-only">Atur Saldo Awal</span>
  </button>
</div>

<!-- ================= KARTU STATISTIK ================= -->
<section class="grid g-4">
  <!-- Sisa Bulan -->
  <div class="stat st-blue fade-up d1">
    <div class="stat-top">
      <div>
        <div class="stat-label">Sisa Bulan Ini</div>
        <div class="stat-val" id="kSisa"><?= e(rupiah($ringkasan['sisa'])) ?></div>
      </div>
      <div class="stat-ico">💰</div>
    </div>
    <div class="stat-foot">
      <span id="kPersenTxt"><?= e($ringkasan['persen']) ?>% dari pemasukan</span>
    </div>
    <div class="bar green" style="margin-top:9px"><i id="kPersenBar" style="width:<?= e(min($ringkasan['persen'], 100)) ?>%"></i></div>
  </div>

  <!-- Pemasukan -->
  <div class="stat st-green fade-up d2">
    <div class="stat-top">
      <div>
        <div class="stat-label">Pemasukan <span id="kBulanLabel"><?= e(bulanIndo((int) substr($bulanIni, 5, 2), false)) ?></span></div>
        <div class="stat-val money-in" id="kMasuk"><?= e(rupiah($ringkasan['pemasukan'])) ?></div>
      </div>
      <div class="stat-ico">📈</div>
    </div>
    <div class="stat-foot">Gaji &amp; pemasukan lain bulan ini</div>
  </div>

  <!-- Pengeluaran -->
  <div class="stat st-red fade-up d3">
    <div class="stat-top">
      <div>
        <div class="stat-label">Pengeluaran Bulan Ini</div>
        <div class="stat-val money-out" id="kKeluar"><?= e(rupiah($ringkasan['pengeluaran'])) ?></div>
      </div>
      <div class="stat-ico">💸</div>
    </div>
    <div class="stat-foot">
      <?php if ($perbandingan['bulan_lalu'] > 0):
          $naik = $perbandingan['selisih'] > 0; ?>
        <span class="trend <?= $naik ? 'up' : ($perbandingan['selisih'] < 0 ? 'down' : 'flat') ?>" id="kTrend">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="<?= $naik ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5' ?>"/>
          </svg>
          <?= e(abs($perbandingan['persen'])) ?>% vs <?= e($perbandingan['bulan_lalu_nama']) ?>
        </span>
      <?php else: ?>
        <span class="trend flat" id="kTrend">Belum ada pembanding</span>
      <?php endif; ?>
    </div>
  </div>

  <!-- Saldo Keseluruhan -->
  <div class="stat st-gold fade-up d4">
    <div class="stat-top">
      <div>
        <div class="stat-label">Saldo Tersedia</div>
        <div class="stat-val sm" id="kSaldo"><?= e(rupiah($saldoAwalNow)) ?></div>
      </div>
      <div class="stat-ico">🏦</div>
    </div>
    <div class="stat-foot">Saldo awal + seluruh pemasukan − pengeluaran</div>
  </div>
</section>

<!-- ================= GRAFIK HARIAN + INFO KECIL ================= -->
<section class="grid g-2-1 fade-up d5">
  <div class="card">
    <div class="card-head">
      <div>
        <h2>Arus Keuangan Harian</h2>
        <p>Perbandingan pemasukan &amp; pengeluaran setiap hari</p>
      </div>
    </div>
    <div class="card-body">
      <div class="chart-box lg"><canvas id="chartHarian"></canvas></div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><div><h2>Ringkasan Cepat</h2><p>Angka-angka kunci bulan ini</p></div></div>
    <div class="card-body">
      <div class="grid" style="gap:12px">
        <div class="mitem">
          <div class="cat-ico" style="--c-bg:rgba(244,63,94,.16);--c-line:rgba(244,63,94,.4)">🛒</div>
          <div class="mitem-body">
            <b>Belanja Hari Ini</b>
            <small>Pengeluaran tercatat hari ini</small>
          </div>
          <div class="mitem-amt"><b id="kHariIni"><?= e(rupiah($hariIni['keluar'])) ?></b></div>
        </div>
        <div class="mitem">
          <div class="cat-ico" style="--c-bg:rgba(99,102,241,.16);--c-line:rgba(99,102,241,.4)">📊</div>
          <div class="mitem-body">
            <b>Rata-rata / Hari</b>
            <small>Pengeluaran rata-rata harian</small>
          </div>
          <div class="mitem-amt"><b id="kRata"><?= e(rupiah($rataAwal)) ?></b></div>
        </div>
        <div class="mitem">
          <div class="cat-ico" style="--c-bg:rgba(34,211,238,.16);--c-line:rgba(34,211,238,.4)">🗓️</div>
          <div class="mitem-body">
            <b>Aktivitas</b>
            <small>Jumlah transaksi tercatat</small>
          </div>
          <div class="mitem-amt"><b id="kJumlahTrx"><?= e($ringkasan['jumlah']) ?></b></div>
        </div>
      </div>

      <div class="divider"></div>
      <div class="card-head" style="padding:0;border:0;margin-bottom:14px">
        <div><h2 style="font-size:15px">Transaksi Terbaru</h2></div>
      </div>
      <div class="mlist" id="trxTerbaru">
        <?php if ($terbaruAwal): ?>
          <?php foreach ($terbaruAwal as $t):
              $masuk = $t['jenis'] === 'masuk';
              $c = $t['kategori_warna'] ?: '#6366f1'; ?>
            <div class="mitem">
              <div class="cat-ico" style="--c-bg:<?= e(hexRgba($c, .16)) ?>;--c-line:<?= e(hexRgba($c, .42)) ?>">
                <?= e($t['kategori_ikon'] ?: '📦') ?>
              </div>
              <div class="mitem-body">
                <b><?= e($t['kategori_nama'] ?: 'Tanpa Kategori') ?></b>
                <small><?= e(tanggalIndo($t['tanggal'], false)) ?><?= $t['keterangan'] ? ' &middot; ' . e($t['keterangan']) : '' ?></small>
              </div>
              <div class="mitem-amt">
                <b class="<?= $masuk ? 'money-in' : 'money-out' ?>">
                  <?= $masuk ? '+' : '-' ?> <?= e(rupiah($t['nominal'])) ?>
                </b>
              </div>
            </div>
          <?php endforeach; ?>
        <?php else: ?>
          <div class="empty" style="padding:26px">
            <div class="empty-ico">📭</div>
            <h3>Belum ada transaksi</h3>
            <p>Mulai catat pengeluaran harianmu dengan tombol Transaksi Baru.</p>
          </div>
        <?php endif; ?>
      </div>

      <a class="btn btn-ghost btn-block btn-sm" style="margin-top:16px"
         href="<?= e(baseUrl('index.php?page=transaksi')) ?>">
        Lihat Semua Transaksi
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6"/>
        </svg>
      </a>
    </div>
  </div>
</section>

<!-- ================= DONAT KATEGORI + REKAP ================= -->
<section class="grid g-1-2 fade-up d6">
  <div class="card">
    <div class="card-head">
      <div><h2>Komposisi Pengeluaran</h2><p>Per kategori bulan ini</p></div>
    </div>
    <div class="card-body">
      <div class="chart-box"><canvas id="chartDonat"></canvas></div>
    </div>
  </div>

  <div class="card">
    <div class="card-head">
      <div><h2>Rincian per Kategori</h2><p>Urut dari pengeluaran terbesar</p></div>
    </div>
    <div class="card-body">
      <div class="rek-list" id="rekKategori">
        <?php if ($rekapAwal): ?>
          <?php foreach ($rekapAwal as $k):
              $p = (float) $k['total'] / $totalAwal * 100; ?>
            <div class="rek-item">
              <div class="rek-top">
                <div class="cat-cell">
                  <div class="cat-ico" style="--c-bg:<?= e(hexRgba($k['warna'], .16)) ?>;--c-line:<?= e(hexRgba($k['warna'], .42)) ?>">
                    <?= e($k['ikon']) ?>
                  </div>
                  <div>
                    <div class="cat-nm"><?= e($k['nama']) ?></div>
                    <div class="cat-sub"><?= (int) $k['jml'] ?> transaksi</div>
                  </div>
                </div>
                <div class="rek-amt">
                  <b class="money-out"><?= e(rupiah($k['total'])) ?></b>
                  <small>dari <?= e(rupiah($totalAwal)) ?></small>
                </div>
              </div>
              <div class="rek-bar">
                <div class="bar red">
                  <i style="width:<?= e($p) ?>%;background:linear-gradient(90deg,<?= e($k['warna']) ?>,<?= e(hexRgba($k['warna'], .55)) ?>)"></i>
                </div>
                <span class="rek-pct"><?= e(number_format($p, 1)) ?>%</span>
              </div>
            </div>
          <?php endforeach; ?>
        <?php else: ?>
          <div class="empty" style="padding:26px">
            <div class="empty-ico">📊</div>
            <h3>Belum ada pengeluaran</h3>
            <p>Belum ada pengeluaran tercatat di bulan ini.</p>
          </div>
        <?php endif; ?>
      </div>
    </div>
  </div>
</section>

<!-- ================= TREN 6 BULAN ================= -->
<section class="card fade-up d6">
  <div class="card-head">
    <div><h2>Tren 6 Bulan Terakhir</h2><p>Perbandingan pemasukan &amp; pengeluaran antar bulan</p></div>
  </div>
  <div class="card-body">
    <div class="chart-box"><canvas id="chartTren"></canvas></div>
  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
