<?php
/** Layout footer + modal transaksi global */
$kategoriMasuk  = kategoriAll('masuk');
$kategoriKeluar = kategoriAll('keluar');
?>
    </div><!-- /.content -->
  </main>
</div><!-- /.shell -->

<!-- ================= MODAL TRANSAKSI ================= -->
<div class="modal" id="modalTransaksi" hidden>
  <div class="modal-backdrop" data-close></div>
  <div class="modal-box">
    <div class="modal-head">
      <h3 id="modalTitle">Tambah Transaksi</h3>
      <button class="icon-btn" data-close aria-label="Tutup">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <form id="formTransaksi" class="modal-body" autocomplete="off">
      <input type="hidden" name="id" id="trxId" value="">

      <div class="seg" id="segJenis">
        <button type="button" class="seg-btn active" data-jenis="keluar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 5v14M19 12H5"/>
          </svg> Pengeluaran
        </button>
        <button type="button" class="seg-btn" data-jenis="masuk">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 19V5M5 12h14"/>
          </svg> Pemasukan / Gaji
        </button>
      </div>
      <input type="hidden" name="jenis" id="trxJenis" value="keluar">

      <div class="form-grid">
        <label class="field">
          <span>Tanggal</span>
          <input type="date" name="tanggal" id="trxTanggal" required>
        </label>

        <label class="field">
          <span>Nominal (Rp)</span>
          <div class="input-money">
            <b>Rp</b>
            <input type="text" name="nominal" id="trxNominal" inputmode="numeric"
                   placeholder="0" required>
          </div>
        </label>

        <label class="field">
          <span>Kategori</span>
          <select name="kategori_id" id="trxKategori" required></select>
        </label>

        <label class="field">
          <span>Metode</span>
          <select name="metode" id="trxMetode">
            <?php foreach (metodeList() as $val => $label): ?>
              <option value="<?= e($val) ?>"><?= e($label) ?></option>
            <?php endforeach; ?>
          </select>
        </label>

        <label class="field span-2">
          <span>Keterangan</span>
          <input type="text" name="keterangan" id="trxKeterangan"
                 maxlength="255" placeholder="Contoh: Makan siang, Belanja bulanan, Gaji September">
        </label>
      </div>

      <div class="modal-foot">
        <div class="quick-amount">
          <span>Cepat:</span>
          <?php foreach ([10000, 25000, 50000, 100000] as $q): ?>
            <button type="button" class="chip" data-money="<?= $q ?>"><?= number_format($q / 1000) ?>rb</button>
          <?php endforeach; ?>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-close>Batal</button>
          <button type="submit" class="btn btn-primary" id="trxSubmit">
            <span class="btn-text">Simpan</span>
          </button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- ================= MODAL KONFIRMASI ================= -->
<div class="modal" id="modalKonfirmasi" hidden>
  <div class="modal-backdrop" data-close></div>
  <div class="modal-box modal-sm">
    <div class="confirm-icon">⚠️</div>
    <h3 id="konfirmTitle">Hapus data?</h3>
    <p id="konfirmPesan">Tindakan ini tidak dapat dibatalkan.</p>
    <div class="modal-actions center">
      <button class="btn btn-ghost" data-close>Batal</button>
      <button class="btn btn-danger" id="konfirmYa">Ya, Hapus</button>
    </div>
  </div>
</div>

<!-- ================= MODAL SALDO AWAL ================= -->
<div class="modal" id="modalSaldo" hidden>
  <div class="modal-backdrop" data-close></div>
  <div class="modal-box modal-sm">
    <div class="confirm-icon" style="filter:grayscale(.2)">🏦</div>
    <h3>Atur Saldo Awal</h3>
    <p style="margin-bottom:18px">
      Saldo awal adalah uang yang sudah kamu punya <b>sebelum</b> mulai memakai aplikasi ini
      (misalnya sisa uang di dompet atau bank).
    </p>
    <form id="formSaldo" autocomplete="off">
      <label class="field">
        <span>Nilai Saldo Awal</span>
        <div class="input-money">
          <b>Rp</b>
          <input type="text" name="saldo_awal" id="saldoAwalInput" inputmode="numeric" placeholder="0">
        </div>
      </label>
      <div class="modal-actions center">
        <button type="button" class="btn btn-ghost" data-close>Batal</button>
        <button type="submit" class="btn btn-success" id="saldoSubmit">Simpan</button>
      </div>
    </form>
  </div>
</div>

<div class="toast-wrap" id="toastWrap"></div>
<script>
  window.APP = {
    base:  <?= json_encode(baseUrl()) ?>,
    csrf:  <?= json_encode(csrfToken()) ?>,
    kat: {
      masuk:  <?= json_encode($kategoriMasuk,  JSON_UNESCAPED_UNICODE) ?>,
      keluar: <?= json_encode($kategoriKeluar, JSON_UNESCAPED_UNICODE) ?>
    }
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script src="<?= e(baseUrl('assets/js/app.js')) ?>"></script>
</body>
</html>
