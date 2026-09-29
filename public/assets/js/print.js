/**
 * Halaman cetak rekap bulanan (A4 friendly).
 *
 * Padanan php/print/rekap.php. Semua isi dirender di klien dari satu panggilan
 * /api/dashboard.php?action=rekap, lalu transaction dikelompokkan per tanggal
 * dengan subtotal - persis seperti loop di versi PHP.
 */

const nf = new Intl.NumberFormat('id-ID')
const BULAN = [null, 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const METODE = { tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', debit: 'Debit' }

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function rupiah(n) {
  return 'Rp ' + nf.format(Math.round(Number(n) || 0))
}

function periodeIndo(p) {
  const [y, m] = String(p || '').split('-')
  return `${BULAN[Number(m)] || '-'} ${y || ''}`
}

function tanggal(now = new Date()) {
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} `
       + `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/** "2026-09" -> "September 2026"; dipakai untuk judul. */
function tglIndo(iso) {
  const [y, m, d] = String(iso).split('-')
  return `${HARI[new Date(Number(y), Number(m) - 1, Number(d)).getDay()]}, ${Number(d)} ${BULAN[Number(m)]} ${y}`
}

/* ------------------------------------------------------------------ auth */

async function reqApi(path) {
  const res = await fetch('/api/' + path, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
  if (res.status === 401) {
    location.replace('/login.html')
    throw new Error('Sesi berakhir.')
  }
  const json = await res.json()
  if (!json.success) throw new Error(json.message || 'Gagal memuat data.')
  return json
}

/* ---------------------------------------------------------------- render */

function kartuStat(label, nilai) {
  return `<div class="stat">
    <div class="stat-label">${esc(label)}</div>
    <div class="stat-val sm">${esc(nilai)}</div>
  </div>`
}

function tabelRekap(judul, list, total, jumlahTotal, adaNomor) {
  const terpakai = list.filter((k) => Number(k.total) > 0)
  const basis = total || 1
  const kolom = adaNomor ? 5 : 4

  const baris = terpakai.map((k, i) => {
    const t = Number(k.total)
    const pct = (t / basis * 100).toFixed(1).replace('.', ',')
    return `<tr>
      ${adaNomor ? `<td class="t-center">${i + 1}</td>` : ''}
      <td>${esc(k.ikon)} ${esc(k.nama)}</td>
      <td class="t-center">${k.jml}</td>
      <td class="t-right t-num">${pct}%</td>
      <td class="t-right t-num"><b>${esc(rupiah(t))}</b></td>
    </tr>`
  }).join('')

  const kosong = terpakai.length ? '' : `
    <tr><td colspan="${kolom}" class="t-center mute2" style="padding:20px">
      ${judul === 'PENGELUARAN' ? 'Tidak ada pengeluaran.' : 'Tidak ada pemasukan.'}
    </td></tr>`

  const noKolom = adaNomor ? 4 : 3
  const totalLabel = judul === 'PENGELUARAN' ? 'TOTAL PENGELUARAN' : 'TOTAL PEMASUKAN'

  return `
  <div class="card" style="margin-bottom:20px">
    <div class="card-head"><h2>Rekap ${judul === 'PENGELUARAN' ? 'Pengeluaran' : 'Pemasukan'}</h2></div>
    <div class="card-body flush">
      <table>
        <thead>
          <tr>
            ${adaNomor ? '<th style="width:30px">#</th>' : ''}
            <th>Kategori</th>
            <th class="t-center" style="width:80px">Trx</th>
            <th class="t-right" style="width:80px">%</th>
            <th class="t-right" style="width:140px">Total</th>
          </tr>
        </thead>
        <tbody>${baris}${kosong}</tbody>
        <tfoot>
          <tr>
            <td colspan="${noKolom}" class="t-right">${totalLabel}</td>
            <td class="t-right t-num">${esc(rupiah(jumlahTotal))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>`
}

function rincianHarian(transaksi) {
  /* Kelompokkan per tanggal, urut kronologis - sama seperti ksort() PHP. */
  const perTanggal = new Map()
  for (const t of transaksi) {
    if (!perTanggal.has(t.tanggal)) perTanggal.set(t.tanggal, [])
    perTanggal.get(t.tanggal).push(t)
  }
  const urut = [...perTanggal.keys()].sort()

  let html = ''
  for (const tgl of urut) {
    const list = perTanggal.get(tgl)
    let masuk = 0
    let keluar = 0

    for (const t of list) {
      if (t.jenis === 'masuk') masuk += Number(t.nominal)
      else keluar += Number(t.nominal)

      html += `<tr>
        <td class="nowrap t-num">${esc(tglIndo(t.tanggal))}</td>
        <td class="nowrap">${esc(t.kategori_ikon || '')} ${esc(t.kategori_nama || 'Tanpa Kategori')}</td>
        <td>${esc(t.keterangan || '—')}</td>
        <td class="t-center">${esc(METODE[t.metode] || t.metode)}</td>
        <td class="t-right">${t.jenis === 'masuk' ? 'Masuk' : 'Keluar'}</td>
        <td class="t-right t-num"><b>${esc(rupiah(t.nominal))}</b></td>
      </tr>`
    }

    html += `<tr style="background:rgba(255,255,255,.05)">
      <td colspan="5" class="t-right"><b>Subtotal ${esc(tglIndo(tgl))}</b></td>
      <td class="t-right t-num">
        ${masuk > 0 ? `<div class="tiny" style="color:#15803d">+ ${esc(rupiah(masuk))}</div>` : ''}
        <b>${esc(rupiah(keluar))}</b>
      </td>
    </tr>`
  }

  if (!urut.length) {
    html = `<tr><td colspan="6" class="t-center mute2" style="padding:26px" id="cetakKosong">Belum ada transaksi pada periode ini.</td></tr>`
  }

  return html
}

function render(d, periode) {
  const r = d.ringkasan
  const pb = d.perbandingan
  const dicetak = tanggal()

  const perbandingan = pb.bulan_lalu > 0 ? `
    <div class="divider"></div>
    <div style="font-size:13px">
      <b>Perbandingan ${esc(pb.bulan_lalu_nama)}:</b>
      pengeluaran bulan ini <b>${esc(rupiah(pb.bulan_ini))}</b>,
      bulan lalu <b>${esc(rupiah(pb.bulan_lalu))}</b>
      (${pb.selisih > 0 ? 'naik' : (pb.selisih < 0 ? 'turun' : 'sama')} ${Math.abs(pb.persen)}%).
    </div>` : ''

  document.title = `Rekap ${periodeIndo(periode)} · APK Keuangan`
  document.getElementById('cetakPeriode').textContent = `${periodeIndo(periode)} · atur ukuran kertas A4`
  document.getElementById('cetakPeriode').innerHTML =
    `<b>${esc(periodeIndo(periode))}</b> &middot; atur ukuran kertas A4`

  document.getElementById('cetakBadan').innerHTML = `
  <div class="print-head" style="display:block;margin-bottom:20px">
    <div style="display:flex;align-items:flex-start;gap:14px;border-bottom:2px solid #18181b;padding-bottom:14px">
      <div style="font-size:32px;line-height:1">💰</div>
      <div style="flex:1">
        <h2 style="font-family:var(--font-display);font-size:21px;letter-spacing:-.4px">
          Laporan Keuangan Bulanan
        </h2>
        <p style="font-size:12.5px;color:#52525b;margin-top:3px">
          Periode <b>${esc(periodeIndo(periode))}</b>
        </p>
      </div>
      <div style="text-align:right;font-size:11.5px;color:#71717a;line-height:1.7">
        <div><b style="color:#111">${esc(d.user.nama)}</b></div>
        <div>Dicetak: ${esc(dicetak)}</div>
      </div>
    </div>
  </div>

  <div class="grid g-4" style="gap:12px;margin-bottom:20px">
    ${kartuStat('Total Pemasukan', rupiah(r.pemasukan))}
    ${kartuStat('Total Pengeluaran', rupiah(r.pengeluaran))}
    ${kartuStat('Sisa Bulan Ini', rupiah(r.sisa))}
    ${kartuStat('Rata-rata / Hari', rupiah(d.rata_harian))}
  </div>

  <div class="card" style="margin-bottom:20px">
    <div class="card-body tight">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;font-size:13px">
        <div>
          <div class="cat-sub">Jumlah Transaksi</div>
          <b>${r.jumlah} transaksi</b>
        </div>
        <div>
          <div class="cat-sub">Hari Aktif</div>
          <b>${r.hari_aktif} hari</b>
        </div>
        <div>
          <div class="cat-sub">Rasio Pengeluaran</div>
          <b>${String(r.persen).replace('.', ',')}% dari pemasukan</b>
        </div>
      </div>
      ${perbandingan}
    </div>
  </div>

  ${tabelRekap('PENGELUARAN', d.rekap_keluar, r.pengeluaran, r.pengeluaran, true)}
  ${tabelRekap('PEMASUKAN', d.rekap_masuk, r.pemasukan, r.pemasukan, false)}

  <div class="card">
    <div class="card-head">
      <h2>Rincian Transaksi Harian</h2>
      <p>${esc(periodeIndo(periode))}</p>
    </div>
    <div class="card-body flush">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:130px">Tanggal</th>
              <th>Kategori</th>
              <th>Keterangan</th>
              <th class="t-center" style="width:80px">Metode</th>
              <th class="t-right" style="width:80px">Jenis</th>
              <th class="t-right" style="width:140px">Nominal</th>
            </tr>
          </thead>
          <tbody>${rincianHarian(d.transaksi)}</tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="t-right">SELISIH (Pemasukan − Pengeluaran)</td>
              <td class="t-right t-num">${esc(rupiah(r.sisa))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>

  <div class="print-foot">
    APK Keuangan &middot; Laporan keuangan <b>${esc(d.user.nama)}</b>
    &middot; Periode ${esc(periodeIndo(periode))}
    &middot; Dicetak ${esc(dicetak)}
  </div>`

  return d
}

/* ------------------------------------------------------------------ main */

const params = new URLSearchParams(location.search)
const d = new Date()
const skrg = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const periode = /^\d{4}-\d{2}$/.test(params.get('periode') || '') ? params.get('periode') : skrg

;(async () => {
  try {
    const json = await reqApi('dashboard.php?action=rekap&periode=' + encodeURIComponent(periode))
    const data = render(json.data, periode)

    // Muat modul export CSV lalu pasang tombolnya.
    await new Promise((resolve) => {
      const s = document.createElement('script')
      s.src = '/assets/js/csv.js'
      s.onload = resolve
      s.onerror = resolve
      document.body.appendChild(s)
    })
    if (typeof window.apkExportCsv === 'function') {
      document.getElementById('cetakExport').addEventListener('click', () => {
        window.apkExportCsv(data, periode)
      })
    }
  } catch (err) {
    if (err.message !== 'Sesi berakhir.') {
      document.getElementById('cetakBadan').innerHTML =
        `<div class="empty" style="padding:60px">
           <div class="empty-ico">⚠️</div>
           <h3>Gagal memuat laporan</h3>
           <p>${esc(err.message)}</p>
         </div>`
    }
  }
})()
