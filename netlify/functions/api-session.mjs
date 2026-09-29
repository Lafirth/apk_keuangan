/**
 * API Session: data awal untuk halaman
 *
 * Satu panggilan ini menggantikan tiga permintaan terpisah (kategori +
 * daftar bulan + user) sehingga halaman hanya perlu satu round-trip saat
 * dibuka. Isinya persis apa yang tadinya di-inline ke `window.APP` oleh
 * php/includes/footer.php.
 */

import { bootstrap } from './bootstrap.mjs'
import { readData } from './store.mjs'
import * as model from './queries.mjs'

export const config = { path: '/api/session.php' }

export default async function handler(req) {
  const boot = await bootstrap(req)
  if (boot instanceof Response) return boot

  const { user, json } = boot

  const { data } = await readData(user.id)

  return json({
    success: true,
    user: { id: user.id, username: user.username, nama: user.nama },
    csrf: boot.csrf ?? null,
    kategori: {
      masuk: model.kategoriAll(data, 'masuk', true),
      keluar: model.kategoriAll(data, 'keluar', true),
    },
    bulan: model.daftarBulanAda(data),
    saldo: model.saldoSekarang(data),
  })
}
