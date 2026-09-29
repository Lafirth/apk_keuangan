/**
 * API Dashboard: statistik, grafik, saldo awal
 * Padanan php/api/dashboard.php.
 */

import { bootstrap, jsonError, angka, periodeValid } from './bootstrap.mjs'
import { readData, mutate } from './store.mjs'
import * as model from './queries.mjs'

export const config = { path: '/api/dashboard.php' }

function periodeSekarang() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function handler(req) {
  const boot = await bootstrap(req)
  if (boot instanceof Response) return boot

  const { user, q: query, post, json } = boot
  const action = String(query.action ?? 'statistik')

  try {
    switch (action) {
      /* ------------------------------------------------------------ */
      case 'statistik': {
        let periode = String(query.periode ?? periodeSekarang())
        if (!periodeValid(periode)) periode = periodeSekarang()

        const { data } = await readData(user.id)

        const kategori = model.rekapKategori(data, periode, 'keluar')
        const donat = kategori.filter((k) => Number(k.total) > 0)

        return json({
          success: true,
          data: {
            ringkasan: model.ringkasanBulan(data, periode),
            perbandingan: model.perbandinganBulan(data, periode),
            saldo: model.saldoSekarang(data),
            saldo_awal: model.saldoAwal(data),
            rata_harian: model.rataHarian(data, periode),
            hari_ini: {
              keluar: model.totalHariIni(data, 'keluar'),
              masuk: model.totalHariIni(data, 'masuk'),
            },
            harian_keluar: model.harianKeluar(data, periode),
            harian_masuk: model.harianMasuk(data, periode),
            kategori: donat,
            tren: model.trenBulan(data, 6),
            terakhir: model.transaksiTerbaru(data, 7),
          },
        })
      }

      /* ------------------------------------------------------------ */
      case 'rekap': {
        let periode = String(query.periode ?? periodeSekarang())
        if (!periodeValid(periode)) periode = periodeSekarang()

        const { data } = await readData(user.id)

        // Halaman rekap & cetak butuh seluruh agregat sekaligus; menghitungnya
        // di sini membuat satu panggilan, bukan lima.
        return json({
          success: true,
          data: {
            periode,
            ringkasan: model.ringkasanBulan(data, periode),
            perbandingan: model.perbandinganBulan(data, periode),
            rekap_keluar: model.rekapKategori(data, periode, 'keluar'),
            rekap_masuk: model.rekapKategori(data, periode, 'masuk'),
            harian_keluar: model.harianKeluar(data, periode),
            transaksi: model.transaksiList(data, { periode }),
            saldo: model.saldoSekarang(data),
            saldo_awal: model.saldoAwal(data),
            rata_harian: model.rataHarian(data, periode),
            user: { nama: user.nama, username: user.username },
          },
        })
      }

      /* ------------------------------------------------------------ */
      case 'saldo_awal': {
        if (req.method === 'POST') {
          const nilai = angka(post('saldo_awal', 0))
          if (nilai < 0) return jsonError('Saldo awal tidak boleh negatif.')

          const hasil = await mutate(user.id, (data) => {
            model.saldoAwalSet(data, nilai)
            return { saldo_awal: model.saldoAwal(data), saldo: model.saldoSekarang(data) }
          })

          return json({
            success: true,
            message: 'Saldo awal berhasil disimpan.',
            data: hasil,
          })
        }

        const { data } = await readData(user.id)
        return json({ success: true, data: { saldo_awal: model.saldoAwal(data) } })
      }

      default:
        return jsonError('Aksi tidak dikenal.', 400)
    }
  } catch (err) {
    if (err?.status) return jsonError(err.message, err.status)
    if (err?.code === 'KONFLIK') return jsonError(err.message, 409)
    console.error('API dashboard gagal:', err)
    return jsonError('Terjadi kesalahan pada server.', 500)
  }
}
