/**
 * Keluar: POST ke /api/auth.php?action=logout lalu arahkan ke login.
 *
 * Di versi PHP ini adalah tautan GET ke logout.php yang menghapus cookie dan
 * me-redirect. Karena halaman ini sudah HTML statis, cookie dihapus lewat
 * endpoint yang sama lalu redirect dilakukan di sisi klien.
 *
 * Logout memakai POST + token CSRF supaya tidak bisa dipicu diam-diam dari
 * situs lain (CSRF logout bisa memaksa user keluar dari sesinya).
 */

const el = document.getElementById('keluar')

el.innerHTML = `
  <div class="empty" style="margin:120px auto;max-width:420px">
    <div class="empty-ico">⏳</div>
    <h3>Keluar…</h3>
    <p>Mengakhiri sesi.</p>
  </div>`

const AUTH = '/api/auth.php'

try {
  // Ambil token CSRF dulu; whoami juga memberi tahu apakah sesi masih hidup.
  const cek = await fetch(`${AUTH}?action=whoami`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
  const data = cek.ok ? await cek.json().catch(() => null) : null

  const body = new FormData()
  if (data?.csrf) body.set('csrf', data.csrf)

  await fetch(`${AUTH}?action=logout`, {
    method: 'POST',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    body,
  })
} catch (err) {
  // Gagal menjangkau server tidak boleh menahan user keluar; cookie akan
  // ditolak server begitu koneksi kembali.
}

location.replace('/login.html')
