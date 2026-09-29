/**
 * Export rekap + transaksi bulanan ke CSV.
 *
 * Padanan php/print/export.php, tapi dibangun sepenuhnya di klien memakai data
 * yang sudah diambil /api/dashboard.php?action=rekap - jadi tidak perlu
 * endpoint terpisah dan tidak perlu unduhan kedua.
 *
 * Pemisah ';' dan BOM UTF-8 dipertahankan agar Excel di Indonesia langsung
 * membuka kolomnya dengan benar.
 */

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = [null, 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const METODE = { tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', debit: 'Debit' }

function periodeIndo(p) {
  const [y, m] = String(p || '').split('-')
  return `${BULAN[Number(m)] || '-'} ${y || ''}`
}

/** "2026-09-01" -> "01/09/2026" */
function tglSlash(iso) {
  const [y, m, d] = String(iso).split('-')
  return `${d}/${m}/${y}`
}

/** "2026-09-01" -> "Selasa, 1 September 2026" */
function tglIndo(iso) {
  const [y, m, d] = String(iso).split('-')
  const hari = HARI[new Date(Number(y), Number(m) - 1, Number(d)).getDay()]
  return `${hari}, ${Number(d)} ${BULAN[Number(m)]} ${y}`
}

function angkaCsv(n) {
  return Number(n || 0).toLocaleString('id-ID', {
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  })
}

/**
 * Escape satu sel CSV.
 * Pemisah ';' jadi koma agar angka "1.234,56" tidak pecah jadi dua kolom.
 */
function sel(v) {
  let s = String(v ?? '')
  if (typeof v === 'number' || /^[\d.,-]+$/.test(s)) s = s.replace(/;/g, '.')
  return `"${s.replace(/"/g, '""')}"`
}

function baris(...cols) {
  return cols.map(sel).join(';')
}

function now() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} `
       + `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function bangun(d, periode) {
  const r = d.ringkasan
  const totalKeluar = r.pengeluaran || 1
  const totalMasuk = r.pemasukan || 1
  const out = []

  out.push(baris(`LAPORAN KEUANGAN BULANAN - ${periodeIndo(periode).toUpperCase()}`))
  out.push(baris('Nama', d.user.nama))
  out.push(baris('Username', d.user.username))
  out.push(baris('Periode', periodeIndo(periode)))
  out.push(baris('Dicetak pada', now()))
  out.push('')

  out.push(baris('=== RINGKASAN ==='))
  out.push(baris('Keterangan', 'Nilai (Rp)'))
  out.push(baris('Total Pemasukan', angkaCsv(r.pemasukan)))
  out.push(baris('Total Pengeluaran', angkaCsv(r.pengeluaran)))
  out.push(baris('Sisa Bulan Ini', angkaCsv(r.sisa)))
  out.push(baris('Rata-rata Pengeluaran / Hari', angkaCsv(d.rata_harian)))
  out.push(baris('Jumlah Transaksi', r.jumlah))
  out.push(baris('Hari Aktif', r.hari_aktif))
  out.push(baris('Rasio Pengeluaran (%)', String(r.persen).replace('.', ',')))
  out.push(baris('Saldo Tersedia (saat ini)', angkaCsv(d.saldo)))
  out.push('')

  const seksi = (judul, list, total, jumlahTotal) => {
    out.push(baris(`=== REKAP ${judul} PER KATEGORI ===`))
    out.push(baris('No', 'Kategori', 'Jumlah Transaksi', 'Persentase (%)', 'Total (Rp)'))
    let no = 0
    for (const k of list) {
      const t = Number(k.total)
      if (t <= 0) continue
      no++
      out.push(baris(no, k.nama, k.jml, (t / total * 100).toFixed(1).replace('.', ','), angkaCsv(t)))
    }
    out.push(baris('', `TOTAL ${judul}`, '', '', angkaCsv(jumlahTotal)))
    out.push('')
  }

  seksi('PENGELUARAN', d.rekap_keluar, totalKeluar, r.pengeluaran)
  seksi('PEMASUKAN', d.rekap_masuk, totalMasuk, r.pemasukan)

  out.push(baris('=== RINCIAN TRANSAKSI HARIAN ==='))
  out.push(baris('No', 'Tanggal', 'Hari', 'Jenis', 'Kategori', 'Nominal (Rp)', 'Metode', 'Keterangan'))
  let no = 0
  for (const t of d.transaksi) {
    no++
    out.push(baris(
      no,
      tglSlash(t.tanggal),
      tglIndo(t.tanggal),
      t.jenis === 'masuk' ? 'Masuk' : 'Keluar',
      t.kategori_nama || 'Tanpa Kategori',
      angkaCsv(t.nominal),
      METODE[t.metode] || t.metode,
      t.keterangan || '',
    ))
  }
  out.push('')
  out.push(baris('', 'TOTAL PEMASUKAN', '', '', '', angkaCsv(r.pemasukan)))
  out.push(baris('', 'TOTAL PENGELUARAN', '', '', '', angkaCsv(r.pengeluaran)))
  out.push(baris('', 'SELISIH', '', '', '', angkaCsv(r.sisa)))

  return out.join('\r\n')
}

window.apkExportCsv = function apkExportCsv(d, periode) {
  const teks = '\uFEFF' + bangun(d, periode)
  const blob = new Blob([teks], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `rekap-keuangan-${periode}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
  window.apkToast('CSV berhasil diunduh.', 'ok')
}
