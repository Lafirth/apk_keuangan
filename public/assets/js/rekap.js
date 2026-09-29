/**
 * Halaman rekap bulanan.
 *
 * Di versi PHP seluruh isi halaman ini dirender server-side dari 6 query.
 * Di sini satu panggilan /api/dashboard.php?action=rekap mengembalikan semua
 * agregat yang dibutuhkan, lalu tabel digambar ulang di klien.
 */

const { rupiah, hexToRgba, tglIndo, tglIndoPendek } = window.apkUtil
const BULAN_INDO = [null, 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const METODE = { tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', debit: 'Debit' }

let periode = window.__APK_PERIODE__
let dataTerakhir = null

const $ = (id) => document.getElementById(id)
const set = (id, v) => { const el = $(id); if (el) el.textContent = v }

function periodeIndo(p) {
  const [y, m] = String(p || '').split('-')
  return `${BULAN_INDO[Number(m)] || '-'} ${y || ''}`
}

function geserPeriode(n) {
  const [y, m] = periode.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function hexToRgbaSuffix(hex, suffix) {
  const h = String(hex || '#6366f1').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `${hexToRgba(hex, 1).split(',')[0]}${suffix}`
}

/* ------------------------------------------------------------- tabel rekap */

function barisRekap(list, total, jenis) {
  const terpakai = list.filter((k) => Number(k.total) > 0)
  if (!terpakai.length) {
    const kolom = jenis === 'keluar' ? 5 : 4
    return `<tr><td colspan="${kolom}">
      <div class="empty" style="padding:34px">
        <div class="empty-ico">${jenis === 'keluar' ? '📉' : '📈'}</div>
        <h3>Belum ada ${jenis === 'keluar' ? 'pengeluaran' : 'pemasukan'}</h3>
        <p>Tidak ada ${jenis === 'keluar' ? 'pengeluaran' : 'pemasukan'} tercatat pada ${periodeIndo(periode)}.</p>
      </div>
    </td></tr>`
  }

  const basis = total || 1
  return terpakai.map((k, i) => {
    const pct = (Number(k.total) / basis) * 100
    const bar = jenis === 'keluar'
      ? `<div class="bar" style="width:56px"><i style="width:${pct}%;background:linear-gradient(90deg,${k.warna},${k.warna}88)"></i></div>`
      : `<div class="bar green" style="width:56px"><i style="width:${pct}%"></i></div>`

    const kolomNo = jenis === 'keluar'
      ? `<td class="t-center mute2 t-num">${i + 1}</td>` : ''
    const kelas = jenis === 'keluar' ? 't-right t-num money-out' : 't-right t-num money-in'

    return `<tr>
      ${kolomNo}
      <td>
        <div class="cat-cell">
          <div class="cat-ico" style="--c-bg:${k.warna}1a;--c-line:${k.warna}44">${k.ikon}</div>
          <div class="cat-nm">${k.nama}</div>
        </div>
      </td>
      <td class="t-center t-num">${k.jml}</td>
      <td class="t-right">
        <div class="flex items-center gap-8" style="justify-content:flex-end">
          ${bar}
          <span class="tnum" style="min-width:48px">${pct.toFixed(1).replace('.', ',')}%</span>
        </div>
      </td>
      <td class="${kelas}">${rupiah(k.total)}</td>
    </tr>`
  }).join('')
}

/* ------------------------------------------------------------------ render */

function render(d) {
  dataTerakhir = d
  const r = d.ringkasan
  const pb = d.perbandingan

  set('rekNama', d.user.nama)
  set('rekPeriodeLabel', periodeIndo(periode))
  set('rekMasuk', rupiah(r.pemasukan))
  set('rekKeluar', rupiah(r.pengeluaran))
  set('rekJumlah', String(r.jumlah))
  set('rekSisa', rupiah(r.sisa))
  set('rekRata', rupiah(d.rata_harian))
  set('rekHariAktif', String(r.hari_aktif))
  set('rekTotalKeluar', rupiah(r.pengeluaran))
  set('rekTotalMasuk', rupiah(r.pemasukan))

  /* -------------------------------------------------- perbandingan bulan */
  set('rekBandingLabel', `Perbandingan dengan ${pb.bulan_lalu_nama}`)
  set('rekBandingIni', rupiah(pb.bulan_ini))
  set('rekBandingLalu', rupiah(pb.bulan_lalu))

  const kanan = $('rekBandingKanan')
  if (kanan) {
    if (pb.bulan_lalu > 0) {
      const naik = pb.selisih > 0, sama = pb.selisih === 0
      const cls = naik ? 'up' : (sama ? 'flat' : 'down')
      const kata = naik ? 'Naik' : (sama ? 'Sama' : 'Turun')
      kanan.innerHTML = `
        <span class="trend ${cls}" style="font-size:13px;padding:7px 14px">
          ${kata} ${Math.abs(pb.persen)}%
        </span>
        <p class="tiny mute2" style="margin-top:7px;max-width:260px">
          ${naik ? 'Pengeluaranmu lebih besar dari bulan lalu.'
            : 'Bagus, pengeluaranmu lebih hemat dari bulan lalu.'}
        </p>`
    } else {
      kanan.innerHTML = '<p class="tiny mute2">Belum ada data bulan sebelumnya untuk dibandingkan.</p>'
    }
  }

  /* --------------------------------------------------------- tabel rekap */
  const nKeluar = d.rekap_keluar.filter((k) => Number(k.total) > 0).length
  set('rekKeluarSub', nKeluar ? `${periodeIndo(periode)} · ${nKeluar} kategori terpakai` : `${periodeIndo(periode)} · belum ada pengeluaran`)

  $('rekTabelKeluar').innerHTML = barisRekap(d.rekap_keluar, r.pengeluaran, 'keluar')
  $('rekTabelMasuk').innerHTML = barisRekap(d.rekap_masuk, r.pemasukan, 'masuk')

  /* --------------------------------------------------- hari paling boros */
  let hariTertinggi = 0
  let tanggalTertinggi = null
  for (const h of d.harian_keluar) {
    if (Number(h.total) > hariTertinggi) {
      hariTertinggi = Number(h.total)
      tanggalTertinggi = h.tanggal
    }
  }
  set('rekHariBorosTgl', hariTertinggi > 0 ? tglIndoPendek(tanggalTertinggi) : '-')
  set('rekHariBorosNominal', rupiah(hariTertinggi))

  /* ---------------------------------------------------- kategori terbesar */
  const top = d.rekap_keluar.find((k) => Number(k.total) > 0)
  if (top) {
    set('rekTopNama', top.nama)
    set('rekTopNominal', rupiah(top.total))
    set('rekTopIkon', top.ikon)
    $('rekTopIkon').style.setProperty('--c-bg', hexToRgbaSuffix(top.warna, '1a'))
    $('rekTopIkon').style.setProperty('--c-line', hexToRgbaSuffix(top.warna, '44'))
  } else {
    set('rekTopNama', '-')
    set('rekTopNominal', 'Rp 0')
    set('rekTopIkon', '—')
  }

  /* ------------------------------------------------------------- rasio */
  set('rekPersen', `${String(r.persen).replace('.', ',')}%`)
  const bar = $('rekPersenBar'), wrap = $('rekPersenBarWrap')
  if (bar) bar.style.width = Math.min(Number(r.persen), 100) + '%'
  if (wrap) wrap.className = 'bar ' + (r.persen > 100 ? 'red' : (r.persen > 80 ? 'gold' : 'green'))

  /* ---------------------------------------------------- navigasi bulan */
  set('rekPrevLabel', BULAN_INDO[Number(geserPeriode(-1).split('-')[1])])
  set('rekNextLabel', BULAN_INDO[Number(geserPeriode(1).split('-')[1])])
}

async function muat() {
  try {
    const res = await window.apkApi('dashboard.php?action=rekap&periode=' + encodeURIComponent(periode))
    render(res.data)

    // Sinkronkan URL & dropdown supaya tombol back dan refresh konsisten.
    const url = new URL(location.href)
    url.searchParams.set('page', 'rekap')
    url.searchParams.set('periode', periode)
    history.replaceState(null, '', url)
    $('rekPeriode').value = periode
    window.__APK_SET_CETAK__(periode)
  } catch (err) {
    window.apkToast(err.message, 'err')
  }
}

function pindah(n) {
  periode = geserPeriode(n)
  muat()
}

window.apkAfterMount = function apkAfterMountRekap({ periodeFromUrl, setCetak }) {
  periode = periodeFromUrl
  window.__APK_SET_CETAK__ = setCetak

  $('rekPeriode').addEventListener('change', (e) => {
    periode = e.target.value
    muat()
  })
  $('rekPrev').addEventListener('click', () => pindah(-1))
  $('rekNext').addEventListener('click', () => pindah(1))
  $('rekExport').addEventListener('click', () => {
    if (dataTerakhir) window.apkExportCsv(dataTerakhir, periode)
    else window.apkToast('Data belum siap.', 'err')
  })

  window.apkAfterMutasi = muat
  muat()
}
