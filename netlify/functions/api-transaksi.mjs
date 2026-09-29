/**
 * API Transaksi: list | simpan | update | hapus | get
 * Padanan php/api/transaksi.php. Bentuk respons dipertahankan agar
 * assets/js/app.js tidak perlu diubah.
 */

import { bootstrap, jsonError, metodeList, angka, teks, tanggalValid } from './bootstrap.mjs'
import { readData, mutate } from './store.mjs'
import * as model from './queries.mjs'

export const config = { path: '/api/transaksi.php' }

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
        const rows = model.transaksiList(data, {
          periode: String(query.periode ?? ''),
          jenis: String(query.jenis ?? ''),
          kategori_id: String(query.kategori_id ?? ''),
          cari: String(query.cari ?? ''),
        })

        let totalMasuk = 0
        let totalKeluar = 0
        for (const r of rows) {
          if (r.jenis === 'masuk') totalMasuk += r.nominal
          else totalKeluar += r.nominal
        }

        return json({
          success: true,
          data: rows,
          summary: {
            masuk: totalMasuk,
            keluar: totalKeluar,
            selisih: totalMasuk - totalKeluar,
            jumlah: rows.length,
          },
        })
      }

      /* ------------------------------------------------------------ */
      case 'simpan':
      case 'update': {
        const id = Number(post('id', 0)) || 0

        const tanggal = String(post('tanggal', ''))
        const jenis = String(post('jenis', 'keluar'))
        const kategoriId = Number(post('kategori_id', 0)) || 0
        const nominal = angka(post('nominal', 0))
        const keterangan = teks(post('keterangan', ''))
        const metode = String(post('metode', 'tunai'))

        if (!tanggalValid(tanggal)) return jsonError('Tanggal tidak valid.')
        if (jenis !== 'masuk' && jenis !== 'keluar') return jsonError('Jenis transaksi tidak valid.')
        if (nominal <= 0) return jsonError('Nominal harus lebih dari 0.')
        if (nominal > 999_999_999_999) return jsonError('Nominal terlalu besar.')
        if (!Object.hasOwn(metodeList(), metode)) return jsonError('Metode pembayaran tidak valid.')

        const baris = {
          tanggal,
          jenis,
          kategori_id: kategoriId || null,
          nominal,
          keterangan,
          metode,
        }

        const hasil = await mutate(user.id, (data) => {
          if (kategoriId > 0) {
            const kat = model.kategoriById(data, kategoriId)
            if (!kat) throw Object.assign(new Error('Kategori tidak ditemukan.'), { status: 400 })
            if (kat.jenis !== jenis) {
              throw Object.assign(
                new Error(`Kategori "${kat.nama}" tidak sesuai dengan jenis transaksi.`),
                { status: 400 },
              )
            }
          }

          let idBaru = id
          let pesan

          if (action === 'update') {
            if (id <= 0 || !model.transaksiById(data, id)) {
              throw Object.assign(new Error('Transaksi tidak ditemukan.'), { status: 400 })
            }
            model.transaksiUpdate(data, id, baris)
            pesan = 'Transaksi berhasil diperbarui.'
          } else {
            idBaru = model.transaksiSimpan(data, baris)
            pesan = 'Transaksi berhasil disimpan.'
          }

          return {
            id: idBaru,
            pesan,
            data: model.transaksiById(data, idBaru),
            ringkasan: {
              saldo: model.saldoSekarang(data),
              bulan: model.ringkasanBulan(data, model.PERIODE_DARI_TANGGAL(tanggal)),
            },
          }
        })

        return json({ success: true, message: hasil.pesan, id: hasil.id, data: hasil.data, ringkasan: hasil.ringkasan })
      }

      /* ------------------------------------------------------------ */
      case 'hapus': {
        const id = Number(post('id', 0)) || 0

        const saldo = await mutate(user.id, (data) => {
          if (id <= 0 || !model.transaksiById(data, id)) {
            throw Object.assign(new Error('Transaksi tidak ditemukan.'), { status: 400 })
          }
          model.transaksiHapus(data, id)
          return model.saldoSekarang(data)
        })

        return json({
          success: true,
          message: 'Transaksi berhasil dihapus.',
          ringkasan: { saldo },
        })
      }

      /* ------------------------------------------------------------ */
      case 'get': {
        const id = Number(query.id ?? 0) || 0
        const { data } = await readData(user.id)
        const row = model.transaksiById(data, id)
        if (!row) return jsonError('Transaksi tidak ditemukan.', 404)
        return json({ success: true, data: row })
      }

      default:
        return jsonError('Aksi tidak dikenal.', 400)
    }
  } catch (err) {
    // Pesan dari validasi sengaja diteruskan; sisanya disembunyikan agar
    // detail internal tidak bocor ke klien (perbaikan dari versi PHP yang
    // mengirim mentah-mentah pesan PDOException).
    if (err?.status) return jsonError(err.message, err.status)
    if (err?.code === 'KONFLIK') return jsonError(err.message, 409)
    console.error('API transaksi gagal:', err)
    return jsonError('Terjadi kesalahan pada server.', 500)
  }
}
