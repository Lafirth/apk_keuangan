/**
 * API Auth: login | logout | whoami
 *
 * Berbeda dari API lain, endpoint ini TIDAK memakai bootstrap() karena
 * memang harus bisa dipanggil saat belum login.
 */

import {
  json, jsonError, attemptLogin, headerCookieSesi, currentUser, csrfToken, bootstrap,
} from './bootstrap.mjs'
import { ensureSeed } from './seed.mjs'

export const config = { path: '/api/auth.php' }

/**
 * Apakah tombol "Akun demo" boleh ditampilkan di halaman login.
 *
 * Credential demo dicetak di HTML, jadi PUBLIK begitu situs dideploy.
 * Default-nya hanya tampil di luar produksi (mis. `netlify dev`), dan di
 * produksi bisa dinyalakan ulang secara sengaja lewat DEMO_LOGIN=1.
 */
const demoTampil = () => process.env.CONTEXT !== 'production'
  || ['1', 'true', 'yes', 'on'].includes(String(process.env.DEMO_LOGIN ?? '').toLowerCase())


export default async function handler(req) {
  try {
    await ensureSeed()
  } catch (err) {
    console.error('Seed gagal:', err?.message)
  }

  const q = Object.fromEntries(new URL(req.url).searchParams)
  const action = String(q.action ?? 'whoami')

  try {
    switch (action) {
      /* ------------------------------------------------------------ */
      case 'login': {
        if (req.method !== 'POST') return jsonError('Metode tidak diizinkan.', 405)

        const body = await req.formData()
        const username = String(body.get('username') ?? '').trim()
        const password = String(body.get('password') ?? '')

        if (!username || !password) {
          return jsonError('Username dan password wajib diisi.', 400)
        }

        const hasil = await attemptLogin(username, password)

        if (!hasil.ok) {
          return jsonError(hasil.pesan, hasil.terkunci ? 429 : 401)
        }

        return json(
          {
            success: true,
            message: 'Berhasil masuk.',
            user: hasil.user,
            csrf: csrfToken(hasil.user.id),
          },
          200,
          { 'set-cookie': headerCookieSesi(hasil.token) },
        )
      }

      /* ------------------------------------------------------------ */
      case 'logout': {
        if (req.method !== 'POST') return jsonError('Metode tidak diizinkan.', 405)

        // Lewati bootstrap() supaya cookie tetap dihapus walau sesinya sudah
        // kadaluwarsa; yang dijaga hanya agar logout tidak bisa dipicu GET
        // dari situs lain (CSRF logout).
        //
        // bootstrap() mengembalikan Response kalau request tidak boleh lanjut:
        //   401 -> belum login, tidak ada yang perlu dilindungi, tetap keluar
        //   403 -> CSRF gagal, tolak
        //   400 -> body tidak bisa dibaca, tolak
        const ctx = await bootstrap(req)
        if (ctx instanceof Response && ctx.status !== 401) {
          return ctx
        }

        return json(
          { success: true, message: 'Sampai jumpa.' },
          200,
          { 'set-cookie': headerCookieSesi('', { hapus: true }) },
        )
      }

      /* ------------------------------------------------------------ */
      case 'whoami': {
        const user = await currentUser(req)
        if (!user) {
          // Flag `demo` ikut dikembalikan saat belum login supaya halaman
          // login bisa menyembunyikan blok kredensial demo di produksi.
          return json(
            { success: false, message: 'Belum login.', demo: demoTampil() },
            401,
          )
        }

        return json({
          success: true,
          user: { id: user.id, username: user.username, nama: user.nama },
          csrf: csrfToken(user.id),
          demo: demoTampil(),
        })
      }

      default:
        return jsonError('Aksi tidak dikenal.', 400)
    }
  } catch (err) {
    console.error('API auth gagal:', err)
    return jsonError('Terjadi kesalahan pada server.', 500)
  }
}
