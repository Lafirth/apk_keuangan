/**
 * Lapisan data - Netlify Blobs
 *
 * Dua store:
 *   keuangan-users : key = username (lowercase) -> data pengguna
 *   keuangan-data  : key = u-<id>                -> seluruh data keuangan pengguna
 *
 * Semua pembacaan memakai `consistency: 'strong'` supaya data yang baru
 * disimpan langsung terlihat pada permintaan berikutnya (model aslinya
 * memakai MySQL yang juga strong consistency). Tanpa ini, penghapusan
 * transaksi bisa terlihat masih ada sampai 60 detik.
 *
 * Penulisan memakai ETag (`onlyIfMatch`) sebagai optimistic locking supaya
 * dua tab yang menyimpan bersamaan tidak saling menimpa.
 */

import { getStore } from '@netlify/blobs'

export const STORE_USERS = 'keuangan-users'
export const STORE_DATA = 'keuangan-data'

/** Kunci penanda sudah di-seed. Dipakai `onlyIfNew` supaya bebas balapan. */
const SEED_FLAG = '__seeded__'

const storeOptions = { consistency: 'strong' }

export function usersStore() {
  return getStore(STORE_USERS, storeOptions)
}

export function dataStore() {
  return getStore(STORE_DATA, storeOptions)
}

/* ------------------------------------------------------------------ */
/*  Seed                                                              */
/* ------------------------------------------------------------------ */

export async function isSeeded() {
  const entry = await usersStore().getWithMetadata(SEED_FLAG)
  return entry !== null
}

/**
 * Jalankan seed HANYA jika belum ada. `onlyIfNew: true` membuat penulisan
 * bersifat atomik: kalau dua request arrive bersamaan, tepat satu yang
 * menang dan yang lain menerima `modified: false`.
 *
 * @param {() => Promise<{users: object[], data: object[]}>} build
 */
export async function seedOnce(build) {
  const store = usersStore()

  if (await store.getWithMetadata(SEED_FLAG)) return { seeded: false, reason: 'sudah ada' }

  const { users, data } = await build()

  // Tulis data pengguna dulu, baru penanda. Kalau proses mati di tengah,
  // seed akan dicoba lagi dan menimpa dengan data yang sama (idempoten).
  for (const user of users) {
    await store.setJSON(user.username.toLowerCase(), user)
  }
  for (const entry of data) {
    await dataStore().setJSON(entry.key, entry.value)
  }

  const { modified } = await store.setJSON(SEED_FLAG, {
    at: new Date().toISOString(),
    version: 1,
  }, { onlyIfNew: true })

  return { seeded: modified, reason: modified ? 'baru dibuat' : 'dikunci request lain' }
}

/* ------------------------------------------------------------------ */
/*  Pengguna                                                          */
/* ------------------------------------------------------------------ */

export async function findUser(username) {
  if (!username) return null
  const user = await usersStore().get(username.toLowerCase(), { type: 'json' })
  return user ?? null
}

export async function getUserById(id) {
  // store ini kecil (jumlah pengguna sedikit), jadi linear scan lebih murah
  // daripada menambah indeks kedua.
  const { blobs } = await usersStore().list()
  const keys = blobs.map((b) => b.key).filter((k) => k !== SEED_FLAG)
  if (keys.length === 0) return null

  const store = usersStore()
  const users = await Promise.all(keys.map((k) => store.get(k, { type: 'json' })))
  return users.find((u) => u && Number(u.id) === Number(id)) ?? null
}

export async function saveUser(user) {
  await usersStore().setJSON(user.username.toLowerCase(), user)
  return user
}

/* ------------------------------------------------------------------ */
/*  Data keuangan per pengguna                                        */
/* ------------------------------------------------------------------ */

export function dataKey(userId) {
  return `u-${userId}`
}

/** Bentuk data kosong yang lengkap, dipakai juga sebagai skema defaults. */
export function emptyData() {
  return {
    kategori: [],
    transaksi: [],
    pengaturan: { saldo_awal: '0' },
    seq: { kategori: 0, transaksi: 0 },
  }
}

/**
 * Baca data + ETag-nya. ETag wajib ikut dikembalikan agar penulisan
 * berikutnya bisa memakai `onlyIfMatch`.
 */
export async function readData(userId) {
  const entry = await dataStore().getWithMetadata(dataKey(userId), { type: 'json' })
  if (entry === null) return { data: emptyData(), etag: null, exists: false }
  return { data: { ...emptyData(), ...entry.data }, etag: entry.etag ?? null, exists: true }
}

/** Tulis data dengan pengecekan ETag. `ok: false` berarti ada konflik. */
export async function writeData(userId, data, etag) {
  const options = etag ? { onlyIfMatch: etag } : { onlyIfNew: true }
  const { modified, etag: next } = await dataStore().setJSON(dataKey(userId), data, options)
  return { ok: modified, etag: next ?? null, conflict: !modified }
}

/**
 * Baca -> ubah -> tulis dalam satu langkah ergonomic.
 *
 * `fn` menerima (data) dan boleh mengubahnya di tempat; nilai balikanya
 * diabaikan. Jika terjadi konflik ETag, operasi diulang dari data terbaru
 * (maks 4 kali) sehingga update yang berdekatan tidak saling menimpa.
 *
 * @param {number|string} userId
 * @param {(data: object) => any} fn
 * @param {{retries?: number}} [opts]
 * @returns {Promise<any>} nilai balik dari fn pada percobaan yang berhasil
 */
export async function mutate(userId, fn, opts = {}) {
  const retries = opts.retries ?? 3
  let lastConflict = false

  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, etag } = await readData(userId)
    const result = fn(data)

    const { ok, etag: next, conflict } = await writeData(userId, data, etag)

    if (ok) return result

    lastConflict = conflict
  }

  const err = new Error('Data sedang diubah oleh permintaan lain. Silakan coba lagi.')
  err.code = 'KONFLIK'
  err.conflict = lastConflict
  throw err
}

/* ------------------------------------------------------------------ */
/*  Rate limit sederhana (login)                                      */
/* ------------------------------------------------------------------ */

/**
 * Penghitung percobaan login yang sederhana dan stateless.
 *
 * Disimpan per username (bukan per IP) supaya tidak bisa dielakkan dengan
 * mengganti username, dan memakai ETag sehingga tetap akurat saat ada dua
 * percobaan bersamaan.
 */
export async function catatPercobaan(username, maks = 8, jendelaMs = 15 * 60 * 1000) {
  const store = usersStore()
  const key = `rl:${String(username || '').toLowerCase()}`
  const sekarang = Date.now()

  const entry = await store.getWithMetadata(key, { type: 'json' })
  const lama = entry?.data ?? null

  // jendela sudah lewat -> mulai hitungan baru
  const dasar = !lama || lama.reset <= sekarang
    ? { gagal: 0, reset: sekarang + jendelaMs }
    : lama

  if (dasar.gagal >= maks) {
    return { terkunci: true, sisaDetik: Math.ceil((dasar.reset - sekarang) / 1000) }
  }

  // Hanya boleh satu kondisi: onlyIfNew untuk key baru, onlyIfMatch untuk yang sudah ada
  const kondisi = entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true }
  await store
    .setJSON(key, { gagal: dasar.gagal + 1, reset: dasar.reset }, kondisi)
    .catch(() => {})

  return { terkunci: false, sisaPercobaan: maks - (dasar.gagal + 1) }
}

export async function resetPercobaan(username) {
  await usersStore().delete(`rl:${String(username || '').toLowerCase()}`).catch(() => {})
}
