<?php
/** Halaman Kategori */
$keluar = kategoriWithJumlah('keluar');
$masuk  = kategoriWithJumlah('masuk');
$jmlKeluar = count($keluar);
$jmlMasuk  = count($masuk);

require __DIR__ . '/../includes/header.php';
?>

<section class="grid g-3 fade-up">
  <div class="stat st-red">
    <div class="stat-top">
      <div>
        <div class="stat-label">Kategori Pengeluaran</div>
        <div class="stat-val sm"><?= e($jmlKeluar) ?> kategori</div>
      </div>
      <div class="stat-ico">💸</div>
    </div>
    <div class="stat-foot">Tersedia untuk mengelompokkan pengeluaran harian</div>
  </div>
  <div class="stat st-green">
    <div class="stat-top">
      <div>
        <div class="stat-label">Kategori Pemasukan</div>
        <div class="stat-val sm"><?= e($jmlMasuk) ?> kategori</div>
      </div>
      <div class="stat-ico">📈</div>
    </div>
    <div class="stat-foot">Untuk gaji, bonus, usaha, dan pemasukan lain</div>
  </div>
  <div class="stat st-blue">
    <div class="stat-top">
      <div>
        <div class="stat-label">Total Kategori</div>
        <div class="stat-val sm"><?= e($jmlKeluar + $jmlMasuk) ?> kategori</div>
      </div>
      <div class="stat-ico">🏷️</div>
    </div>
    <div class="stat-foot">Jumlah seluruh kategori yang aktif</div>
  </div>
</section>

<?php
/** Kartu kategori */
function renderKategori(array $list, string $jenis): void
{
    if (!$list) {
        echo '<div class="empty" style="padding:34px"><div class="empty-ico">🏷️</div>'
           . '<h3>Belum ada kategori</h3><p>Tambahkan kategori agar pencatatan lebih rapi.</p></div>';
        return;
    }
    echo '<div class="kat-grid">';
    foreach ($list as $k) {
        $w = $k['warna'];
        $icon = htmlspecialchars($k['ikon'], ENT_QUOTES, 'UTF-8');
        $nama = htmlspecialchars($k['nama'], ENT_QUOTES, 'UTF-8');
        $obj  = htmlspecialchars(json_encode($k, JSON_UNESCAPED_UNICODE), ENT_QUOTES, 'UTF-8');
        echo '<div class="kat-card" data-kat-row data-obj=\'' . $obj . '\''
           . ' style="--c:' . htmlspecialchars($w, ENT_QUOTES, 'UTF-8')
           . ';--c-line:' . $w . '33;--c-bg:' . $w . '1a">'
           . '<div class="kat-top">'
           .   '<div class="cat-ico">' . $icon . '</div>'
           .   '<div><h4 class="cat-nm">' . $nama . '</h4>'
           .   '<small>' . (int) $k['jml_transaksi'] . ' transaksi</small></div>'
           . '</div>'
           . '<div class="kat-foot">'
           .   '<span class="badge ' . ($jenis === 'masuk' ? 'badge-in' : 'badge-out') . '">'
           .     ($jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran') . '</span>'
           .   '<div class="row-acts">'
           .     '<button class="act e" data-kat="' . (int) $k['id'] . '" data-kat-act="edit" title="Edit">'
           .       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
           .       '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>'
           .     '<button class="act d" data-kat="' . (int) $k['id'] . '" data-kat-act="hapus" title="Hapus">'
           .       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
           .       '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"/>'
           .       '<path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>'
           .   '</div>'
           . '</div></div>';
    }
    echo '</div>';
}
?>

<!-- ================= PENGELUARAN ================= -->
<section class="card fade-up d1">
  <div class="card-head">
    <div>
      <h2>Kategori Pengeluaran</h2>
      <p>Untuk mengelompokkan setiap pengeluaran harianmu</p>
    </div>
    <div class="spacer"></div>
    <button class="btn btn-primary btn-sm" data-new-kategori>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      Tambah Kategori
    </button>
  </div>
  <div class="card-body">
    <?php renderKategori($keluar, 'keluar'); ?>
  </div>
</section>

<!-- ================= PEMASUKAN ================= -->
<section class="card fade-up d2">
  <div class="card-head">
    <div>
      <h2>Kategori Pemasukan</h2>
      <p>Untuk gaji dan pemasukan lainnya</p>
    </div>
    <div class="spacer"></div>
    <button class="btn btn-success btn-sm" data-new-kategori>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      Tambah Kategori
    </button>
  </div>
  <div class="card-body">
    <?php renderKategori($masuk, 'masuk'); ?>
  </div>
</section>

<!-- ================= MODAL KATEGORI ================= -->
<div class="modal" id="modalKategori" hidden>
  <div class="modal-backdrop" data-close></div>
  <div class="modal-box">
    <div class="modal-head">
      <h3 id="katJudulModal">Tambah Kategori</h3>
      <button class="icon-btn" data-close aria-label="Tutup">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <form id="formKategori" class="modal-body" autocomplete="off">
      <input type="hidden" name="id" id="katId" value="">

      <div class="form-grid">
        <label class="field span-2">
          <span>Nama Kategori</span>
          <input type="text" class="input" name="nama" id="katNama"
                 maxlength="50" placeholder="Contoh: Transport, Baju, Langganan" required>
        </label>

        <label class="field span-2">
          <span>Jenis</span>
          <select class="select" name="jenis" id="katJenis">
            <option value="keluar">Pengeluaran</option>
            <option value="masuk">Pemasukan</option>
          </select>
        </label>

        <div class="field span-2">
          <span>Pilih Ikon</span>
          <div class="emoji-pick" id="emojiPick"></div>
          <input type="hidden" name="ikon" id="katIkon" value="🏷️">
        </div>

        <div class="field span-2">
          <span>Pilih Warna</span>
          <div class="color-pick" id="warnaPick"></div>
          <input type="hidden" name="warna" id="katWarna" value="#6366f1">
        </div>
      </div>

      <div class="modal-foot">
        <div></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-close>Batal</button>
          <button type="submit" class="btn btn-primary" id="katSubmit">
            <span class="btn-text">Simpan Kategori
            </span>
          </button>
        </div>
      </div>
    </form>
  </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
