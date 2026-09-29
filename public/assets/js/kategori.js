/**
 * Halaman kategori: merender kartu kategori dari /api/session.php.
 *
 * Di versi PHP kartu ini dirender server-side dan setiap mutasi berakhir dengan
 * location.reload(). Di sini semua mutasi menggambar ulang daftar, jadi kategori
 * baru langsung terlihat tanpa memuat ulang halaman.
 *
 * event listener (emoji/warna/modal/form) tetap milik app.js.
 */

function esc(s) {
  const d = document.createElement('div')
  d.textContent = s ?? ''
  return d.innerHTML
}

function kartu(k, jenis) {
  return `
  <div class="kat-card" data-kat-row data-id="${k.id}"
       style="--c:${esc(k.warna)};--c-line:${esc(k.warna)}33;--c-bg:${esc(k.warna)}1a">
    <div class="kat-top">
      <div class="cat-ico">${esc(k.ikon)}</div>
      <div>
        <h4 class="cat-nm">${esc(k.nama)}</h4>
        <small>${k.jml_transaksi} transaksi</small>
      </div>
    </div>
    <div class="kat-foot">
      <span class="badge ${jenis === 'masuk' ? 'badge-in' : 'badge-out'}">
        ${jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran'}</span>
      <div class="row-acts">
        <button class="act e" data-kat="${k.id}" data-kat-act="edit" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
        <button class="act d" data-kat="${k.id}" data-kat-act="hapus" title="Hapus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>
      </div>
    </div>
  </div>`
}

function kosong(pesan) {
  return `<div class="empty" style="padding:34px">
    <div class="empty-ico">🏷️</div>
    <h3>Belum ada kategori</h3>
    <p>${pesan}</p>
  </div>`
}

function render() {
  const { kat } = window.APP
  const keluar = kat.keluar || []
  const masuk = kat.masuk || []

  document.getElementById('katGridKeluar').innerHTML =
    keluar.length ? `<div class="kat-grid">${keluar.map((k) => kartu(k, 'keluar')).join('')}</div>`
      : kosong('Tambahkan kategori agar pencatatan lebih rapi.')
  document.getElementById('katGridMasuk').innerHTML =
    masuk.length ? `<div class="kat-grid">${masuk.map((k) => kartu(k, 'masuk')).join('')}</div>`
      : kosong('Tambahkan kategori agar pencatatan lebih rapi.')

  document.getElementById('katJmlKeluar').textContent = `${keluar.length} kategori`
  document.getElementById('katJmlMasuk').textContent = `${masuk.length} kategori`
  document.getElementById('katJmlTotal').textContent = `${keluar.length + masuk.length} kategori`
}

/** Muat ulang daftar kategori (dan saldo) dari server. */
async function muatUlang() {
  try {
    const res = await fetch('/api/session.php', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    if (!res.ok) return
    const sesi = await res.json()
    if (!sesi.success) return

    window.APP.kat = sesi.kategori
    window.APP.bulan = sesi.bulan
    window.APP.saldo = sesi.saldo

    const side = document.getElementById('sideSaldo')
    if (side) {
      const v = Math.round(Number(sesi.saldo) || 0)
      side.textContent = 'Rp ' + new Intl.NumberFormat('id-ID').format(v)
    }

    render()
  } catch (err) {
    window.apkToast('Gagal memperbarui daftar kategori.', 'err')
  }
}

window.apkAfterMount = function apkAfterMountKategori() {
  render()
  window.apkAfterMutasi = muatUlang
}
