/**
 * Shell aplikasi: sidebar, topbar, dan modal global.
 *
 * Di versi PHP semua ini dirender oleh php/includes/header.php + footer.php.
 * Di versi Netlify tidak ada server-side HTML, jadi shell dibangun di sini
 * dari data yang dikembalikan /api/session.php.
 */

export const MENU = [
  { page: 'dashboard', label: 'Dashboard', judul: 'Dashboard', sub: 'Ringkasan keuanganmu hari ini', icon: 'grid' },
  { page: 'transaksi', label: 'Transaksi', judul: 'Transaksi Harian', sub: 'Catat & kelola setiap pemasukan dan pengeluaran', icon: 'repeat' },
  { page: 'kategori', label: 'Kategori', judul: 'Kategori', sub: 'Kelola kategori pemasukan & pengeluaran', icon: 'tag' },
  { page: 'rekap', label: 'Rekap Bulanan', judul: 'Rekap Bulanan', sub: 'Rincian lengkap pengeluaran per bulan', icon: 'chart' },
]

const nfID = new Intl.NumberFormat('id-ID')

export function rupiahRingkas(n) {
  const v = Math.round(Number(n) || 0)
  const a = Math.abs(v)
  const tanda = v < 0 ? '-' : ''
  if (a >= 1e12) return `${tanda}Rp ${(a / 1e12).toFixed(1).replace('.', ',')} T`
  if (a >= 1e9) return `${tanda}Rp ${(a / 1e9).toFixed(1).replace('.', ',')} M`
  if (a >= 1e6) return `${tanda}Rp ${Math.round(a / 1e6)} jt`
  if (a >= 1e3) return `${tanda}Rp ${nfID.format(a)}`
  return `${tanda}Rp 0`
}

const ICON = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>',
  tag: '<path d="M20.6 13.4L12 22l-9-9V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="1"/><rect x="12" y="8" width="3" height="10" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/>',
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

/** Opsi <option> untuk dropdown bulan. */
export function opsiBulan(bulan, terpilih, { denganSemua = false, labelSemua = 'Semua Bulan' } = {}) {
  const skrg = bulanSekarang()
  const out = []
  if (denganSemua) out.push(`<option value="">${esc(labelSemua)}</option>`)
  out.push(
    `<option value="${skrg}"${terpilih === skrg ? ' selected' : ''}>Bulan Ini (${esc(periodeIndo(skrg))})</option>`,
  )
  for (const b of bulan) {
    if (b === skrg) continue
    out.push(`<option value="${b}"${terpilih === b ? ' selected' : ''}>${esc(periodeIndo(b))}</option>`)
  }
  // pastikan periode yang diminta selalu punya opsi (mis. setelah mutasi)
  if (terpilih && !out.some((o) => o.includes(`value="${terpilih}"`))) {
    out.push(`<option value="${terpilih}" selected>${esc(periodeIndo(terpilih))}</option>`)
  }
  return out.join('')
}

/** Opsi <option> ber-<optgroup> untuk dropdown kategori. */
export function opsiKategori(kat) {
  const grup = (label, list) => {
    if (!list.length) return ''
    const inner = list
      .map((k) => `<option value="${k.id}">${esc(k.ikon)} ${esc(k.nama)}</option>`)
      .join('')
    return `<optgroup label="${label}">${inner}</optgroup>`
  }
  return (
    '<option value="">Semua Kategori</option>' +
    grup('Pengeluaran', kat.keluar || []) +
    grup('Pemasukan', kat.masuk || [])
  )
}

export function shellHTML({ page, user, saldo }) {
  const aktif = MENU.find((m) => m.page === page) ?? MENU[0]
  const inisial = (user.nama || user.username || '?').trim().charAt(0).toUpperCase()

  const nav = MENU.map((m) => `
        <a href="/${m.page}" class="nav-item ${m.page === page ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
               stroke-linecap="round" stroke-linejoin="round">${ICON[m.icon]}</svg>
          <span>${esc(m.label)}</span>
        </a>`).join('')

  return `
<div class="shell">
  <aside class="sidebar" id="sidebar">
    <div class="brand">
      <div class="brand-logo">💰</div>
      <div class="brand-text">
        <strong>APK Keuangan</strong>
        <small>Keuangan Harian</small>
      </div>
    </div>

    <nav class="nav">
      <p class="nav-label">MENU</p>
      ${nav}

      <p class="nav-label">SALDO SAWA</p>
      <div class="side-balance">
        <small>Saldo Tersisa</small>
        <strong id="sideSaldo">${esc(rupiahRingkas(saldo))}</strong>
      </div>
    </nav>

    <div class="side-foot">
      <div class="side-user">
        <div class="avatar">${esc(inisial)}</div>
        <div>
          <strong>${esc(user.nama)}</strong>
          <small>@${esc(user.username)}</small>
        </div>
      </div>
      <a class="side-logout" href="/logout" title="Keluar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>
        </svg>
      </a>
    </div>
  </aside>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>

  <main class="main">
    <header class="topbar">
      <button class="icon-btn burger" id="burger" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M3 6h18M3 12h18M3 18h18"/>
        </svg>
      </button>
      <div class="page-head">
        <h1>${esc(aktif.judul)}</h1>
        <p>${esc(aktif.sub)}</p>
      </div>
      <div class="topbar-right">
        <div class="today" id="jamHidup">—</div>
        <button class="btn btn-primary" data-modal="modalTransaksi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>Transaksi Baru</span>
        </button>
      </div>
    </header>

    <div class="content" id="content"></div>
  </main>
</div>

<div class="toast-wrap" id="toastWrap"></div>
${modalTransaksiHTML()}
${modalKonfirmasiHTML()}
${modalSaldoHTML()}
`
}

function modalTransaksiHTML() {
  const metode = [
    ['tunai', 'Tunai'],
    ['transfer', 'Transfer'],
    ['qris', 'QRIS'],
    ['debit', 'Debit'],
  ]
  return `
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
            <input type="text" name="nominal" id="trxNominal" inputmode="numeric" placeholder="0" required>
          </div>
        </label>

        <label class="field">
          <span>Kategori</span>
          <select name="kategori_id" id="trxKategori" required></select>
        </label>

        <label class="field">
          <span>Metode</span>
          <select name="metode" id="trxMetode">
            ${metode.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}
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
          ${[10000, 25000, 50000, 100000]
            .map((q) => `<button type="button" class="chip" data-money="${q}">${nfID.format(q / 1000)}rb</button>`)
            .join('')}
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
`
}

function modalKonfirmasiHTML() {
  return `
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
`
}

function modalSaldoHTML() {
  return `
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
`
}

/* ---------------------------------------------------------------- utils */

export function bulanSekarang() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function tanggalSekarang() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const BULAN = [null, 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function periodeIndo(periode) {
  const [y, m] = String(periode || '').split('-')
  return `${BULAN[Number(m)] || '-'} ${y || ''}`
}

export function periodeSebelumnya(periode) {
  const [y, m] = String(periode).split('-').map(Number)
  const d = new Date(y, m - 1 - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function periodeBerikutnya(periode) {
  const [y, m] = String(periode).split('-').map(Number)
  const d = new Date(y, m - 1 + 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function hariDalamBulan(periode) {
  const [y, m] = String(periode).split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
