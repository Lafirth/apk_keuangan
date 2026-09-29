/* =====================================================================
   APK KEUANGAN — Frontend Logic
   ===================================================================== */
(function () {
  'use strict';

  const APP = window.APP || {};
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------------------------------------------------------------- utils */
  const nf = new Intl.NumberFormat('id-ID');

  function rupiah(n, withSymbol = true) {
    const v = Number(n) || 0;
    return (withSymbol ? 'Rp ' : '') + nf.format(v);
  }

  function angka(v) {
    return Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
  }

  function hexToRgba(hex, a) {
    const h = (hex || '#6366f1').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  /* Tanggal hari ini according zona waktu lokal. toISOString() memakai UTC,
     jadi di WIB (UTC+7) antara pukul 00.00-06.59 hasilnya "kemarin". */
  function hariIni() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
         + `-${String(d.getDate()).padStart(2, '0')}`;
  }

  function tglIndo(iso) {
    if (!iso) return '-';
    const d = new Date(iso + 'T00:00:00');
    return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }

  function tglPendek(iso) {
    if (!iso) return '-';
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)}`;
  }

  function tglIndoPendek(iso) {
    if (!iso) return '-';
    const d = new Date(iso + 'T00:00:00');
    return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  }

  /* Helper dipakai renderer halaman lain (rekap.js, print.js) yang dimuat
     setelah app.js, jadi diekspos lewat window. */
  window.apkUtil = {
    nf, BULAN, HARI,
    rupiah, angka, esc, hexToRgba,
    tglIndo, tglPendek, tglIndoPendek, hariIni,
  };

  /* --------------------------------------------------------------- toast */
  function toast(pesan, tipe = 'ok') {
    const wrap = $('#toastWrap');
    if (!wrap) return;
    const ico = { ok: '✅', err: '⚠️', info: 'ℹ️' }[tipe] || 'ℹ️';
    const el = document.createElement('div');
    el.className = 'toast ' + tipe;
    el.innerHTML = `<span class="toast-ico">${ico}</span><span>${esc(pesan)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 300);
    }, 3400);
  }
  window.apkToast = toast;

  /* ----------------------------------------------------------------- api */
  async function api(path, data = null) {
    const url = APP.base + '/api/' + path;
    const opt = { headers: { 'X-Requested-With': 'XMLHttpRequest' } };

    if (data) {
      opt.method = 'POST';
      opt.body = data instanceof FormData ? data : Object.assign(new FormData(), data);
      opt.body.set('csrf', APP.csrf);
    }

    let res;
    try {
      res = await fetch(url, opt);
    } catch (e) {
      throw new Error('Tidak dapat terhubung ke server.');
    }

    let json;
    try {
      json = await res.json();
    } catch (e) {
      throw new Error('Respons server tidak valid.');
    }

    if (res.status === 401) {
      toast('Sesi berakhir, silakan login kembali.', 'err');
      setTimeout(() => location.href = '/login.html', 1200);
      throw new Error('Unauthorized');
    }
    if (!json.success) throw new Error(json.message || 'Terjadi kesalahan.');
    return json;
  }
  window.apkApi = api;

  function btnLoading(btn, on, text = 'Menyimpan…') {
    if (!btn) return;
    if (on) {
      btn.dataset.html = btn.innerHTML;
      btn.classList.add('loading');
      btn.innerHTML = `<span class="spin" style="display:inline-block">◐</span> ${text}`;
    } else {
      btn.classList.remove('loading');
      if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
    }
  }

  /* --------------------------------------------------------------- modal */
  function openModal(id) {
    const m = typeof id === 'string' ? $('#' + id) : id;
    if (!m) return;
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    const first = m.querySelector('input:not([type=hidden]), select, button');
    if (first) setTimeout(() => first.focus(), 90);
  }

  function closeModal(m) {
    const el = typeof m === 'string' ? $('#' + m) : (m && m.closest ? m.closest('.modal') : null);
    if (el) el.hidden = true;
    document.body.style.overflow = '';
  }

  /* -------------------------------------------------------- konfirmasi */
  let konfirmCb = null;
  function konfirmasi(pesan, judul, cb) {
    $('#konfirmPesan').textContent = pesan || 'Tindakan ini tidak dapat dibatalkan.';
    $('#konfirmTitle').textContent = judul || 'Hapus data?';
    konfirmCb = cb;
    openModal('modalKonfirmasi');
  }
  window.apkKonfirmasi = konfirmasi;

  /* =====================================================================
     SIDEBAR
     ===================================================================== */
  const burger = $('#burger'), overlay = $('#sidebarOverlay');
  if (burger) burger.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  if (overlay) overlay.addEventListener('click', () => document.body.classList.remove('nav-open'));

  /* Close semua modal saat klik [data-close] */
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-close]');
    if (c) { closeModal(c); return; }
    const o = e.target.closest('[data-modal]');
    if (o) { prepareForm(); openModal(o.dataset.modal); }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $$('.modal:not([hidden])').forEach(closeModal);
      document.body.classList.remove('nav-open');
    }
  });

  $('#konfirmYa')?.addEventListener('click', async () => {
    const cb = konfirmCb;
    konfirmCb = null;
    closeModal('modalKonfirmasi');
    if (cb) await cb();
  });

  /* =====================================================================
     FORM TRANSAKSI
     ===================================================================== */
  const fTgl = $('#trxTanggal'), fNom = $('#trxNominal'), fKat = $('#trxKategori'),
        fKet = $('#trxKeterangan'), fMet = $('#trxMetode'), fJenis = $('#trxJenis'),
        fId = $('#trxId'), fForm = $('#formTransaksi'), fSubmit = $('#trxSubmit'),
        fTitle = $('#modalTitle');

  function isiKategori(jenis, terpilih = '') {
    const list = APP.kat[jenis] || [];
    fKat.innerHTML = list.map(k =>
      `<option value="${k.id}" ${String(k.id) === String(terpilih) ? 'selected' : ''}>
         ${k.ikon} ${esc(k.nama)}
       </option>`).join('');
    if (!list.length) fKat.innerHTML = '<option value="">— belum ada kategori —</option>';
  }

  /** Reset form ke kondisi tambah baru */
  function prepareForm(trx = null) {
    fForm.reset();
    fId.value = '';
    fTitle.textContent = 'Tambah Transaksi';
    fSubmit.className = 'btn btn-primary';
    fSubmit.querySelector('.btn-text').textContent = 'Simpan';

    fTgl.value = trx ? trx.tanggal : hariIni();

    if (trx) {
      setJenis(trx.jenis, false);
      isiKategori(trx.jenis, trx.kategori_id);
      fNom.value = nf.format(Math.round(trx.nominal));
      fKet.value = trx.keterangan || '';
      fMet.value = trx.metode || 'tunai';
      fId.value = trx.id;
      fTitle.textContent = 'Edit Transaksi';
      fSubmit.className = 'btn btn-gold';
      fSubmit.querySelector('.btn-text').textContent = 'Perbarui';
    } else {
      setJenis('keluar', false);
      isiKategori('keluar');
    }
  }
  window.apkPrepareForm = prepareForm;

  function setJenis(j, resetLabel = true) {
    fJenis.value = j;
    $$('#segJenis .seg-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.jenis === j));
    if (resetLabel) isiKategori(j);
  }

  $$('#segJenis .seg-btn').forEach(b => {
    b.addEventListener('click', () => setJenis(b.dataset.jenis));
  });

  // Format nominal saat mengetik
  fNom?.addEventListener('input', () => {
    const n = angka(fNom.value);
    fNom.value = n ? nf.format(n) : '';
  });

  // Chip nominal cepat
  $$('[data-money]').forEach(c => {
    c.addEventListener('click', () => {
      fNom.value = nf.format(Number(c.dataset.money));
      fNom.focus();
    });
  });

  // Ganti tanggal -> judul modal ikut tanggal hari ini
  fTgl?.addEventListener('change', () => {
    const btn = $('[data-modal="modalTransaksi"] span');
    if (btn) btn.textContent = 'Transaksi Baru';
  });

  fForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = fId.value;

    if (angka(fNom.value) <= 0) {
      toast('Nominal harus lebih dari 0.', 'err');
      fNom.focus();
      return;
    }

    const fd = new FormData();
    fd.set('id', id);
    fd.set('tanggal', fTgl.value);
    fd.set('jenis', fJenis.value);
    fd.set('kategori_id', fKat.value);
    fd.set('nominal', fNom.value);
    fd.set('keterangan', fKet.value);
    fd.set('metode', fMet.value);

    btnLoading(fSubmit, true, id ? 'Menyimpan…' : 'Menyimpan…');
    try {
      const r = await api('transaksi.php?action=' + (id ? 'update' : 'simpan'), fd);
      closeModal('modalTransaksi');
      toast(r.message, 'ok');
      refreshAll();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      btnLoading(fSubmit, false);
    }
  });

  /* =====================================================================
     AKSI TABEL (edit / hapus)
     ===================================================================== */
  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-trx]');
    if (!btn) return;
    const id = btn.dataset.trx;
    const act = btn.dataset.act;

    if (act === 'edit') {
      try {
        const r = await api('transaksi.php?action=get&id=' + id);
        prepareForm(r.data);
        openModal('modalTransaksi');
      } catch (err) { toast(err.message, 'err'); }
    }

    if (act === 'hapus') {
      konfirmasi(
        'Transaksi ini akan dihapus permanen dari catatan keuanganmu.',
        'Hapus Transaksi?',
        async () => {
          const fd = new FormData();
          fd.set('id', id);
          try {
            const r = await api('transaksi.php?action=hapus', fd);
            toast(r.message, 'ok');
            refreshAll();
          } catch (err) { toast(err.message, 'err'); }
        }
      );
    }
  });

  /* =====================================================================
     HALAMAN TRANSAKSI
     ===================================================================== */
  const page = document.body.dataset.page;

  if (page === 'transaksi') {
    const fPeriode = $('#fPeriode'), fJenis = $('#fJenis'), fKat = $('#fKategori'),
          fCari = $('#fCari'), fReset = $('#fReset');
    let _timer = null;

    async function loadTable() {
      const params = new URLSearchParams({
        periode: fPeriode.value, jenis: fJenis.value,
        kategori_id: fKat.value, cari: fCari.value.trim()
      });
      try {
        const r = await api('transaksi.php?list&' + params);
        renderTable(r.data);
        renderSummary(r.summary);
      } catch (err) { toast(err.message, 'err'); }
    }

    function renderSummary(s) {
      const el = $('#sumJumlah');   if (el) el.textContent = s.jumlah + ' transaksi';
      const mi = $('#sumMasuk');   if (mi) mi.textContent = rupiah(s.masuk);
      const ke = $('#sumKeluar');  if (ke) ke.textContent = rupiah(s.keluar);
      const se = $('#sumSelisih');
      if (se) {
        se.textContent = (s.selisih >= 0 ? '+' : '-') + rupiah(Math.abs(s.selisih));
        se.className = 'stat-val sm strong ' + (s.selisih >= 0 ? 'money-in' : 'money-out');
      }
    }

    function renderTable(rows) {
      const tbody = $('#trxBody'), empty = $('#trxEmpty'), wrap = $('#trxWrap');
      const mlist = $('#trxMobile');

      if (!rows.length) {
        if (tbody) tbody.innerHTML = '';
        if (wrap) wrap.hidden = true;
        if (empty) empty.hidden = false;
        if (mlist) mlist.innerHTML = '';
        return;
      }
      if (wrap) wrap.hidden = false;
      if (empty) empty.hidden = true;

      if (tbody) {
        tbody.innerHTML = rows.map(r => {
          const masuk = r.jenis === 'masuk';
          const warna = r.kategori_warna || '#6366f1';
          const meth  = { tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', debit: 'Debit' }[r.metode] || r.metode;
          return `<tr>
            <td class="nowrap">
              <b class="tnum">${esc(tglIndoPendek(r.tanggal))}</b>
              <div class="cat-sub">${esc(meth)}</div>
            </td>
            <td>
              <div class="cat-cell">
                <div class="cat-ico" style="--c-bg:${hexToRgba(warna, .16)};--c-line:${hexToRgba(warna, .42)}">${esc(r.kategori_ikon || '📦')}</div>
                <div style="min-width:0">
                  <div class="cat-nm">${esc(r.kategori_nama || 'Tanpa Kategori')}</div>
                  <div class="cat-sub">${esc(r.keterangan || '—')}</div>
                </div>
              </div>
            </td>
            <td><span class="badge ${masuk ? 'badge-in' : 'badge-out'}">${masuk ? 'Masuk' : 'Keluar'}</span></td>
            <td class="t-right t-num nowrap">
              <span class="${masuk ? 'money-in' : 'money-out'}">${masuk ? '+' : '-'} ${rupiah(r.nominal)}</span>
            </td>
            <td class="t-right">
              <div class="row-acts">
                <button class="act e" data-trx="${r.id}" data-act="edit" title="Edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>
                  </svg>
                </button>
                <button class="act d" data-trx="${r.id}" data-act="hapus" title="Hapus">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>`;
        }).join('');
      }

      if (mlist) {
        mlist.innerHTML = rows.map(r => {
          const masuk = r.jenis === 'masuk';
          const warna = r.kategori_warna || '#6366f1';
          return `<div class="mitem">
            <div class="cat-ico" style="--c-bg:${hexToRgba(warna, .16)};--c-line:${hexToRgba(warna, .42)}">${esc(r.kategori_ikon || '📦')}</div>
            <div class="mitem-body">
              <b>${esc(r.kategori_nama || 'Tanpa Kategori')}</b>
              <small>${esc(tglIndo(r.tanggal))} · ${esc(r.keterangan || '—')}</small>
            </div>
            <div class="mitem-amt">
              <b class="${masuk ? 'money-in' : 'money-out'}">${masuk ? '+' : '-'} ${rupiah(r.nominal)}</b>
              <small>${esc((({ tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', debit: 'Debit' })[r.metode]) || '')}</small>
            </div>
          </div>`;
        }).join('');
      }
    }

    [fPeriode, fJenis, fKat].forEach(el => el && el.addEventListener('change', loadTable));
    fCari?.addEventListener('input', () => {
      clearTimeout(_timer);
      _timer = setTimeout(loadTable, 320);
    });
    fReset?.addEventListener('click', () => {
      fCari.value = ''; fJenis.value = ''; fKat.value = ''; fPeriode.value = fPeriode.dataset.awal;
      loadTable();
    });

    loadTable();
  }

  /* =====================================================================
     HALAMAN KATEGORI
     ===================================================================== */
  if (page === 'kategori') {
    const EMOJI = ['🍚','🍜','🍔','🍕','☕','🥗','🍎','🛒','🚌','🚗','⛽','🏍️','🚕','🛵','🏠','💡','📶','💧','🛡️','📱','💊','🏥','🎓','📚','✈️','🎬','🎮','🎁','👕','👟','💇','🧴','🐱','💰','💵','🏦','💳','📈','📉','🏆','🎯','⏰','📅','🧾','🏷️','✨','🔧','🚿','🧺','🍼','🚌','🅿️','🌐','☔'];

    const WARNA = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#fb7185','#f97316','#f59e0b',
                   '#10b981','#34d399','#14b8a6','#22d3ee','#38bdf8','#3b82f6','#a855f7','#94a3b8'];

    let katId = 0;
    const mKat = $('#modalKategori'), fKatForm = $('#formKategori');

    // Build picker ikon & warna
    const ep = $('#emojiPick');
    if (ep) ep.innerHTML = EMOJI.map(e => `<button type="button" data-emoji="${e}">${e}</button>`).join('');
    const cp = $('#warnaPick');
    if (cp) cp.innerHTML = WARNA.map(w =>
      `<button type="button" data-warna="${w}" style="background:${w}"></button>`).join('');

    ep?.addEventListener('click', e => {
      const b = e.target.closest('[data-emoji]');
      if (!b) return;
      $$('#emojiPick button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      $('#katIkon').value = b.dataset.emoji;
    });
    cp?.addEventListener('click', e => {
      const b = e.target.closest('[data-warna]');
      if (!b) return;
      $$('#warnaPick button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      $('#katWarna').value = b.dataset.warna;
    });

    function openKategoriForm(k = null) {
      katId = k ? k.id : 0;
      fKatForm.reset();
      $('#katId').value = k ? k.id : '';
      $('#katJudulModal').textContent = k ? 'Edit Kategori' : 'Tambah Kategori';
      $('#katIkon').value = k ? k.ikon : '🏷️';
      $('#katWarna').value = k ? k.warna : '#6366f1';
      $('#katJenis').value = k ? k.jenis : 'keluar';

      $$('#emojiPick button').forEach(x => x.classList.toggle('sel', x.dataset.emoji === $('#katIkon').value));
      $$('#warnaPick button').forEach(x => x.classList.toggle('sel', x.dataset.warna.toLowerCase() === $('#katWarna').value.toLowerCase()));

      openModal('modalKategori');
    }
    window.apkOpenKategori = openKategoriForm;

    $$('[data-new-kategori]').forEach(b => b.addEventListener('click', () => openKategoriForm()));

    fKatForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData();
      fd.set('id', $('#katId').value);
      fd.set('nama', $('#katNama').value);
      fd.set('ikon', $('#katIkon').value);
      fd.set('warna', $('#katWarna').value);
      fd.set('jenis', $('#katJenis').value);
      fd.set('is_active', 1);

      const btn = $('#katSubmit');
      btnLoading(btn, true, 'Menyimpan…');
      try {
          const r = await api('kategori.php?action=' + (katId ? 'update' : 'simpan'), fd);
          closeModal('modalKategori');
          toast(r.message, 'ok');
          muatUlangKategori();
        } catch (err) {
        toast(err.message, 'err');
        btnLoading(btn, false);
      }
    });

    document.addEventListener('click', e => {
      const b = e.target.closest('[data-kat]');
      if (!b) return;
      const id = b.dataset.kat, act = b.dataset.katAct;
      const row = b.closest('[data-kat-row]');
      const nama = row?.querySelector('.cat-nm')?.textContent || 'kategori ini';

      if (act === 'edit') {
        // Kartu dirender klien dari window.APP.kat, jadi datanya diambil dari
        // sana - bukan dari atribut data-* seperti di versi PHP.
        const kat = [...(window.APP.kat.keluar || []), ...(window.APP.kat.masuk || [])]
          .find(k => String(k.id) === String(id));
        if (kat) openKategoriForm(kat);
      }

      if (act === 'hapus') {
        konfirmasi(
          `Kategori "${nama}" akan dihapus. Transaksi yang memakainya tidak ikut terhapus, namun menjadi "Tanpa Kategori".`,
          'Hapus Kategori?',
          async () => {
            const fd = new FormData();
            fd.set('id', id);
            try {
              const r = await api('kategori.php?action=hapus', fd);
              toast(r.message, 'ok');
              muatUlangKategori();
            } catch (err) { toast(err.message, 'err'); }
          }
        );
      }
    });

    function muatUlangKategori() {
      if (typeof window.apkAfterMutasi === 'function') window.apkAfterMutasi();
      else setTimeout(() => location.reload(), 550);
    }
  }

  /* =====================================================================
     DASHBOARD
     ===================================================================== */
  if (page === 'dashboard') {
    const selPeriode = $('#dashPeriode');
    let chartHarian, chartDonat, chartTren;

    Chart.defaults.color = '#9aa5c4';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 12;

    const tipStyle = {
      backgroundColor: 'rgba(16, 21, 36, .96)',
      borderColor: 'rgba(255,255,255,.14)',
      borderWidth: 1,
      padding: 12,
      titleFont: { weight: '700', size: 13 },
      bodyFont: { size: 12.5 },
      cornerRadius: 11,
      displayColors: true,
      boxPadding: 5
    };

    function grad(ctx, c1, c2) {
      const g = ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      return g;
    }

    async function loadDashboard() {
      const p = selPeriode?.value || '';
      try {
        const r = await api('dashboard.php?action=statistik&periode=' + p);
        render(r.data);
      } catch (err) { toast(err.message, 'err'); }
    }

    function render(d) {
      const r = d.ringkasan, pb = d.perbandingan;

      const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
      set('#kMasuk', rupiah(r.pemasukan));
      set('#kKeluar', rupiah(r.pengeluaran));
      set('#kSisa', rupiah(r.sisa));
      set('#kSaldo', rupiah(d.saldo));
      set('#kHariIni', rupiah(d.hari_ini.keluar));
      set('#kRata', rupiah(d.rata_harian));
      set('#kBulanLabel', BULAN[+selPeriode.value.split('-')[1] - 1]);
      set('#kJumlahTrx', r.jumlah + ' transaksi / ' + r.hari_aktif + ' hari aktif');

      // Persentase pengeluaran
      const pct = r.persen || 0;
      const bar = $('#kPersenBar');
      if (bar) {
        bar.style.width = Math.min(pct, 100) + '%';
        bar.parentElement.className = 'bar ' + (pct > 100 ? 'red' : pct > 80 ? 'gold' : 'green');
      }
      set('#kPersenTxt', pct + '% dari pemasukan');

      // Trend banding bulanan
      const tr = $('#kTrend');
      if (tr) {
        if (pb.bulan_lalu > 0) {
          const naik = pb.selisih > 0;
          tr.className = 'trend ' + (naik ? 'up' : pb.selisih < 0 ? 'down' : 'flat');
          tr.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="${naik ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5'}"/></svg>
            ${Math.abs(pb.persen)}% vs ${esc(pb.bulan_lalu_nama)}`;
        } else {
          tr.className = 'trend flat';
          tr.textContent = 'Belum ada pembanding';
        }
      }

      // List 7 transaksi terakhir
      const list = $('#trxTerbaru');
      if (list) {
        list.innerHTML = d.terakhir.length ? d.terakhir.map(t => {
          const masuk = t.jenis === 'masuk', c = t.kategori_warna || '#6366f1';
          return `<div class="mitem">
            <div class="cat-ico" style="--c-bg:${hexToRgba(c, .16)};--c-line:${hexToRgba(c, .42)}">${esc(t.kategori_ikon || '📦')}</div>
            <div class="mitem-body">
              <b>${esc(t.kategori_nama || 'Tanpa Kategori')}</b>
              <small>${esc(tglIndoPendek(t.tanggal))}${t.keterangan ? ' · ' + esc(t.keterangan) : ''}</small>
            </div>
            <div class="mitem-amt">
              <b class="${masuk ? 'money-in' : 'money-out'}">${masuk ? '+' : '-'} ${rupiah(t.nominal)}</b>
            </div>
          </div>`;
        }).join('') : '<div class="empty" style="padding:26px"><div class="empty-ico">📭</div><h3>Belum ada transaksi</h3><p>Mulai catat pengeluaran harianmu dengan tombol Transaksi Baru.</p></div>';
      }

      // Grafik harian
      const hK = d.harian_keluar, hM = d.harian_masuk;
      const daysInMonth = new Date(+selPeriode.value.split('-')[0], +selPeriode.value.split('-')[1], 0).getDate();
      const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
      const map = (rows) => {
        const o = {};
        rows.forEach(x => { o[+x.tanggal.slice(-2)] = Number(x.total); });
        return labels.map(l => o[l] || 0);
      };

      if (chartHarian) {
        chartHarian.data.labels = labels;
        chartHarian.data.datasets[0].data = map(hK);
        chartHarian.data.datasets[1].data = map(hM);
        chartHarian.update();
      }

      // Donat kategori
      const kat = d.kategori || [];
      if (chartDonat) {
        chartDonat.data.labels = kat.map(k => k.nama);
        chartDonat.data.datasets[0].data = kat.map(k => Number(k.total));
        chartDonat.data.datasets[0].backgroundColor = kat.map(k => k.warna);
        chartDonat.update();
      }

      // Rekap kategori list
      const rek = $('#rekKategori');
      if (rek) {
        const total = kat.reduce((a, b) => a + Number(b.total), 0) || 1;
        rek.innerHTML = kat.length ? kat.map(k => {
          const p = (Number(k.total) / total * 100);
          return `<div class="rek-item">
            <div class="rek-top">
              <div class="cat-cell">
                <div class="cat-ico" style="--c-bg:${hexToRgba(k.warna, .16)};--c-line:${hexToRgba(k.warna, .42)}">${esc(k.ikon)}</div>
                <div>
                  <div class="cat-nm">${esc(k.nama)}</div>
                  <div class="cat-sub">${k.jml} transaksi</div>
                </div>
              </div>
              <div class="rek-amt">
                <b class="money-out">${rupiah(k.total)}</b>
                <small>dari ${rupiah(total)}</small>
              </div>
            </div>
            <div class="rek-bar">
              <div class="bar red"><i style="width:${p}%;background:linear-gradient(90deg,${k.warna},${hexToRgba(k.warna, .55)})"></i></div>
              <span class="rek-pct">${p.toFixed(1)}%</span>
            </div>
          </div>`;
        }).join('') : '<div class="empty" style="padding:26px"><div class="empty-ico">📊</div><h3>Belum ada pengeluaran</h3><p>Belum ada pengeluaran tercatat di bulan ini.</p></div>';
      }

      // Grafik tren 6 bulan
      const t = d.tren || [];
      if (chartTren) {
        chartTren.data.labels = t.map(x => BULAN[+x.periode.split('-')[1] - 1].slice(0, 3) + ' ' + x.periode.slice(2, 4));
        chartTren.data.datasets[0].data = t.map(x => Number(x.pemasukan));
        chartTren.data.datasets[1].data = t.map(x => Number(x.pengeluaran));
        chartTren.update();
      }
    }

    // Buat chart
    const chHarian = $('#chartHarian');
    if (chHarian) {
      const ctx = chHarian.getContext('2d');
      chartHarian = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [
          { label: 'Pengeluaran', data: [], backgroundColor: grad(ctx, 'rgba(244,63,94,.95)', 'rgba(244,63,94,.25)'),
            borderRadius: 6, borderSkipped: false, maxBarThickness: 22 },
          { label: 'Pemasukan', data: [], backgroundColor: grad(ctx, 'rgba(16,185,129,.95)', 'rgba(16,185,129,.22)'),
            borderRadius: 6, borderSkipped: false, maxBarThickness: 22 }
        ]},
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 15, font: { weight: '600' } } },
            tooltip: { ...tipStyle, callbacks: {
              title: items => 'Tanggal ' + items[0].label,
              label: c => ' ' + c.dataset.label + ': ' + rupiah(c.raw)
            }}
          },
          scales: {
            x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 16 } },
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.06)' },
                 ticks: { callback: v => v >= 1e6 ? (v / 1e6) + 'jt' : v >= 1e3 ? (v / 1e3) + 'rb' : v } }
          }
        }
      });
    }

    const chDonat = $('#chartDonat');
    if (chDonat) {
      chartDonat = new Chart(chDonat, {
        type: 'doughnut',
        data: { labels: [], datasets: [{
          data: [], backgroundColor: [],
          borderColor: 'rgba(12, 17, 32, .9)', borderWidth: 3, hoverOffset: 10
        }]},
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '64%',
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 12, font: { size: 11.5 } } },
            tooltip: { ...tipStyle, callbacks: {
              label: c => {
                const tot = c.dataset.data.reduce((a, b) => a + b, 0) || 1;
                return ' ' + c.label + ': ' + rupiah(c.raw) + ' (' + (c.raw / tot * 100).toFixed(1) + '%)';
              }
            }}
          }
        }
      });
    }

    const chTren = $('#chartTren');
    if (chTren) {
      const ctx = chTren.getContext('2d');
      chartTren = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [
          { label: 'Pemasukan', data: [], borderColor: '#10b981', backgroundColor: grad(ctx, 'rgba(16,185,129,.28)', 'rgba(16,185,129,0)'),
            fill: true, tension: .38, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#10b981',
            pointBorderColor: '#0b1020', pointBorderWidth: 2, pointHoverRadius: 6 },
          { label: 'Pengeluaran', data: [], borderColor: '#f43f5e', backgroundColor: grad(ctx, 'rgba(244,63,94,.24)', 'rgba(244,63,94,0)'),
            fill: true, tension: .38, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#f43f5e',
            pointBorderColor: '#0b1020', pointBorderWidth: 2, pointHoverRadius: 6 }
        ]},
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 15, font: { weight: '600' } } },
            tooltip: { ...tipStyle, callbacks: { label: c => ' ' + c.dataset.label + ': ' + rupiah(c.raw) } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.06)' },
                 ticks: { callback: v => v >= 1e6 ? (v / 1e6) + 'jt' : v >= 1e3 ? (v / 1e3) + 'rb' : v } }
          }
        }
      });
    }

    selPeriode?.addEventListener('change', loadDashboard);
    loadDashboard();
  }

  /* =====================================================================
     SALDO AWAL (dashboard)
     ===================================================================== */
  const btnSaldo = $('#btnSaldoAwal');
  if (btnSaldo) {
    btnSaldo.addEventListener('click', async () => {
      try {
        const r = await api('dashboard.php?action=saldo_awal');
        $('#saldoAwalInput').value = nf.format(Math.round(r.data.saldo_awal));
        openModal('modalSaldo');
      } catch (err) { toast(err.message, 'err'); }
    });

    const inp = $('#saldoAwalInput');
    inp?.addEventListener('input', () => { inp.value = nf.format(angka(inp.value)); });

    $('#formSaldo')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData();
      fd.set('saldo_awal', inp.value);
      const btn = $('#saldoSubmit');
      btnLoading(btn, true);
      try {
        const r = await api('dashboard.php?action=saldo_awal', fd);
        closeModal('modalSaldo');
        toast(r.message, 'ok');
        const s = $('#sideSaldo');
        if (s) s.textContent = 'Rp ' + nf.format(Math.round(r.data.saldo));
        setTimeout(() => location.reload(), 600);
      } catch (err) { toast(err.message, 'err'); btnLoading(btn, false); }
    });
  }

  /* =====================================================================
     REFRESH SETELAH MUTASI
     ===================================================================== */
  function refreshAll() {
    // Halaman dengan renderer sendiri (kategori, rekap) menanganinya sendiri
    // supaya tidak perlu muat ulang seluruh halaman.
    if (typeof window.apkAfterMutasi === 'function') { window.apkAfterMutasi(); return; }
    if (page === 'dashboard') { loadDashboard(); return; }
    if (page === 'transaksi') {
      const p = $('#fPeriode');
      if (p) {
        const ev = new Event('change');
        p.dispatchEvent(ev);
      }
    }
    // Halaman lain: muat ulang agar konsisten
    setTimeout(() => location.reload(), 500);
  }

  /* Jam live di topbar */
  const jam = $('#jamHidup');
  if (jam) {
    setInterval(() => {
      const d = new Date();
      const bln = BULAN[d.getMonth()];
      jam.textContent = `${HARI[d.getDay()]}, ${d.getDate()} ${bln} ${d.getFullYear()} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }, 30000);
  }

  /* Init form transaksi. app.js di-inject boot.js setelah DOMContentLoaded
     sudah lewat, jadi pemanggilan harus langsung, bukan lewat listener. */
  if (fForm) prepareForm();

})();
