/**
 * Seed - data awal, dibuat otomatis pada request pertama
 *
 * Tidak ada langkah "jalankan seed" manual: `ensureSeed()` dipanggil dari
 * bootstrap setiap kali endpoint dipanggil, dan hanya menulis HANYA kalau
 * penanda `__seeded__` belum ada (dijamin atomik oleh `onlyIfNew`).
 *
 * Seed ini idempoten: membawanya ke store kosong selalu menghasilkan data
 * yang sama, jadi aman dijalankan ulang.
 *
 * Password "wira26" memakai hash bcrypt yang PERSIS sama dengan yang
 * dipakai php/database/apk_keuangan.sql, sehingga kedua versi memakai
 * kredensial yang sama.
 */

import { seedOnce, isSeeded } from './store.mjs'

/** Hash bcrypt cost=10 untuk "wira26" (identik dengan versi PHP). */
export const HASH_WIRA26 = '$2y$10$q2cawRC3AoLjQJUECH76IeiqR87B4c9GcVsMYVHGv1JGrdpVteIK6'

const USER_AWAL = {
  id: 1,
  username: 'christa',
  password: HASH_WIRA26,
  nama: 'Christa',
  created_at: '2026-01-01T00:00:00.000Z',
}

/** 13 kategori bawaan: 4 pemasukan + 9 pengeluaran (tanpa data contoh). */
const KATEGORI_AWAL = [
  // ---------- PEMASUKAN ----------
  { nama: 'Gaji', ikon: '💰', warna: '#10b981', jenis: 'masuk' },
  { nama: 'Bonus', ikon: '🎉', warna: '#34d399', jenis: 'masuk' },
  { nama: 'Usaha', ikon: '💼', warna: '#22d3ee', jenis: 'masuk' },
  { nama: 'Lainnya', ikon: '✨', warna: '#2dd4bf', jenis: 'masuk' },
  // ---------- PENGELUARAN ----------
  { nama: 'Makan', ikon: '🍚', warna: '#f97316', jenis: 'keluar' },
  { nama: 'Transport', ikon: '🚌', warna: '#38bdf8', jenis: 'keluar' },
  { nama: 'Tagihan', ikon: '🧾', warna: '#f43f5e', jenis: 'keluar' },
  { nama: 'Belanja', ikon: '🛍️', warna: '#a855f7', jenis: 'keluar' },
  { nama: 'Hiburan', ikon: '🎬', warna: '#ec4899', jenis: 'keluar' },
  { nama: 'Kesehatan', ikon: '⚕️', warna: '#14b8a6', jenis: 'keluar' },
  { nama: 'Pendidikan', ikon: '📚', warna: '#6366f1', jenis: 'keluar' },
  { nama: 'Sosial', ikon: '🎉', warna: '#f59e0b', jenis: 'keluar' },
  { nama: 'Lainnya', ikon: '🏷️', warna: '#94a3b8', jenis: 'keluar' },
]

function buildSeedPayload() {
  const kategori = KATEGORI_AWAL.map((k, i) => ({
    id: i + 1,
    nama: k.nama,
    ikon: k.ikon,
    warna: k.warna,
    jenis: k.jenis,
    is_active: 1,
  }))

  return {
    users: [USER_AWAL],
    data: [
      {
        key: 'u-1',
        value: {
          kategori,
          transaksi: [],
          pengaturan: { saldo_awal: '0' },
          seq: { kategori: kategori.length, transaksi: 0 },
        },
      },
    ],
  }
}

let inFlight = null

/**
 * Pastikan data awal sudah ada.
 * Dipanggil otomatis dari bootstrap, jadi tidak perlu langkah manual.
 */
export async function ensureSeed() {
  if (await isSeeded()) return { seeded: false, reason: 'sudah ada' }

  // Kalau beberapa request arrive bersamaan, hanya satu yang benar-benar
  // melakukan penulisan; yang lain menunggu hasil yang sama.
  if (!inFlight) {
    inFlight = seedOnce(buildSeedPayload).finally(() => { inFlight = null })
  }
  return inFlight
}

export { USER_AWAL, KATEGORI_AWAL, buildSeedPayload }
