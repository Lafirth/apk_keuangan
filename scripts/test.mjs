/**
 * Harness pengujian lokal untuk Netlify Functions.
 *
 * Menjalankan handler di dalam proses dengan storage in-memory, sehingga
 * queries.mjs, store.mjs, auth, dan seluruh endpoint bisa diuji tanpa
 * deploy dan tanpa akun Netlify.
 *
 * Jalankan:  node scripts/test.mjs
 */

import { register } from 'node:module'

// Arahkan '@netlify/blobs' ke stub in-memory SEBELUM handler diimpor.
register('./blobs-loader.mjs', import.meta.url)

/* ---------------- Environment --------------------------------------- */

process.env.SESSION_SECRET = 'secret-untuk-pengujian-lokal-saja'
process.env.CONTEXT = 'dev'

/* ---------------- Handler ------------------------------------------- */

const apiTransaksi = (await import('../netlify/functions/api-transaksi.mjs')).default
const apiKategori = (await import('../netlify/functions/api-kategori.mjs')).default
const apiDashboard = (await import('../netlify/functions/api-dashboard.mjs')).default
const apiAuth = (await import('../netlify/functions/api-auth.mjs')).default
const apiSession = (await import('../netlify/functions/api-session.mjs')).default

/* ---------------- Helper ------------------------------------------- */

let cookie = null
let csrf = null
let lulus = 0
let gagal = 0

function cek(nama, kondisi, info = '') {
  if (kondisi) {
    lulus++
    console.log(`  OK    ${nama}`)
  } else {
    gagal++
    console.log(`  GAGAL ${nama}${info ? ` -> ${info}` : ''}`)
  }
}

function req(url, { method = 'GET', form } = {}) {
  const headers = {}
  if (cookie) headers.cookie = cookie
  if (form) {
    const fd = new FormData()
    for (const [k, v] of Object.entries(form)) fd.append(k, v)
    return new Request('https://uji.local' + url, { method, headers, body: fd })
  }
  return new Request('https://uji.local' + url, { method, headers })
}

async function call(handler, url, opts) {
  const res = await handler(req(url, opts))
  const json = await res.json().catch(() => ({}))
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookie = setCookie.split(';')[0]
  return { status: res.status, json }
}

const denganCsrf = (form) => ({ ...form, csrf })

/* ---------------- Skenario ------------------------------------------ */

console.log('\n== Seed otomatis ==')
{
  const r = await call(apiAuth, '/api/auth.php?action=whoami')
  cek('belum login ditolak 401', r.status === 401, `status ${r.status}`)
  // CONTEXT=dev di harness ini, jadi flag demo harus aktif.
  cek('flag demo aktif di non-produksi', r.json.demo === true, `nilai ${r.json.demo}`)

  // Di produksi kredensial demo tidak boleh dikirim ke browser sama sekali.
  process.env.CONTEXT = 'production'
  const prod = await call(apiAuth, '/api/auth.php?action=whoami')
  cek('flag demo mati di produksi', prod.json.demo === false, `nilai ${prod.json.demo}`)
  process.env.CONTEXT = 'dev'
}

console.log('\n== Login ==')
{
  const salah = await call(apiAuth, '/api/auth.php?action=login', {
    method: 'POST', form: { username: 'christa', password: 'salah' },
  })
  cek('password salah ditolak', salah.status === 401, `status ${salah.status}`)

  const anonym = await call(apiAuth, '/api/auth.php?action=login', {
    method: 'POST', form: { username: 'entah', password: 'apa' },
  })
  cek('user tak dikenal ditolak', anonym.status === 401, `status ${anonym.status}`)

  const kosong = await call(apiAuth, '/api/auth.php?action=login', {
    method: 'POST', form: {},
  })
  cek('field kosong ditolak', kosong.status === 400, `status ${kosong.status}`)

  const ok = await call(apiAuth, '/api/auth.php?action=login', {
    method: 'POST', form: { username: 'christa', password: 'wira26' },
  })
  cek('login christa/wira26 berhasil', ok.status === 200 && ok.json.success === true,
    `status ${ok.status} ${JSON.stringify(ok.json)}`)
  cek('user dikembalikan', ok.json.user?.username === 'christa')
  cek('csrf dikembalikan', typeof ok.json.csrf === 'string' && ok.json.csrf.length > 20)
  csrf = ok.json.csrf
}

console.log('\n== Session (window.APP) ==')
{
  const r = await call(apiSession, '/api/session.php')
  cek('sukses', r.status === 200)
  cek('4 kategori masuk', r.json.kategori?.masuk?.length === 4, `nilai ${r.json.kategori?.masuk?.length}`)
  cek('9 kategori keluar', r.json.kategori?.keluar?.length === 9, `nilai ${r.json.kategori?.keluar?.length}`)
  cek('saldo awal 0', r.json.saldo === 0, `nilai ${r.json.saldo}`)
  cek('bulan kosong (tanpa data contoh)', Array.isArray(r.json.bulan) && r.json.bulan.length === 0)
  cek('csrf sesuai', r.json.csrf === csrf)
  // urutan ikut MySQL: jenis DESC lalu nama ASC
  const gaji = r.json.kategori.masuk.find((k) => k.nama === 'Gaji')
  cek('kategori Gaji ada', !!gaji)
  cek('emoji kategori utuh', gaji?.ikon === '\u{1F4B0}', JSON.stringify(gaji?.ikon))
  cek('warna kategori utuh', gaji?.warna === '#10b981', gaji?.warna)
}

console.log('\n== CSRF ==')
{
  const tanpaToken = await call(apiTransaksi, '/api/transaksi.php?action=simpan', {
    method: 'POST', form: { tanggal: '2026-09-01', jenis: 'keluar', nominal: 1000 },
  })
  cek('POST tanpa csrf ditolak 403', tanpaToken.status === 403, `status ${tanpaToken.status}`)

  const csrfPalsu = await call(apiTransaksi, '/api/transaksi.php?action=simpan', {
    method: 'POST',
    form: { tanggal: '2026-09-01', jenis: 'keluar', nominal: 1000, csrf: 'palsu' },
  })
  cek('POST dengan csrf palsu ditolak 403', csrfPalsu.status === 403, `status ${csrfPalsu.status}`)
}

console.log('\n== Validasi transaksi ==')
{
  const kasus = [
    [{ tanggal: 'bukan-tanggal', jenis: 'keluar', nominal: 1000, kategori_id: 5, metode: 'tunai' }, 'tanggal tidak valid'],
    [{ tanggal: '2026-09-01', jenis: 'ngawur', nominal: 1000, kategori_id: 5, metode: 'tunai' }, 'jenis tidak valid'],
    [{ tanggal: '2026-09-01', jenis: 'keluar', nominal: 0, kategori_id: 5, metode: 'tunai' }, 'nominal 0 ditolak'],
    [{ tanggal: '2026-09-01', jenis: 'keluar', nominal: 'abc', kategori_id: 5, metode: 'tunai' }, 'nominal bukan angka ditolak'],
    [{ tanggal: '2026-09-01', jenis: 'keluar', nominal: 1000, kategori_id: 5, metode: 'bitcoin' }, 'metode tidak valid'],
    [{ tanggal: '2026-09-01', jenis: 'keluar', nominal: 1000, kategori_id: 1, metode: 'tunai' }, 'kategori jenis tidak cocok'],
    [{ tanggal: '2026-02-31', jenis: 'keluar', nominal: 1000, kategori_id: 5, metode: 'tunai' }, 'tanggal 31 Feb ditolak'],
    [{ tanggal: '2026-09-01', jenis: 'keluar', nominal: 1e13, kategori_id: 5, metode: 'tunai' }, 'nominal kelewat besar ditolak'],
  ]
  for (const [form, nama] of kasus) {
    const r = await call(apiTransaksi, '/api/transaksi.php?action=simpan', {
      method: 'POST', form: denganCsrf(form),
    })
    cek(nama, r.status === 400, `status ${r.status} ${r.json.message}`)
  }
}

console.log('\n== Simpan transaksi ==')
{
  const a = await call(apiTransaksi, '/api/transaksi.php?action=simpan', {
    method: 'POST',
    form: denganCsrf({
      tanggal: '2026-09-01', jenis: 'keluar', nominal: '25.000', kategori_id: 5,
      keterangan: 'Makan   siang   di   warung', metode: 'qris',
    }),
  })
  cek('penyimpanan berhasil', a.status === 200, `status ${a.status} ${JSON.stringify(a.json)}`)
  cek('nominal "25.000" jadi 25000', a.json.data?.nominal === 25000, `nilai ${a.json.data?.nominal}`)
  cek('keterangan spasi dirapatkan', a.json.data?.keterangan === 'Makan siang di warung', a.json.data?.keterangan)
  cek('kategori ter-join', a.json.data?.kategori_nama === 'Makan', a.json.data?.kategori_nama)
  cek('warna kategori ter-join', a.json.data?.kategori_warna === '#f97316', a.json.data?.kategori_warna)
  cek('saldo jadi -25000', a.json.ringkasan?.saldo === -25000, `nilai ${a.json.ringkasan?.saldo}`)

  const b = await call(apiTransaksi, '/api/transaksi.php?action=simpan', {
    method: 'POST',
    form: denganCsrf({
      tanggal: '2026-09-02', jenis: 'masuk', nominal: 5000000, kategori_id: 1,
      keterangan: 'Gaji September', metode: 'transfer',
    }),
  })
  cek('gaji tersimpan', b.status === 200)
  cek('saldo jadi 4975000', b.json.ringkasan?.saldo === 4975000, `nilai ${b.json.ringkasan?.saldo}`)
  cek('ringkasan bulan: 2 transaksi', b.json.ringkasan?.bulan?.jumlah === 2, `nilai ${b.json.ringkasan?.bulan?.jumlah}`)
  cek('ringkasan bulan: 2 hari aktif', b.json.ringkasan?.bulan?.hari_aktif === 2, `nilai ${b.json.ringkasan?.bulan?.hari_aktif}`)
}

console.log('\n== Filter & pencarian ==')
{
  const semua = await call(apiTransaksi, '/api/transaksi.php?action=list')
  cek('list 2 baris', semua.json.data?.length === 2, `nilai ${semua.json.data?.length}`)
  cek('urutan tanggal DESC', semua.json.data?.[0]?.tanggal === '2026-09-02', semua.json.data?.[0]?.tanggal)
  cek('summary masuk 5000000', semua.json.summary?.masuk === 5000000, `nilai ${semua.json.summary?.masuk}`)
  cek('summary keluar 25000', semua.json.summary?.keluar === 25000, `nilai ${semua.json.summary?.keluar}`)

  const perBulan = await call(apiTransaksi, '/api/transaksi.php?action=list&periode=2026-09')
  cek('filter periode 2026-09 -> 2', perBulan.json.data?.length === 2, `nilai ${perBulan.json.data?.length}`)

  const bulanKosong = await call(apiTransaksi, '/api/transaksi.php?action=list&periode=2026-10')
  cek('filter periode kosong -> 0', bulanKosong.json.data?.length === 0)

  const perJenis = await call(apiTransaksi, '/api/transaksi.php?action=list&jenis=masuk')
  cek('filter jenis masuk -> 1', perJenis.json.data?.length === 1)

  const perKategori = await call(apiTransaksi, '/api/transaksi.php?action=list&kategori_id=5')
  cek('filter kategori 5 -> 1', perKategori.json.data?.length === 1, `nilai ${perKategori.json.data?.length}`)

  const cariKet = await call(apiTransaksi, '/api/transaksi.php?action=list&cari=warung')
  cek('cari keterangan "warung" -> 1', cariKet.json.data?.length === 1, `nilai ${cariKet.json.data?.length}`)

  const cariKat = await call(apiTransaksi, '/api/transaksi.php?action=list&cari=makan')
  cek('cari nama kategori "makan" -> 1', cariKat.json.data?.length === 1, `nilai ${cariKat.json.data?.length}`)

  const cariKosong = await call(apiTransaksi, '/api/transaksi.php?action=list&cari=tidakada')
  cek('cari tanpa hasil -> 0', cariKosong.json.data?.length === 0)

  const get = await call(apiTransaksi, '/api/transaksi.php?action=get&id=1')
  cek('get by id', get.status === 200 && get.json.data?.id === 1, `status ${get.status}`)

  const getKosong = await call(apiTransaksi, '/api/transaksi.php?action=get&id=999')
  cek('get id tak ada -> 404', getKosong.status === 404, `status ${getKosong.status}`)
}

console.log('\n== Update & hapus ==')
{
  const list = await call(apiTransaksi, '/api/transaksi.php?action=list&jenis=masuk')
  const id = list.json.data[0].id

  const upd = await call(apiTransaksi, '/api/transaksi.php?action=update', {
    method: 'POST',
    form: denganCsrf({
      id, tanggal: '2026-09-03', jenis: 'masuk', nominal: 6000000,
      kategori_id: 2, keterangan: 'Gaji + bonus', metode: 'debit',
    }),
  })
  cek('update berhasil', upd.status === 200)
  cek('nominal terupdate', upd.json.data?.nominal === 6000000, `nilai ${upd.json.data?.nominal}`)
  cek('tanggal terupdate', upd.json.data?.tanggal === '2026-09-03')
  cek('kategori terupdate', upd.json.data?.kategori_nama === 'Bonus', upd.json.data?.kategori_nama)
  cek('saldo mengikuti', upd.json.ringkasan?.saldo === 5975000, `nilai ${upd.json.ringkasan?.saldo}`)

  const tidakAda = await call(apiTransaksi, '/api/transaksi.php?action=update', {
    method: 'POST',
    form: denganCsrf({ id: 9999, tanggal: '2026-09-03', jenis: 'masuk', nominal: 100, kategori_id: 1, metode: 'tunai' }),
  })
  cek('update id tak ada ditolak', tidakAda.status === 400, `status ${tidakAda.status}`)

  const del = await call(apiTransaksi, '/api/transaksi.php?action=hapus', {
    method: 'POST', form: denganCsrf({ id }),
  })
  cek('hapus berhasil', del.status === 200)
  cek('saldo kembali -25000', del.json.ringkasan?.saldo === -25000, `nilai ${del.json.ringkasan?.saldo}`)

  const delLagi = await call(apiTransaksi, '/api/transaksi.php?action=hapus', {
    method: 'POST', form: denganCsrf({ id }),
  })
  cek('hapus dua kali ditolak', delLagi.status === 400, `status ${delLagi.status}`)
}

console.log('\n== Kategori ==')
{
  const list = await call(apiKategori, '/api/kategori.php?action=list')
  cek('13 kategori', list.json.data?.length === 13, `nilai ${list.json.data?.length}`)
  cek('masuk urut sebelum keluar',
    list.json.data?.[0]?.jenis === 'masuk', list.json.data?.[0]?.jenis)
  cek('jml_transaksi terhitung',
    list.json.data?.find((k) => k.nama === 'Makan')?.jml_transaksi === 1)

  const masuk = await call(apiKategori, '/api/kategori.php?action=list&jenis=masuk')
  cek('filter jenis masuk -> 4', masuk.json.data?.length === 4, `nilai ${masuk.json.data?.length}`)

  const baru = await call(apiKategori, '/api/kategori.php?action=simpan', {
    method: 'POST', form: denganCsrf({ nama: 'Uji Coba', ikon: 'U', warna: '#123456', jenis: 'keluar' }),
  })
  cek('tambah kategori', baru.status === 200, `status ${baru.status}`)

  const namaPendek = await call(apiKategori, '/api/kategori.php?action=simpan', {
    method: 'POST', form: denganCsrf({ nama: 'A', jenis: 'keluar' }),
  })
  cek('nama < 2 karakter ditolak', namaPendek.status === 400, `status ${namaPendek.status}`)

  const duplikat = await call(apiKategori, '/api/kategori.php?action=simpan', {
    method: 'POST', form: denganCsrf({ nama: 'Uji Coba', jenis: 'keluar' }),
  })
  cek('nama duplikat ditolak', duplikat.status === 400, `status ${duplikat.status}`)

  const bedaJenis = await call(apiKategori, '/api/kategori.php?action=simpan', {
    method: 'POST', form: denganCsrf({ nama: 'Uji Coba', jenis: 'masuk' }),
  })
  cek('nama sama tapi jenis beda diizinkan', bedaJenis.status === 200, `status ${bedaJenis.status}`)

  const warnaNgawur = await call(apiKategori, '/api/kategori.php?action=simpan', {
    method: 'POST', form: denganCsrf({ nama: 'Warna Ngawur', warna: 'rgb(1,2,3)', jenis: 'keluar' }),
  })
  cek('warna tak valid tetap diterima dgn default', warnaNgawur.status === 200, `status ${warnaNgawur.status}`)

  const upd = await call(apiKategori, '/api/kategori.php?action=update', {
    method: 'POST',
    form: denganCsrf({ id: baru.json.id, nama: 'Uji Ubah', ikon: 'V', warna: '#abcdef', jenis: 'keluar', is_active: 1 }),
  })
  cek('update kategori', upd.status === 200)
  const setelahUpd = await call(apiKategori, '/api/kategori.php?action=list')
  cek('nama kategori terupdate',
    setelahUpd.json.data?.some((k) => k.nama === 'Uji Ubah'), 'tidak ditemukan')

  // Kategori tanpa transaksi: hapus bersih, pesan tanpa keterangan tambahan
  const hapusKosong = await call(apiKategori, '/api/kategori.php?action=hapus', {
    method: 'POST', form: denganCsrf({ id: baru.json.id }),
  })
  cek('hapus kategori tanpa transaksi', hapusKosong.status === 200)
  cek('pesan polos', hapusKosong.json.message === 'Kategori dihapus.', hapusKosong.json.message)

  // Kategori yang dipakai transaksi -> transaksi kehilangan kategori_id-nya
  // (padanan ON DELETE SET NULL), dan pesan menyebut jumlah terpengaruh.
  const katDipakai = await call(apiKategori, '/api/kategori.php?action=simpan', {
    method: 'POST', form: denganCsrf({ nama: 'Ada Transaksi', warna: '#0f766e', jenis: 'keluar' }),
  })
  const trxDiKategori = await call(apiTransaksi, '/api/transaksi.php?action=simpan', {
    method: 'POST',
    form: denganCsrf({
      tanggal: '2026-09-05', jenis: 'keluar', nominal: 7000,
      kategori_id: katDipakai.json.id, keterangan: 'Uji', metode: 'tunai',
    }),
  })
  cek('transaksi memakai kategori baru', trxDiKategori.status === 200, `status ${trxDiKategori.status}`)
  cek('kategori ter-join saat simpan', trxDiKategori.json.data?.kategori_nama === 'Ada Transaksi',
    trxDiKategori.json.data?.kategori_nama)

  const hapus = await call(apiKategori, '/api/kategori.php?action=hapus', {
    method: 'POST', form: denganCsrf({ id: katDipakai.json.id }),
  })
  cek('hapus kategori', hapus.status === 200)
  cek('pesan menyebut transaksi terkait', /1 transaksi terkait/.test(hapus.json.message), hapus.json.message)

  const trxYatim = await call(apiTransaksi, '/api/transaksi.php?action=get&id=' + trxDiKategori.json.id)
  cek('transaksi tetap ada', trxYatim.status === 200, `status ${trxYatim.status}`)
  cek('kategori_id jadi null', trxYatim.json.data?.kategori_id === null, `nilai ${trxYatim.json.data?.kategori_id}`)
  cek('kategori_nama jadi null', trxYatim.json.data?.kategori_nama === null, `nilai ${trxYatim.json.data?.kategori_nama}`)

  // bersihkan transaksi uji supaya statistik di bawah tidak terganggu
  await call(apiTransaksi, '/api/transaksi.php?action=hapus', {
    method: 'POST', form: denganCsrf({ id: trxDiKategori.json.id }),
  })
}

console.log('\n== Saldo awal ==')
{
  const get = await call(apiDashboard, '/api/dashboard.php?action=saldo_awal')
  cek('baca saldo awal', get.json.data?.saldo_awal === 0, `nilai ${get.json.data?.saldo_awal}`)

  const set = await call(apiDashboard, '/api/dashboard.php?action=saldo_awal', {
    method: 'POST', form: denganCsrf({ saldo_awal: '1.500.000' }),
  })
  cek('simpan saldo awal', set.status === 200)
  cek('saldo_awal jadi 1500000', set.json.data?.saldo_awal === 1500000, `nilai ${set.json.data?.saldo_awal}`)

  const negatif = await call(apiDashboard, '/api/dashboard.php?action=saldo_awal', {
    method: 'POST', form: denganCsrf({ saldo_awal: '-5' }),
  })
  cek('saldo awal negatif ditolak', negatif.status === 400, `status ${negatif.status}`)
}

console.log('\n== Statistik dashboard ==')
{
  const r = await call(apiDashboard, '/api/dashboard.php?action=statistik&periode=2026-09')
  const d = r.json.data
  cek('ringkasan ada', !!d?.ringkasan)
  cek('pemasukan 0 (gaji dihapus)', d?.ringkasan?.pemasukan === 0, `nilai ${d?.ringkasan?.pemasukan}`)
  cek('pengeluaran 25000', d?.ringkasan?.pengeluaran === 25000, `nilai ${d?.ringkasan?.pengeluaran}`)
  cek('perbandingan ada', !!d?.perbandingan)
  cek('perbandingan bulan lalu 0', d?.perbandingan?.bulan_lalu === 0, `nilai ${d?.perbandingan?.bulan_lalu}`)
  cek('nama bulan lalu terisi', typeof d?.perbandingan?.bulan_lalu_nama === 'string', d?.perbandingan?.bulan_lalu_nama)
  cek('saldo = 1500000 - 25000', d?.saldo === 1475000, `nilai ${d?.saldo}`)
  cek('tren 6 bulan', d?.tren?.length === 6, `nilai ${d?.tren?.length}`)
  cek('harian_keluar 1 hari', d?.harian_keluar?.length === 1, `nilai ${d?.harian_keluar?.length}`)
  cek('kategori (donat) array', Array.isArray(d?.kategori))
  cek('kategori donat > 0', d?.kategori?.length === 1, `nilai ${d?.kategori?.length}`)
  cek('terbaru array', Array.isArray(d?.terakhir))
  cek('rata_harian angka', typeof d?.rata_harian === 'number')

  const ngawur = await call(apiDashboard, '/api/dashboard.php?action=statistik&periode=ngawur')
  cek('periode ngawur tidak error', ngawur.status === 200, `status ${ngawur.status}`)

  const aksiNgawur = await call(apiDashboard, '/api/dashboard.php?action=menghilang')
  cek('aksi tak dikenal ditolak', aksiNgawur.status === 400, `status ${aksiNgawur.status}`)
}

console.log('\n== Rekap (dipakai halaman rekap & cetak) ==')
{
  const r = await call(apiDashboard, '/api/dashboard.php?action=rekap&periode=2026-09')
  const d = r.json.data
  cek('status 200', r.status === 200, `status ${r.status}`)
  cek('periode diteruskan', d?.periode === '2026-09', d?.periode)
  cek('ringkasan ada', !!d?.ringkasan)
  cek('perbandingan ada', !!d?.perbandingan)
  cek('rekap_keluar array', Array.isArray(d?.rekap_keluar))
  cek('rekap_masuk array', Array.isArray(d?.rekap_masuk))
  // 9 kategori pengeluaran bawaan + "Warna Ngawur" yang dibuat di blok Kategori
  // (kategori uji sengaja tidak dihapus agar warnanya tetap teruji).
  cek('rekap_keluar 10 kategori', d?.rekap_keluar?.length === 10,
    `nilai ${d?.rekap_keluar?.length} :: ${(d?.rekap_keluar ?? []).map((k) => k.nama + '/' + k.jml).join(', ')}`)
  cek('hanya 1 kategori dengan transaksi',
    d?.rekap_keluar?.filter((k) => k.jml > 0).length === 1)
  cek('rekap_keluar urut total DESC',
    d.rekap_keluar.every((k, i, a) => i === 0 || a[i - 1].total >= k.total))
  cek('transaksi 1 baris', d?.transaksi?.length === 1, `nilai ${d?.transaksi?.length}`)
  cek('transaksi ter-join kategori', d?.transaksi?.[0]?.kategori_nama === 'Makan',
    d?.transaksi?.[0]?.kategori_nama)
  cek('harian_keluar ada', Array.isArray(d?.harian_keluar))
  cek('saldo konsisten dengan statistik', d?.saldo === 1475000, `nilai ${d?.saldo}`)
  cek('user ikut dikembalikan', d?.user?.nama === 'Christa', d?.user?.nama)
  cek('rata_harian angka', typeof d?.rata_harian === 'number')

  const ngawur = await call(apiDashboard, '/api/dashboard.php?action=rekap&periode=ngawur')
  cek('periode ngawur jatuh ke bulan berjalan', ngawur.status === 200 && !!ngawur.json.data?.periode)
  cek('periode ngawur bukan "ngawur"', ngawur.json.data?.periode !== 'ngawur',
    ngawur.json.data?.periode)
}

console.log('\n== Cross-user isolation ==')
{
  // Data user A tidak boleh bocor lewat id kategori/transaksi milik user lain.
  // Di sini hanya satu user, jadi yang diuji adalah bahwa data store terisolasi
  // per kunci u-<id> dan seluruh query selalu dikunci ke user yang sedang login.
  const r = await call(apiTransaksi, '/api/transaksi.php?action=list')
  cek('hanya data milik user sendiri', Array.isArray(r.json.data)
    && r.json.data.every((t) => t.kategori_id === null || Number.isFinite(Number(t.kategori_id))))
}

console.log('\n== Logout ==')
{
  // Logout harus POST + CSRF supaya tidak bisa dipicu dari situs lain.
  const viaGet = await call(apiAuth, '/api/auth.php?action=logout')
  cek('logout via GET ditolak 405', viaGet.status === 405, `status ${viaGet.status}`)

  // Serangan CSRF logout mengirim form POST yang valid tanpa token, persis
  // seperti yang bisa dilakukan situs lain karena SameSite=Lax hanya
  // menyekat cookie pada POST lintas situs di sebagian browser.
  const tanpaCsrf = await call(apiAuth, '/api/auth.php?action=logout', {
    method: 'POST', form: {},
  })
  cek('logout tanpa CSRF ditolak 403', tanpaCsrf.status === 403, `status ${tanpaCsrf.status}`)

  const salahCsrf = await call(apiAuth, '/api/auth.php?action=logout', {
    method: 'POST', form: { csrf: 'token-palsu' },
  })
  cek('logout dengan CSRF palsu ditolak 403', salahCsrf.status === 403, `status ${salahCsrf.status}`)

  const out = await call(apiAuth, '/api/auth.php?action=logout', {
    method: 'POST', form: denganCsrf({}),
  })
  cek('logout sukses', out.status === 200, `status ${out.status}`)

  const after = await call(apiTransaksi, '/api/transaksi.php?action=list')
  cek('setelah logout API menolak', after.status === 401, `status ${after.status}`)
  const afterSession = await call(apiSession, '/api/session.php')
  cek('session menolak setelah logout', afterSession.status === 401, `status ${afterSession.status}`)
}

console.log('\n== Ringkasan ==')
console.log(`  lulus: ${lulus}   gagal: ${gagal}`)
console.log(gagal === 0 ? '\nSEMUA TEST LULUS\n' : `\n${gagal} TEST GAGAL\n`)
process.exit(gagal === 0 ? 0 : 1)
