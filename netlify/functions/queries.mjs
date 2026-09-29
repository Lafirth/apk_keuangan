/**
 * Model - pengganti seluruh query database di php/includes/model.php
 *
 * Di versi PHP semua operasi ini adalah query SQL. Karena Netlify Blobs
 * menyimpan JSON per pengguna, Heimdall-equivalent-nya di sini adalah
 * filter/reducer di atas array. Volume data untuk satu pengguna dezenas
 * ribu baris, jadi ini jauh lebih cepat daripada panggilan jaringan.
 *
 * Setiap fungsi menerima `data` (hasil readData) sehingga tidak ada
 * akses storage di dalam lapisan ini - semuanya murni, mudah diuji.
 *
 * Kontrak sengaja meniru model.php:
 *   - urutan hasil mengikuti ORDER BY yang sama
 *   - JOIN kategori pada transaksi tetap menghasilkan
 *     kategori_nama / kategori_ikon / kategori_warna
 *   - LEFT JOIN pada rekapKategori tetap memunculkan kategori tanpa transaksi
 */

const HARI_INI = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const PERIODE_DARI_TANGGAL = (tanggal) => String(tanggal || '').slice(0, 7)

/** rounded-half-away-from-zero, sama seperti round() bawaan PHP */
export function round(n, presisi = 0) {
  const f = 10 ** presisi
  const x = Number(n) || 0
  return Math.sign(x) * Math.round(Math.abs(x) * f) / f
}

const BULAN_INDO = [null, 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

/** "2026-09" -> "September 2026" (padanan periodeIndo) */
export function periodeIndo(periode) {
  const [y, m] = String(periode || '').split('-')
  return `${BULAN_INDO[Number(m)] || '-'} ${y || ''}`
}

/** "2026-09" -> "2026-08" */
export function periodeSebelumnya(periode) {
  const [y, m] = String(periode).split('-').map(Number)
  const d = new Date(y, m - 1 - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "2026-09" -> "2026-10" */
export function periodeBerikutnya(periode) {
  const [y, m] = String(periode).split('-').map(Number)
  const d = new Date(y, m - 1 + 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** month offset dari bulan berjalan: 0 = bulan ini, -1 = bulan lalu */
function periodeRelatif(offset) {
  const d = new Date()
  const target = new Date(d.getFullYear(), d.getMonth() + offset, 1)
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`
}

/* ================================================================== */
/*  KATEGORI                                                          */
/* ================================================================== */

/** ORDER BY jenis DESC, nama ASC -> "masuk" mendahului "keluar" */
function urutKategori(a, b) {
  if (a.jenis !== b.jenis) return a.jenis === 'masuk' ? -1 : 1
  return a.nama.localeCompare(b.nama, 'id')
}

export function kategoriAll(data, jenis = null, aktifSaja = true) {
  return data.kategori
    .filter((k) => (!jenis || k.jenis === jenis) && (!aktifSaja || k.is_active === 1))
    .slice()
    .sort(urutKategori)
}

export function kategoriById(data, id) {
  return data.kategori.find((k) => Number(k.id) === Number(id)) ?? null
}

export function kategoriByNama(data, nama, jenis) {
  return data.kategori.find((k) => k.nama === nama && k.jenis === jenis) ?? null
}

/** Hitung jumlah transaksi per kategori */
export function kategoriWithJumlah(data, jenis = null) {
  return kategoriAll(data, jenis, true)
    .map((k) => ({
      ...k,
      jml_transaksi: data.transaksi.filter((t) => Number(t.kategori_id) === Number(k.id)).length,
    }))
}

/** Nama kategori sudah dipakai pada jenis yang sama? (exclude id tertentu) */
export function namaKategoriBentrok(data, nama, jenis, excludeId = 0) {
  return data.kategori.some(
    (k) => k.nama === nama && k.jenis === jenis && Number(k.id) !== Number(excludeId),
  )
}

export function kategoriSimpan(data, row) {
  data.seq.kategori = Number(data.seq.kategori || 0) + 1
  const kat = {
    id: data.seq.kategori,
    nama: row.nama,
    ikon: row.ikon || '🏷️',
    warna: row.warna || '#6366f1',
    jenis: row.jenis,
    is_active: row.is_active ?? 1,
  }
  data.kategori.push(kat)
  return kat.id
}

export function kategoriUpdate(data, id, row) {
  const kat = kategoriById(data, id)
  if (!kat) return false
  Object.assign(kat, {
    nama: row.nama,
    ikon: row.ikon,
    warna: row.warna,
    jenis: row.jenis,
    is_active: row.is_active,
  })
  return true
}

/**
 * Hapus kategori. Transaksi terkait kehilangan kategori_id-nya
 * (padanan ON DELETE SET NULL di skema SQL).
 * @returns {number} jumlah transaksi yang ikut kehilangan kategori
 */
export function kategoriHapus(data, id) {
  const i = data.kategori.findIndex((k) => Number(k.id) === Number(id))
  if (i === -1) return 0

  data.kategori.splice(i, 1)

  let terpengaruh = 0
  for (const t of data.transaksi) {
    if (Number(t.kategori_id) === Number(id)) {
      t.kategori_id = null
      terpengaruh++
    }
  }
  return terpengaruh
}

/* ================================================================== */
/*  TRANSAKSI                                                         */
/* ================================================================== */

/** Samakan bentuk baris transaksi dengan hasil SELECT t.*, k.* FROM ... */
function decorate(data, t) {
  const kat = t.kategori_id ? kategoriById(data, t.kategori_id) : null
  return {
    ...t,
    nominal: Number(t.nominal),
    kategori_id: t.kategori_id ?? null,
    kategori_nama: kat ? kat.nama : null,
    kategori_ikon: kat ? kat.ikon : null,
    kategori_warna: kat ? kat.warna : null,
  }
}

const BULAN_RE = /^\d{4}-\d{2}$/

/**
 * Daftar transaksi dengan filter.
 * @param {object} data
 * @param {{periode?: string, jenis?: string, kategori_id?: string|number, cari?: string}} filter
 */
export function transaksiList(data, filter = {}) {
  const { periode = '', jenis = '', kategori_id: kategoriId = '', cari = '' } = filter
  const cariLower = String(cari || '').toLowerCase()

  const rows = data.transaksi.filter((t) => {
    if (periode && PERIODE_DARI_TANGGAL(t.tanggal) !== periode) return false
    if (jenis && t.jenis !== jenis) return false
    if (kategoriId !== '' && Number(t.kategori_id) !== Number(kategoriId)) return false

    if (cariLower) {
      const diKeterangan = String(t.keterangan || '').toLowerCase().includes(cariLower)
      const kat = t.kategori_id ? kategoriById(data, t.kategori_id) : null
      const diKategori = kat ? kat.nama.toLowerCase().includes(cariLower) : false
      if (!diKeterangan && !diKategori) return false
    }

    return true
  })

  // ORDER BY tanggal DESC, id DESC
  rows.sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? 1 : -1
    return Number(b.id) - Number(a.id)
  })

  return rows.map((t) => decorate(data, t))
}

export function transaksiById(data, id) {
  const t = data.transaksi.find((x) => Number(x.id) === Number(id))
  return t ? decorate(data, t) : null
}

export function transaksiSimpan(data, row) {
  data.seq.transaksi = Number(data.seq.transaksi || 0) + 1
  const trx = {
    id: data.seq.transaksi,
    tanggal: row.tanggal,
    jenis: row.jenis,
    kategori_id: row.kategori_id || null,
    nominal: Number(row.nominal),
    keterangan: row.keterangan ?? null,
    metode: row.metode,
    created_at: new Date().toISOString(),
  }
  data.transaksi.push(trx)
  return trx.id
}

export function transaksiUpdate(data, id, row) {
  const trx = data.transaksi.find((x) => Number(x.id) === Number(id))
  if (!trx) return false
  Object.assign(trx, {
    tanggal: row.tanggal,
    jenis: row.jenis,
    kategori_id: row.kategori_id || null,
    nominal: Number(row.nominal),
    keterangan: row.keterangan ?? null,
    metode: row.metode,
  })
  return true
}

export function transaksiHapus(data, id) {
  const i = data.transaksi.findIndex((x) => Number(x.id) === Number(id))
  if (i === -1) return false
  data.transaksi.splice(i, 1)
  return true
}

/* ================================================================== */
/*  RINGKASAN & DASHBOARD                                              */
/* ================================================================== */

function transaksiPeriode(data, periode, jenis, kategoriId = 0) {
  return data.transaksi.filter((t) => {
    if (t.jenis !== jenis) return false
    if (PERIODE_DARI_TANGGAL(t.tanggal) !== periode) return false
    if (kategoriId && Number(t.kategori_id) !== Number(kategoriId)) return false
    return true
  })
}

/** Total satu jenis dalam satu periode */
export function totalJenis(data, periode, jenis, extra = {}) {
  return transaksiPeriode(data, periode, jenis, extra.kategori_id || 0)
    .reduce((s, t) => s + Number(t.nominal), 0)
}

export function saldoAwal(data) {
  return Number(data.pengaturan?.saldo_awal ?? 0) || 0
}

export function saldoSekarang(data) {
  let saldo = saldoAwal(data)
  for (const t of data.transaksi) {
    saldo += t.jenis === 'masuk' ? Number(t.nominal) : -Number(t.nominal)
  }
  return saldo
}

export function saldoAwalSet(data, nilai) {
  data.pengaturan = { ...(data.pengaturan || {}), saldo_awal: String(nilai) }
}

/** Ringkasan satu bulan */
export function ringkasanBulan(data, periode) {
  const pemasukan = totalJenis(data, periode, 'masuk')
  const pengeluaran = totalJenis(data, periode, 'keluar')

  const bulanIni = data.transaksi.filter((t) => PERIODE_DARI_TANGGAL(t.tanggal) === periode)
  const hariAktif = new Set(bulanIni.map((t) => t.tanggal)).size

  return {
    periode,
    pemasukan,
    pengeluaran,
    sisa: pemasukan - pengeluaran,
    jumlah: bulanIni.length,
    hari_aktif: hariAktif,
    persen: pemasukan > 0 ? round((pengeluaran / pemasukan) * 100, 1) : 0,
  }
}

/** Pengeluaran harian dalam satu bulan (grafik batang) */
export function harianKeluar(data, periode) {
  return harianPerJenis(data, periode, 'keluar')
}

/** Pemasukan harian dalam satu bulan */
export function harianMasuk(data, periode) {
  return harianPerJenis(data, periode, 'masuk')
}

function harianPerJenis(data, periode, jenis) {
  const perTanggal = new Map()
  for (const t of transaksiPeriode(data, periode, jenis)) {
    perTanggal.set(t.tanggal, (perTanggal.get(t.tanggal) || 0) + Number(t.nominal))
  }
  return [...perTanggal.entries()]
    .map(([tanggal, total]) => ({ tanggal, total }))
    .sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1))
}

/**
 * Rekap per kategori dalam satu bulan.
 * Kategori tanpa transaksi pun tetap muncul (jml 0, total 0), sama
 * seperti LEFT JOIN di SQL aslinya.
 */
export function rekapKategori(data, periode, jenis = 'keluar') {
  const perKategori = new Map()
  for (const t of transaksiPeriode(data, periode, jenis)) {
    const key = t.kategori_id ?? 'null'
    if (!perKategori.has(key)) perKategori.set(key, { jml: 0, total: 0 })
    const agg = perKategori.get(key)
    agg.jml += 1
    agg.total += Number(t.nominal)
  }

  const rows = kategoriAll(data, jenis, true).map((k) => {
    const agg = perKategori.get(k.id) ?? { jml: 0, total: 0 }
    return { id: k.id, nama: k.nama, ikon: k.ikon, warna: k.warna, jml: agg.jml, total: agg.total }
  })

  // ORDER BY total DESC, nama ASC
  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return a.nama.localeCompare(b.nama, 'id')
  })

  return rows
}

/** Rata-rata belanja harian */
export function rataHarian(data, periode) {
  const r = ringkasanBulan(data, periode)
  return r.hari_aktif > 0 ? r.pengeluaran / r.hari_aktif : 0
}

/** Total pengeluaran bulan ini vs bulan lalu */
export function perbandinganBulan(data, periode) {
  const bulanIni = totalJenis(data, periode, 'keluar')
  const bulanLalu = periodeSebelumnya(periode)
  const sebelumnya = totalJenis(data, bulanLalu, 'keluar')

  const selisih = bulanIni - sebelumnya
  const persen = sebelumnya > 0 ? round((selisih / sebelumnya) * 100, 1) : 0

  return {
    bulan_ini: bulanIni,
    bulan_lalu: sebelumnya,
    bulan_lalu_nama: periodeIndo(bulanLalu),
    selisih,
    persen,
  }
}

/**
 * N bulan terakhir untuk grafik tren, dengan bulan kosong diisi nol.
 * Dijangkarkan ke bulan berjalan, sama seperti versi PHP.
 */
export function trenBulan(data, jumlah = 6) {
  const agregat = new Map()
  for (const t of data.transaksi) {
    const p = PERIODE_DARI_TANGGAL(t.tanggal)
    if (!BULAN_RE.test(p)) continue
    if (!agregat.has(p)) agregat.set(p, { periode: p, pemasukan: 0, pengeluaran: 0 })
    const row = agregat.get(p)
    if (t.jenis === 'masuk') row.pemasukan += Number(t.nominal)
    else row.pengeluaran += Number(t.nominal)
  }

  const hasil = []
  for (let i = jumlah - 1; i >= 0; i--) {
    const p = periodeRelatif(-i)
    hasil.push(agregat.get(p) ?? { periode: p, pemasukan: 0, pengeluaran: 0 })
  }
  return hasil
}

/** Daftar bulan yang punya transaksi (untuk dropdown), terbaru dulu */
export function daftarBulanAda(data) {
  const set = new Set()
  for (const t of data.transaksi) {
    const p = PERIODE_DARI_TANGGAL(t.tanggal)
    if (BULAN_RE.test(p)) set.add(p)
  }
  return [...set].sort((a, b) => (a < b ? 1 : -1))
}

/** Total transaksi untuk satu hari tertentu (dipakai kartu "hari ini") */
export function totalHariIni(data, jenis) {
  const hari = HARI_INI()
  return data.transaksi
    .filter((t) => t.tanggal === hari && t.jenis === jenis)
    .reduce((s, t) => s + Number(t.nominal), 0)
}

/** 7 transaksi terbaru */
export function transaksiTerbaru(data, jumlah = 7) {
  return transaksiList(data).slice(0, jumlah)
}

export { BULAN_INDO, PERIODE_DARI_TANGGAL, BULAN_RE }
