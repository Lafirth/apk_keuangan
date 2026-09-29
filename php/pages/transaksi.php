<?php
/** Halaman Transaksi */
$kategoriKeluar = kategoriAll('keluar');
$kategoriMasuk  = kategoriAll('masuk');
$bulanAda       = daftarBulanAda();
$jmlHari        = (int) date('t');

// Render awal (server-side) memakai filter default = bulan ini,
// supaya angka sudah benar sejak halaman pertama dimuat.
$awal        = transaksiList(['periode' => $periode]);
$sumMasuk    = 0.0;
$sumKeluar   = 0.0;
foreach ($awal as $r) {
    if ($r['jenis'] === 'masuk') $sumMasuk  += (float) $r['nominal'];
    else                          $sumKeluar += (float) $r['nominal'];
}
$sumJumlah = count($awal);
$sumSelisih = $sumMasuk - $sumKeluar;

require __DIR__ . '/../includes/header.php';
?>

<!-- ================= FILTER ================= -->
<section class="card fade-up">
  <div class="card-body tight">
    <div class="filters">
      <label class="field" style="min-width:190px">
        <span>Bulan</span>
        <select class="select" id="fPeriode" data-awal="<?= e($periode) ?>">
          <option value="">Semua Bulan</option>
          <option value="<?= e(periodeSekarang()) ?>" <?= $periode === periodeSekarang() ? 'selected' : '' ?>>
            Bulan Ini (<?= e(periodeIndo(periodeSekarang())) ?>)
          </option>
          <?php foreach ($bulanAda as $b): ?>
            <?php if ($b !== periodeSekarang()): ?>
              <option value="<?= e($b) ?>" <?= $b === $periode ? 'selected' : '' ?>><?= e(periodeIndo($b)) ?></option>
            <?php endif; ?>
          <?php endforeach; ?>
        </select>
      </label>

      <label class="field" style="min-width:150px">
        <span>Jenis</span>
        <select class="select" id="fJenis">
          <option value="">Semua</option>
          <option value="keluar">Pengeluaran</option>
          <option value="masuk">Pemasukan</option>
        </select>
      </label>

      <label class="field" style="min-width:180px">
        <span>Kategori</span>
        <select class="select" id="fKategori">
          <option value="">Semua Kategori</option>
          <optgroup label="Pengeluaran">
            <?php foreach ($kategoriKeluar as $k): ?>
              <option value="<?= e($k['id']) ?>"><?= e($k['ikon']) ?> <?= e($k['nama']) ?></option>
            <?php endforeach; ?>
          </optgroup>
          <optgroup label="Pemasukan">
            <?php foreach ($kategoriMasuk as $k): ?>
              <option value="<?= e($k['id']) ?>"><?= e($k['ikon']) ?> <?= e($k['nama']) ?></option>
            <?php endforeach; ?>
          </optgroup>
        </select>
      </label>

      <label class="field grow" style="min-width:220px">
        <span>Cari</span>
        <div class="input-ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
          </svg>
          <input type="text" class="input" id="fCari" placeholder="Cari keterangan atau kategori…">
        </div>
      </label>

      <button class="btn btn-ghost" id="fReset" style="margin-top:22px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.7L3 8"/><path d="M3 3v5h5"/>
        </svg>
        <span class="desk-only">Reset</span>
      </button>

      <button class="btn btn-primary" data-modal="modalTransaksi" style="margin-top:22px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span class="desk-only">Tambah Transaksi</span>
      </button>
    </div>
  </div>
</section>

<!-- ================= RINGKASAN FILTER ================= -->
<section class="grid g-4 fade-up d1">
  <div class="stat st-blue">
    <div class="stat-top">
      <div>
        <div class="stat-label">Jumlah Transaksi</div>
        <div class="stat-val sm" id="sumJumlah"><?= e($sumJumlah) ?></div>
      </div>
      <div class="stat-ico">🧾</div>
    </div>
    <div class="stat-foot">Sesuai filter aktif</div>
  </div>
  <div class="stat st-green">
    <div class="stat-top">
      <div>
        <div class="stat-label">Total Pemasukan</div>
        <div class="stat-val sm money-in" id="sumMasuk"><?= e(rupiah($sumMasuk)) ?></div>
      </div>
      <div class="stat-ico">📈</div>
    </div>
    <div class="stat-foot">Gaji &amp; pemasukan lain</div>
  </div>
  <div class="stat st-red">
    <div class="stat-top">
      <div>
        <div class="stat-label">Total Pengeluaran</div>
        <div class="stat-val sm money-out" id="sumKeluar"><?= e(rupiah($sumKeluar)) ?></div>
      </div>
      <div class="stat-ico">💸</div>
    </div>
    <div class="stat-foot">Semua pengeluaran</div>
  </div>
  <div class="stat st-gold">
    <div class="stat-top">
      <div>
        <div class="stat-label">Selisih</div>
        <div class="stat-val sm <?= $sumSelisih >= 0 ? 'money-in' : 'money-out' ?>" id="sumSelisih"><?= e(($sumSelisih >= 0 ? '+' : '-') . rupiah(abs($sumSelisih))) ?></div>
      </div>
      <div class="stat-ico">⚖️</div>
    </div>
    <div class="stat-foot">Pemasukan − Pengeluaran</div>
  </div>
</section>

<!-- ================= TABEL TRANSAKSI ================= -->
<section class="card fade-up d2">
  <div class="card-head">
    <div>
      <h2>Daftar Transaksi</h2>
      <p><?= e(periodeIndo($periode)) ?> &middot; klik ikon pensil untuk mengubah, tong sampah untuk menghapus</p>
    </div>
    <div class="spacer"></div>
    <a class="btn btn-ghost btn-sm" href="<?= e(baseUrl('print/rekap.php?periode=' . $periode)) ?>" target="_blank">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
        <path d="M6 14h12v8H6z"/>
      </svg>
      <span class="desk-only">Cetak</span>
    </a>
  </div>

  <!-- Tabel desktop -->
  <div class="table-wrap desk-only" id="trxWrap" <?= $sumJumlah === 0 ? 'hidden' : '' ?>>
    <table>
      <thead>
        <tr>
          <th style="width:130px">Tanggal</th>
          <th>Kategori &amp; Keterangan</th>
          <th style="width:100px">Jenis</th>
          <th class="t-right" style="width:170px">Nominal</th>
          <th class="t-right" style="width:96px">Aksi</th>
        </tr>
      </thead>
      <tbody id="trxBody">
        <?php foreach ($awal as $r):
            $masuk = $r['jenis'] === 'masuk';
            $w = $r['kategori_warna'] ?: '#6366f1'; ?>
          <tr>
            <td class="nowrap">
              <b class="tnum"><?= e(tanggalIndo($r['tanggal'], false)) ?></b>
              <div class="cat-sub"><?= e(metodeList()[$r['metode']] ?? $r['metode']) ?></div>
            </td>
            <td>
              <div class="cat-cell">
                <div class="cat-ico" style="--c-bg:<?= e(hexRgba($w, .16)) ?>;--c-line:<?= e(hexRgba($w, .42)) ?>">
                  <?= e($r['kategori_ikon'] ?: '📦') ?>
                </div>
                <div style="min-width:0">
                  <div class="cat-nm"><?= e($r['kategori_nama'] ?: 'Tanpa Kategori') ?></div>
                  <div class="cat-sub"><?= e($r['keterangan'] ?: '—') ?></div>
                </div>
              </div>
            </td>
            <td><span class="badge <?= $masuk ? 'badge-in' : 'badge-out' ?>"><?= $masuk ? 'Masuk' : 'Keluar' ?></span></td>
            <td class="t-right t-num nowrap">
              <span class="<?= $masuk ? 'money-in' : 'money-out' ?>"><?= $masuk ? '+' : '-' ?> <?= e(rupiah($r['nominal'])) ?></span>
            </td>
            <td class="t-right">
              <div class="row-acts">
                <button class="act e" data-trx="<?= (int) $r['id'] ?>" data-act="edit" title="Edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>
                  </svg>
                </button>
                <button class="act d" data-trx="<?= (int) $r['id'] ?>" data-act="hapus" title="Hapus">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

  <!-- List mobile -->
  <div class="card-body only-mobile" id="trxMobile">
    <?php foreach ($awal as $r):
        $masuk = $r['jenis'] === 'masuk';
        $w = $r['kategori_warna'] ?: '#6366f1'; ?>
      <div class="mitem">
        <div class="cat-ico" style="--c-bg:<?= e(hexRgba($w, .16)) ?>;--c-line:<?= e(hexRgba($w, .42)) ?>">
          <?= e($r['kategori_ikon'] ?: '📦') ?>
        </div>
        <div class="mitem-body">
          <b><?= e($r['kategori_nama'] ?: 'Tanpa Kategori') ?></b>
          <small><?= e(tanggalIndo($r['tanggal'])) ?> &middot; <?= e($r['keterangan'] ?: '—') ?></small>
        </div>
        <div class="mitem-amt">
          <b class="<?= $masuk ? 'money-in' : 'money-out' ?>"><?= $masuk ? '+' : '-' ?> <?= e(rupiah($r['nominal'])) ?></b>
          <small><?= e(metodeList()[$r['metode']] ?? $r['metode']) ?></small>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

  <!-- Kosong -->
  <div id="trxEmpty" class="empty" <?= $sumJumlah > 0 ? 'hidden' : '' ?>>
    <div class="empty-ico">🗒️</div>
    <h3>Belum ada transaksi</h3>
    <p>Belum ada transaksi yang cocok dengan filter saat ini. Coba ubah filter, atau catat transaksi baru.</p>
    <button class="btn btn-primary" data-modal="modalTransaksi">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      Catat Transaksi Pertama
    </button>
  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
