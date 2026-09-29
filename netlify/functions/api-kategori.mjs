/**
 * API Kategori: list | simpan | update | hapus
 * Padanan php/api/kategori.php.
 */

import { bootstrap, jsonError, teks } from './bootstrap.mjs'
import { readData, mutate } from './store.mjs'
import * as model from './queries.mjs'

export const config = { path: '/api/kategori.php' }

function warnaValid(w) {
  return /^#[0-9a-fA-F]{6}$/.test(String(w || ''))
}

export default async function handler(req) {
  const boot = await bootstrap(req)
  if (boot instanceof Response) return boot

  const { user, q: query, post, json } = boot
  const action = String(query.action ?? 'list')

  try {
    switch (action) {
      /* ------------------------------------------------------------ */
      case 'list': {
        const { data } = await readData(user.id)
        const jenis = String(query.jenis ?? '')
        return json({
          success: true,
          data: model.kategoriWithJumlah(data, jenis || null),
        })
      }

      /* ------------------------------------------------------------ */
      case 'simpan':
      case 'update': {
        const id = Number(post('id', 0)) || 0
        const nama = teks(post('nama', ''), 50)
        let ikon = String(post('ikon', '🏷️'))
        let warna = String(post('warna', '#6366f1'))
        const jenis = String(post('jenis', 'keluar'))
        const aktif = Number(post('is_active', 1)) === 1 ? 1 : 0

        if (nama === '') return jsonError('Nama kategori wajib diisi.')
        if (nama.length < 2) return jsonError('Nama kategori minimal 2 karakter.')
        if (jenis !== 'masuk' && jenis !== 'keluar') return jsonError('Jenis kategori tidak valid.')
        if (!warnaValid(warna)) warna = '#6366f1'
        ikon = (ikon.trim() || '🏷️').slice(0, 8)

        const hasil = await mutate(user.id, (data) => {
          if (model.namaKategoriBentrok(data, nama, jenis, id)) {
            throw Object.assign(
              new Error(`Kategori "${nama}" sudah ada di daftar ${jenis}.`),
              { status: 400 },
            )
          }

          const baris = { nama, ikon, warna, jenis, is_active: aktif }
          let idBaru = id
          let pesan

          if (action === 'update') {
            if (id <= 0 || !model.kategoriById(data, id)) {
              throw Object.assign(new Error('Kategori tidak ditemukan.'), { status: 400 })
            }
            model.kategoriUpdate(data, id, baris)
            pesan = 'Kategori berhasil diperbarui.'
          } else {
            idBaru = model.kategoriSimpan(data, baris)
            pesan = 'Kategori berhasil ditambahkan.'
          }

          return { id: idBaru, pesan }
        })

        return json({ success: true, message: hasil.pesan, id: hasil.id })
      }

      /* ------------------------------------------------------------ */
      case 'hapus': {
        const id = Number(post('id', 0)) || 0

        const jml = await mutate(user.id, (data) => {
          if (id <= 0 || !model.kategoriById(data, id)) {
            throw Object.assign(new Error('Kategori tidak ditemukan.'), { status: 400 })
          }
          // Transaksi terkait kehilangan kategori (padanan ON DELETE SET NULL)
          return model.kategoriHapus(data, id)
        })

        return json({
          success: true,
          message: 'Kategori dihapus.'
            + (jml > 0 ? ` ${jml} transaksi terkait kini tanpa kategori.` : ''),
        })
      }

      default:
        return jsonError('Aksi tidak dikenal.', 400)
    }
  } catch (err) {
    if (err?.status) return jsonError(err.message, err.status)
    if (err?.code === 'KONFLIK') return jsonError(err.message, 409)
    console.error('API kategori gagal:', err)
    return jsonError('Terjadi kesalahan pada server.', 500)
  }
}
