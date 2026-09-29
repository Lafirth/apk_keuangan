/**
 * Boot: sesi -> shell -> markup halaman -> app.js
 *
 * app.js (warisan dari versi PHP) mengikat elemen di saat IIFE-nya dijalankan,
 * jadi urutannya penting: markup halaman harus sudah ada sebelum app.js dimuat.
 * Karena itu app.js di-inject secara dinamis, bukan lewat <script> di index.html.
 */

import {
  shellHTML, opsiBulan, opsiKategori,
  bulanSekarang, periodeIndo,
} from './shell.js'

const VALID = ['dashboard', 'transaksi', 'kategori', 'rekap']

/** Halaman Extra yang butuh renderer sendiri, dimuat setelah app.js. */
const EXTRA = {
  kategori: ['/assets/js/kategori.js'],
  rekap: ['/assets/js/rekap.js', '/assets/js/csv.js'],
}

const params = new URLSearchParams(location.search)
const page = VALID.includes(params.get('page')) ? params.get('page') : 'dashboard'
const periodeFromUrl = /^\d{4}-\d{2}$/.test(params.get('periode') || '')
  ? params.get('periode')
  : bulanSekarang()

function keLogin() {
  // Cegah loop: halaman login sendiri tidak memanggil endpoint session.
  location.replace('/login.html')
}

function gagal(pesan) {
  document.getElementById('app').innerHTML = `
    <div class="empty" style="margin:80px auto;max-width:420px">
      <div class="empty-ico">⚠️</div>
      <h3>Gagal memuat aplikasi</h3>
      <p>${pesan}</p>
    </div>`
}

function muatScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = () => reject(new Error(`Gagal memuat ${src}`))
    document.body.appendChild(s)
  })
}

/** Sinkronkan semua tautan "cetak" dengan periode yang sedang dilihat. */
function setCetak(periode) {
  document.querySelectorAll('[data-periode-link]').forEach((a) => {
    a.href = `/cetak?periode=${encodeURIComponent(periode)}`
  })
}

async function mulai() {
  /* --------------------------------------------------------- data sesi */
  let sesi
  try {
    const res = await fetch('/api/session.php', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    if (res.status === 401) return keLogin()
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    sesi = await res.json()
    if (!sesi.success) throw new Error(sesi.message || 'Sesi tidak valid.')
  } catch (err) {
    if (err.message?.startsWith('HTTP')) throw err
    return gagal('Tidak dapat terhubung ke server. Coba muat ulang halaman.')
  }

  /* ------------------------------------------ window.APP untuk app.js */
  window.APP = {
    base: '',
    csrf: sesi.csrf,
    user: sesi.user,
    bulan: sesi.bulan || [],
    saldo: sesi.saldo || 0,
    kat: sesi.kategori || { masuk: [], keluar: [] },
  }

  /* ------------------------------------------------- shell + markup page */
  document.getElementById('app').innerHTML = shellHTML({
    page, user: sesi.user, saldo: sesi.saldo,
  })
  document.body.dataset.page = page
  document.title = `${document.querySelector('.page-head h1').textContent} · APK Keuangan`

  let markup
  try {
    const res = await fetch(`/pages/${page}.html`)
    if (!res.ok) throw new Error(String(res.status))
    markup = await res.text()
  } catch (err) {
    return gagal('Berkas halaman tidak ditemukan.')
  }
  document.getElementById('content').innerHTML = markup

  /* -------------------------------------- isi dropdown dari data sesi */
  if (page === 'dashboard') {
    // Opsi bulan berjalan selalu pertama dan ditandai "(berjalan)",
    // diikuti setiap bulan yang punya transaksi.
    const skrg = bulanSekarang()
    document.getElementById('dashPeriode').innerHTML =
      `<option value="${skrg}" selected>${periodeIndo(skrg)} (berjalan)</option>` +
      window.APP.bulan
        .filter((b) => b !== skrg)
        .map((b) => `<option value="${b}">${periodeIndo(b)}</option>`)
        .join('')
  }

  if (page === 'transaksi') {
    const sel = document.getElementById('fPeriode')
    sel.innerHTML = opsiBulan(window.APP.bulan, periodeFromUrl, { denganSemua: true })
    sel.dataset.awal = periodeFromUrl
    document.getElementById('fKategori').innerHTML = opsiKategori(window.APP.kat)
    document.getElementById('trxPeriodeLabel').textContent = periodeIndo(periodeFromUrl)
  }

  if (page === 'rekap') {
    document.getElementById('rekPeriode').innerHTML = opsiBulan(window.APP.bulan, periodeFromUrl)
  }

  setCetak(periodeFromUrl)

  /* ----------------------------------------------------- muat dependensi */
  if (page === 'dashboard') {
    await muatScript('/vendor/chart.umd.min.js')
  }
  await muatScript('/assets/js/app.js')
  for (const src of EXTRA[page] || []) {
    await muatScript(src)
  }

  /* ------------------------------------- renderer per halaman (jika ada) */
  if (typeof window.apkAfterMount === 'function') {
    window.apkAfterMount({ page, periodeFromUrl, setCetak })
  }
}

mulai().catch(() => gagal('Terjadi kesalahan tak terduga saat memuat aplikasi.'))
