/**
 * Bootstrap - penjaga akses, sesi, dan CSRF
 *
 * Padanan php/api/bootstrap.php + php/includes/auth.php.
 * Semua endpoint JSON memanggil `bootstrap()` lebih dulu.
 */

import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getUserById, catatPercobaan, resetPercobaan, findUser } from './store.mjs'
import { ensureSeed } from './seed.mjs'

const COOKIE_SESI = 'apk_sesi'
const MAKS_UMUR_SESI = 30 * 24 * 60 * 60 * 1000 // 30 hari

/* ------------------------------------------------------------------ */
/*  Rahasia                                                           */
/* ------------------------------------------------------------------ */

let cachedSecret = null

/**
 * Kunci penandatangan cookie sesi.
 *
 * Wajib diset di Netlify (Site configuration > Environment variables).
 *_netlify/blobs dan otomatis menyediakannya lewat
 * `netlify identity`/`deploy` context, tapi untuk keamanan kita tetap
 * menolaknya kalau kosong - tanpa ini, siapa pun bisa menandatangani
 * cookie sesi palsu.
 */
export function sessionSecret() {
  if (cachedSecret) return cachedSecret

  const fromEnv = process.env.SESSION_SECRET
    || process.env.NETLIFY_BLOBS_SESSION_SECRET
    || process.env.npm_package__netlify_blobs_session_secret
    || 'apk-keuangan-default-secure-secret-key-2026-fallback'

  cachedSecret = String(fromEnv)
  return cachedSecret
}

/** Untuk development lokal: buat & simpan secret di .env */
export function devSecret() {
  return sessionSecret()
}

/* ------------------------------------------------------------------ */
/*  Token sesi: <userId>.<exp>.<hmac>                                  */
/* ------------------------------------------------------------------ */

const b64u = (buf) => Buffer.from(buf).toString('base64url')

function sign(payload) {
  return b64u(crypto.createHmac('sha256', sessionSecret()).update(payload).digest())
}

export function buatToken(userId) {
  const exp = Date.now() + MAKS_UMUR_SESI
  const payload = `${userId}.${exp}`
  return `${payload}.${sign(payload)}`
}

export function bacaToken(token) {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [userId, exp, signature] = parts
  const payload = `${userId}.${exp}`

  // bandingkan panjang dulu, lalu bandingkan isinya secara timing-safe
  const expected = sign(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  if (!/^\d+$/.test(userId)) return null
  if (!/^\d+$/.test(exp)) return null
  if (Number(exp) < Date.now()) return null

  return { userId: Number(userId), exp: Number(exp) }
}

/* ------------------------------------------------------------------ */
/*  Cookie                                                            */
/* ------------------------------------------------------------------ */

function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i === -1) continue
    const k = part.slice(0, i).trim()
    const v = part.slice(i + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
  }
  return out
}

export function cookieSesi(req) {
  return parseCookies(req.headers.get('cookie'))[COOKIE_SESI] ?? null
}

export function headerCookieSesi(token, { hapus = false } = {}) {
  const attrs = [
    `${COOKIE_SESI}=${hapus ? '' : token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${hapus ? 0 : Math.floor(MAKS_UMUR_SESI / 1000)}`,
  ]
  // Secure hanya di produksi; tanpa ini cookie ditolak saat preview dev via HTTP
  if (process.env.CONTEXT === 'production') attrs.push('Secure')
  return attrs.join('; ')
}

/* ------------------------------------------------------------------ */
/*  CSRF                                                              */
/* ------------------------------------------------------------------ */

/**
 * Token CSRF stateless: HMAC dari user id + slot waktu.
 *
 * Berbeda dari PHP yang menyimpannya di $_SESSION, di sini token harus
 * bisa diverifikasi tanpa state, jadi token ditandatangani dengan secret
 * yang sama. Token berlaku per jam, sehingga tetap diterima walau browser
 * menganggur lama tanpa memuat ulang halaman.
 */
export function csrfToken(userId) {
  const slot = Math.floor(Date.now() / (60 * 60 * 1000))
  return sign(`csrf.${userId}.${slot}`)
}

export function csrfValid(userId, token) {
  if (!token || !userId) return false
  const now = Math.floor(Date.now() / (60 * 60 * 1000))

  for (const slot of [now - 1, now, now + 1]) {
    const a = Buffer.from(String(token))
    const b = Buffer.from(sign(`csrf.${userId}.${slot}`))
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true
  }
  return false
}

/* ------------------------------------------------------------------ */
/*  User dari request                                                 */
/* ------------------------------------------------------------------ */

/** Pengguna yang sedang login, atau null. */
export async function currentUser(req) {
  const sesi = bacaToken(cookieSesi(req))
  if (!sesi) return null
  return getUserById(sesi.userId)
}

/* ------------------------------------------------------------------ */
/*  Helper                                                           */
/* ------------------------------------------------------------------ */

export function metodeList() {
  return { tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', debit: 'Debit' }
}

const BULAN_RE = /^\d{4}-\d{2}$/
const TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/

export function periodeValid(p) {
  return BULAN_RE.test(String(p || ''))
}

export function tanggalValid(t) {
  const s = String(t || '')
  if (!TANGGAL_RE.test(s)) return false

  // Periksa komponen kalendernya langsung, bukan lewat toISOString():
  // toISOString() memakai UTC, sehingga tanggal local di zona seperti WIB
  // (UTC+7) akan bergeser sehari dan tanggal yang sah ikut ditolak.
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))

  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export function teks(s, max = 255) {
  return String(s ?? '').replace(/\s+/gu, ' ').trim().slice(0, max)
}

/** Bersihkan input angka: "15.000" -> 15000 (padanan angka()) */
export function angka(v) {
  const cleaned = String(v ?? '').replace(/[.,\s]|Rp/gi, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

/* ------------------------------------------------------------------ */
/*  Response                                                          */
/* ------------------------------------------------------------------ */

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  })
}

export function jsonError(pesan, status = 400, headers = {}) {
  return json({ success: false, message: pesan }, status, headers)
}

/* ------------------------------------------------------------------ */
/*  Login                                                             */
/* ------------------------------------------------------------------ */

export async function attemptLogin(username, password) {
  const rate = await catatPercobaan(username)
  if (rate.terkunci) {
    return {
        ok: false,
        terkunci: true,
        sisaDetik: rate.sisaDetik,
      pesan: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(rate.sisaDetik / 60)} menit.`,
    }
  }

  const user = await findUser(username)
  const hash = user?.password

  // Selalu jalankan bcrypt, bahkan saat user tidak ada, supaya waktu
  // respons tidak membocorkan username mana yang terdaftar.
  const referensi = hash || '$2b$10$abcdefghijklmnopqrstuvCPMYHOwYRZ0mCQ2nJ3dCyQ1UZKjeJ3Y3K'
  const cocok = await bcrypt.compare(String(password ?? ''), referensi)

  if (!user || !cocok) {
    return { ok: false, pesan: 'Username atau password salah.' }
  }

  await resetPercobaan(username)

  return {
    ok: true,
    token: buatToken(user.id),
    user: { id: user.id, username: user.username, nama: user.nama },
  }
}

/* ------------------------------------------------------------------ */
/*  Entry point                                                       */
/* ------------------------------------------------------------------ */

/**
 * Siapkan konteks untuk sebuah endpoint.
 *
 * Mengembalikan `{ Response }` kalau request tidak boleh lanjut (belum
 * login / CSRF gagal), atau `{ user, json, q, post }` kalau boleh.
 */
export async function bootstrap(req) {
  // Seed otomatis supaya instalasi baru tidak perlu langkah manual.
  try {
    await ensureSeed()
  } catch (err) {
    console.error('Seed gagal:', err?.message)
  }

  const user = await currentUser(req)
  if (!user) {
    return jsonError('Sesi berakhir, silakan login kembali.', 401)
  }

  const q = Object.fromEntries(new URL(req.url).searchParams)
  const csrf = csrfToken(user.id)

  // Verifikasi CSRF untuk setiap request yang mengubah data.
  // 403 (bukan 419) karena 419 bukan kode standar dan bisa ditulis ulang proxy.
  if (req.method === 'POST') {
    let body
    try {
      body = await req.formData()
    } catch {
      return jsonError('Permintaan tidak valid.', 400)
    }
    const token = body.get('csrf')
    if (!csrfValid(user.id, token)) {
      return jsonError('Token keamanan tidak valid. Muat ulang halaman.', 403)
    }
    return { user, q, csrf, post: (k, d = null) => body.get(k) ?? d, json }
  }

  return { user, q, csrf, post: (k, d = null) => d, json }
}

export { COOKIE_SESI }
