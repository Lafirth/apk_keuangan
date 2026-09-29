<?php
/** Halaman Rekap Bulanan */
$ringkasan = ringkasanBulan($periode);
$perbandingan = perbandinganBulan($periode);
$rekapKeluar  = rekapKategori($periode, 'keluar');
$rekapMasuk   = rekapKategori($periode, 'masuk');
$bulanAda     = daftarBulanAda();
$hariMinggu   = harianKeluar($periode);
$jmlHari      = cal_days_in_month(CAL_GREGORIAN, (int) substr($periode, 5, 2), (int) substr($periode, 0, 4));

// Persentase per kategori
$totalKeluar = $ringkasan['pengeluaran'] ?: 1;
$totalMasuk  = $ringkasan['pemasukan'] ?: 1;

$hariList = [];
foreach ($hariMinggu as $h) {
    $hariList[(int) substr($h['tanggal'], -2)] = (float) $h['total'];
}
$hariTertinggi = $hariList ? max($hariList) : 0;
$tanggalTertinggi = $hariTertinggi > 0
    ? array_search($hariTertinggi, $hariList, true) : null;

// Kategori terbesar
$topKeluar = $rekapKeluar[0] ?? null;

require __DIR__ . '/../includes/header.php';
?>

<!-- ================= FILTER BULAN ================= -->
<section class="card fade-up">
  <div class="card-body tight">
    <div class="filters">
      <form method="get" class="filters" style="gap:11px;flex:1">
        <input type="hidden" name="page" value="rekap">
        <label class="field" style="min-width:210px">
          <span>Pilih Bulan</span>
          <select class="select" name="periode" onchange="this.form.submit()">
            <?php foreach ($bulanAda as $b): ?>
              <option value="<?= e($b) ?>" <?= $b === $periode ? 'selected' : '' ?>><?= e(periodeIndo($b)) ?></option>
            <?php endforeach; ?>
            <?php if (!in_array($periode, $bulanAda, true)): ?>
              <option value="<?= e($periode) ?>" selected><?= e(periodeIndo($periode)) ?></option>
            <?php endif; ?>
          </select>
        </label>
      </form>

      <div class="flex gap-8" style="margin-top:22px">
        <?php
        $prev = date('Y-m', strtotime($periode . ' -1 month'));
        $next = date('Y-m', strtotime($periode . ' +1 month'));
        ?>
        <a class="btn btn-ghost btn-sm" href="<?= e(baseUrl('index.php?page=rekap&periode=' . $prev)) ?>" title="Bulan sebelumnya">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <span class="desk-only"><?= e(bulanIndo((int) substr($prev, 5, 2), false)) ?></span>
        </a>
        <a class="btn btn-ghost btn-sm" href="<?= e(baseUrl('index.php?page=rekap&periode=' . $next)) ?>" title="Bulan berikutnya">
          <span class="desk-only"><?= e(bulanIndo((int) substr($next, 5, 2), false)) ?></span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </a>
      </div>

      <div style="flex:1"></div>

      <a class="btn btn-gold no-print" href="<?= e(baseUrl('print/rekap.php?periode=' . $periode)) ?>" target="_blank">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
          <path d="M6 14h12v8H6z"/>
        </svg>
        Cetak / PDF
      </a>
      <a class="btn btn-ghost no-print" href="<?= e(baseUrl('print/export.php?periode=' . $periode)) ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>
        </svg>
        <span class="desk-only">Export CSV</span>
      </a>
    </div>
  </div>
</section>

<!-- ================= JUDUL REKAP ================= -->
<section class="print-head">
  <h2>Laporan Keuangan Bulanan</h2>
  <p><?= e(currentUser()['nama']) ?> &middot; Periode <?= e(periodeIndo($periode)) ?></p>
</section>

<!-- ================= KARTU RINGKAS ================= -->
<section class="grid g-4 fade-up d1">
  <div class="stat st-green">
    <div class="stat-top">
      <div>
        <div class="stat-label">Total Pemasukan</div>
        <div class="stat-val money-in"><?= e(rupiah($ringkasan['pemasukan'])) ?></div>
      </div>
      <div class="stat-ico">📈</div>
    </div>
    <div class="stat-foot">Gaji dan pemasukan lain</div>
  </div>
  <div class="stat st-red">
    <div class="stat-top">
      <div>
        <div class="stat-label">Total Pengeluaran</div>
        <div class="stat-val money-out"><?= e(rupiah($ringkasan['pengeluaran'])) ?></div>
      </div>
      <div class="stat-ico">💸</div>
    </div>
    <div class="stat-foot"><?= e($ringkasan['jumlah']) ?> transaksi</div>
  </div>
  <div class="stat st-blue">
    <div class="stat-top">
      <div>
        <div class="stat-label">Sisa Bulan Ini</div>
        <div class="stat-val"><?= e(rupiah($ringkasan['sisa'])) ?></div>
      </div>
      <div class="stat-ico">💰</div>
    </div>
    <div class="stat-foot">Pemasukan − Pengeluaran</div>
  </div>
  <div class="stat st-gold">
    <div class="stat-top">
      <div>
        <div class="stat-label">Rata-rata / Hari</div>
        <div class="stat-val sm"><?= e(rupiah(rataHarian($periode))) ?></div>
      </div>
      <div class="stat-ico">📊</div>
    </div>
    <div class="stat-foot">Dari <?= e($ringkasan['hari_aktif']) ?> hari aktif</div>
  </div>
</section>

<!-- ================= BANDINGAN BULAN LALU ================= -->
<section class="card fade-up d2">
  <div class="card-body tight">
    <div class="flex items-center gap-16 flex-wrap">
      <div class="grow" style="min-width:230px">
        <div class="tiny mute2" style="text-transform:uppercase;letter-spacing:.7px;font-weight:700">
          Perbandingan dengan <?= e($perbandingan['bulan_lalu_nama']) ?>
        </div>
        <div class="flex items-center gap-12 flex-wrap" style="margin-top:9px">
          <div>
            <div class="cat-sub">Bulan ini</div>
            <b class="money-out" style="font-size:17px"><?= e(rupiah($perbandingan['bulan_ini'])) ?></b>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--text-mute)">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
          <div>
            <div class="cat-sub">Bulan lalu</div>
            <b style="font-size:17px"><?= e(rupiah($perbandingan['bulan_lalu'])) ?></b>
          </div>
        </div>
      </div>
      <div>
        <?php if ($perbandingan['bulan_lalu'] > 0): ?>
          <span class="trend <?= $perbandingan['selisih'] > 0 ? 'up' : ($perbandingan['selisih'] < 0 ? 'down' : 'flat') ?>"
                style="font-size:13px;padding:7px 14px">
            <?= $perbandingan['selisih'] > 0 ? ' Naik' : ($perbandingan['selisih'] < 0 ? ' Turun' : ' Sama') ?>
            <?= e(abs($perbandingan['persen'])) ?>%
          </span>
          <p class="tiny mute2" style="margin-top:7px;max-width:260px">
            <?= $perbandingan['selisih'] > 0
                ? 'Pengeluaranmu lebih besar dari bulan lalu.'
                : 'Bagus, pengeluaranmu lebih hemat dari bulan lalu.' ?>
          </p>
        <?php else: ?>
          <p class="tiny mute2">Belum ada data bulan sebelumnya untuk dibandingkan.</p>
        <?php endif; ?>
      </div>
    </div>
  </div>
</section>

<!-- ================= REKAP PENGELUARAN ================= -->
<section class="card fade-up d3">
  <div class="card-head">
    <div>
      <h2>Rekap Pengeluaran per Kategori</h2>
      <p><?= e(periodeIndo($periode)) ?> &middot; <?= e($rekapKeluar ? count(array_filter($rekapKeluar, fn($k) => (float) $k['total'] > 0)) . ' kategori terpakai' : 'belum ada pengeluaran') ?></p>
    </div>
  </div>
  <div class="card-body flush">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:34px">#</th>
            <th>Kategori</th>
            <th class="t-center" style="width:100px">Transaksi</th>
            <th class="t-right" style="width:110px">Persentase</th>
            <th class="t-right" style="width:170px">Total</th>
          </tr>
        </thead>
        <tbody>
          <?php $no = 0; foreach ($rekapKeluar as $k): $no++;
              $total = (float) $k['total']; if ($total <= 0) continue;
              $pct = ($total / $totalKeluar) * 100; ?>
            <tr>
              <td class="t-center mute2 t-num"><?= $no ?></td>
              <td>
                <div class="cat-cell">
                  <div class="cat-ico" style="--c-bg:<?= htmlspecialchars($k['warna'], ENT_QUOTES) ?>1a;--c-line:<?= htmlspecialchars($k['warna'], ENT_QUOTES) ?>44">
                    <?= e($k['ikon']) ?>
                  </div>
                  <div class="cat-nm"><?= e($k['nama']) ?></div>
                </div>
              </td>
              <td class="t-center t-num"><?= (int) $k['jml'] ?></td>
              <td class="t-right">
                <div class="flex items-center gap-8" style="justify-content:flex-end">
                  <div class="bar" style="width:56px">
                    <i style="width:<?= e($pct) ?>%;background:linear-gradient(90deg,<?= e($k['warna']) ?>,<?= e($k['warna']) ?>88)"></i>
                  </div>
                  <span class="tnum" style="min-width:48px"><?= e(number_format($pct, 1)) ?>%</span>
                </div>
              </td>
              <td class="t-right t-num money-out"><?= e(rupiah($total)) ?></td>
            </tr>
          <?php endforeach; ?>
          <?php if (!$rekapKeluar || !array_filter($rekapKeluar, fn($k) => (float) $k['total'] > 0)): ?>
            <tr><td colspan="5">
              <div class="empty" style="padding:34px">
                <div class="empty-ico">📉</div>
                <h3>Belum ada pengeluaran</h3>
                <p>Tidak ada pengeluaran tercatat pada <?= e(periodeIndo($periode)) ?>.</p>
              </div>
            </td></tr>
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
</section>

<!-- ================= REKAP PEMASUKAN ================= -->
<section class="card fade-up d4">
  <div class="card-head">
    <div><h2>Rekap Pemasukan</h2><p>Gaji dan pemasukan lainnya bulan ini</p></div>
  </div>
  <div class="card-body flush">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Kategori</th>
            <th class="t-center" style="width:100px">Transaksi</th>
            <th class="t-right" style="width:110px">Persentase</th>
            <th class="t-right" style="width:170px">Total</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($rekapMasuk as $k):
              $total = (float) $k['total']; if ($total <= 0) continue;
              $pct = ($total / $totalMasuk) * 100; ?>
            <tr>
              <td>
                <div class="cat-cell">
                  <div class="cat-ico" style="--c-bg:<?= htmlspecialchars($k['warna'], ENT_QUOTES) ?>1a;--c-line:<?= htmlspecialchars($k['warna'], ENT_QUOTES) ?>44">
                    <?= e($k['ikon']) ?>
                  </div>
                  <div class="cat-nm"><?= e($k['nama']) ?></div>
                </div>
              </td>
              <td class="t-center t-num"><?= (int) $k['jml'] ?></td>
              <td class="t-right">
                <div class="flex items-center gap-8" style="justify-content:flex-end">
                  <div class="bar green" style="width:56px"><i style="width:<?= e($pct) ?>%"></i></div>
                  <span class="t-num" style="min-width:48px"><?= e(number_format($pct, 1)) ?>%</span>
                </div>
              </td>
              <td class="t-right t-num money-in"><?= e(rupiah($total)) ?></td>
            </tr>
          <?php endforeach; ?>
          <?php if (!array_filter($rekapMasuk, fn($k) => (float) $k['total'] > 0)): ?>
            <tr><td colspan="4">
              <div class="empty" style="padding:34px">
                <div class="empty-ico">📈</div>
                <h3>Belum ada pemasukan</h3>
                <p>Belum ada pemasukan tercatat pada <?= e(periodeIndo($periode)) ?>.</p>
              </div>
            </td></tr>
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
</section>

<!-- ================= RINGKASAN AKHIR ================= -->
<section class="grid g-3 fade-up d5">
  <div class="card">
    <div class="card-body tight">
      <div class="cat-sub">Hari Paling Boros</div>
      <div class="flex items-center gap-12" style="margin-top:8px">
        <div class="stat-ico" style="width:46px;height:46px;font-size:22px">🔥</div>
        <div>
          <b style="font-size:17px"><?= e($tanggalTertinggi ? tanggalIndo(date('Y-m-' . str_pad((string) $tanggalTertinggi, 2, '0', STR_PAD_LEFT))) : '-') ?></b>
          <div class="money-out strong"><?= e(rupiah($hariTertinggi)) ?></div>
        </div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-body tight">
      <div class="cat-sub">Kategori Terbesar</div>
      <div class="flex items-center gap-12" style="margin-top:8px">
        <div class="cat-ico" style="width:46px;height:46px;font-size:22px;
             --c-bg:<?= $topKeluar ? htmlspecialchars($topKeluar['warna'], ENT_QUOTES) . '1a' : 'rgba(255,255,255,.06)' ?>;
             --c-line:<?= $topKeluar ? htmlspecialchars($topKeluar['warna'], ENT_QUOTES) . '44' : 'var(--line)' ?>">
          <?= $topKeluar ? e($topKeluar['ikon']) : '—' ?>
        </div>
        <div>
          <b style="font-size:17px"><?= $topKeluar ? e($topKeluar['nama']) : '-' ?></b>
          <div class="money-out strong"><?= $topKeluar ? e(rupiah($topKeluar['total'])) : 'Rp 0' ?></div>
        </div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-body tight">
      <div class="cat-sub">Rasio Pengeluaran</div>
      <div class="flex items-center gap-12" style="margin-top:8px">
        <div class="stat-ico" style="width:46px;height:46px;font-size:22px;
             --c-bg:rgba(99,102,241,.16);--c-line:rgba(99,102,241,.42)">⚖️</div>
        <div>
          <b style="font-size:17px"><?= e($ringkasan['persen']) ?>%</b>
          <div class="tiny mute2">dari total pemasukan</div>
        </div>
      </div>
      <div class="bar <?= $ringkasan['persen'] > 100 ? 'red' : ($ringkasan['persen'] > 80 ? 'gold' : 'green') ?>" style="margin-top:11px">
        <i style="width:<?= e(min($ringkasan['persen'], 100)) ?>%"></i>
      </div>
    </div>
  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
