/**
 * Pemeriksa sinkronisasi dua versi: `php/` (XAMPP) vs `public/` + `netlify/`.
 *
 * Aplikasi ini punya dua implementasi dengan perilaku yang harus sama.
 * CSS memang identik, sedangkan app.js sengaja berbeda (checkout SPA vs
 * halaman server-rendered), jadi yang diperiksa adalah:
 *
 *   1. file yang WAJIB identik byte-per-byte,
 *   2. daftar action tiap endpoint API yang WAJIB sama,
 *   3. perbaikan/perilaku yang WAJIB ada di kedua salinan app.js,
 *      supaya fix bug tidak cuma mendarat di satu versi (bug toISOString
 *      WIB dulu kejadian begini).
 *
 * Jalankan: npm run check-sync
 * Keluar dengan kode 1 kalau ada yang tidak sinkron, 0 kalau aman.
 */

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const masalah = []
const lulus = []

const baca = (rel) => readFileSync(path.join(AKAR, rel), 'utf8')
const sha = (teks) => createHash('sha256').update(teks).digest('hex')

/* ------------------------------------------------------------------ */
/*  1. File yang wajib identik byte-per-byte                          */
/* ------------------------------------------------------------------ */

const IDENTIK = [
  ['assets/css/style.css', 'CSS satu-satunya file yang harus benar-benar identik'],
]

for (const [rel, alasan] of IDENTIK) {
  const a = `php/${rel}`
  const b = `public/${rel}`
  const ha = sha(baca(a))
  const hb = sha(baca(b))

  if (ha === hb) {
    lulus.push(`identik: ${rel} (${ha.slice(0, 12)})`)
  } else {
    masalah.push(
      `${rel} BERBEDA antar versi - ${alasan}.\n` +
      `      php/${rel}    sha256 ${ha}\n` +
      `      public/${rel} sha256 ${hb}`
    )
  }
}

/* ------------------------------------------------------------------ */
/*  2. Paritas action API                                             */
/* ------------------------------------------------------------------ */

/** Ambil nama action dari `case '...':` di dalam switch, baik PHP maupun JS. */
function daftarAction(teks) {
  const hasil = new Set()
  const re = /case\s+'([a-z_]+)'\s*:/g
  let m
  while ((m = re.exec(teks)) !== null) hasil.add(m[1])
  return [...hasil].sort()
}

/**
 * api-auth.mjs tidak punya pasangan PHP: di versi PHP login/logout adalah
 * handler form (login.php / logout.php), bukan endpoint JSON.
 */
const PASANGAN_API = ['dashboard', 'kategori', 'transaksi']

for (const nama of PASANGAN_API) {
  const aksiPhp = daftarAction(baca(`php/api/${nama}.php`))
  const aksiJs = daftarAction(baca(`netlify/functions/api-${nama}.mjs`))

  const hanyaPhp = aksiPhp.filter((x) => !aksiJs.includes(x))
  const hanyaJs = aksiJs.filter((x) => !aksiPhp.includes(x))

  if (!hanyaPhp.length && !hanyaJs.length) {
    lulus.push(`paritas /api/${nama}.php: ${aksiPhp.join(', ')}`)
  } else {
    const baris = ['kontrak API berbeda di /api/' + nama + '.php:']
    if (hanyaPhp.length) baris.push(`      hanya di PHP    : ${hanyaPhp.join(', ')}`)
    if (hanyaJs.length) baris.push(`      hanya di Netlify: ${hanyaJs.join(', ')}`)
    masalah.push(baris.join('\n'))
  }
}

/* ------------------------------------------------------------------ */
/*  3. Perilaku yang wajib ada di kedua app.js                        */
/* ------------------------------------------------------------------ */

const APP_PHP = 'php/assets/js/app.js'
const APP_JS = 'public/assets/js/app.js'

const WAJIB_APP = [
  {
    pola: /function\s+hariIni\s*\(/,
    pesan: 'helper hariIni() (fix tanggal WIB: toISOString() memakai UTC)',
  },
  {
    pola: /trx\s*\?\s*trx\.tanggal\s*:\s*hariIni\(\)/,
    pesan: 'default tanggal transaksi memakai hariIni(), bukan toISOString()',
  },
]

for (const { pola, pesan } of WAJIB_APP) {
  const adaPhp = pola.test(baca(APP_PHP))
  const adaJs = pola.test(baca(APP_JS))

  if (adaPhp && adaJs) {
    lulus.push(`app.js: ${pesan}`)
  } else {
    masalah.push(
      `app.js kehilangan ${pesan}\n` +
      `      php/assets/js/app.js    : ${adaPhp ? 'ada' : 'TIDAK ADA'}\n` +
      `      public/assets/js/app.js : ${adaJs ? 'ada' : 'TIDAK ADA'}`
    )
  }
}

/* ------------------------------------------------------------------ */
/*  Laporan                                                           */
/* ------------------------------------------------------------------ */

console.log('== check-sync: sinkronisasi php/ <-> public/ + netlify/ ==\n')
for (const l of lulus) console.log(`  OK    ${l}`)

if (masalah.length) {
  console.log('')
  for (const m of masalah) console.log(`  GAGAL ${m}`)
  console.log(`\n${masalah.length} masalah sinkronisasi ditemukan.`)
  process.exit(1)
}

console.log(`\nSinkron: ${lulus.length} pemeriksaan lulus.`)
