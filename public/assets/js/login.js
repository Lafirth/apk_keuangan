/**
 * Halaman login: kirim FormData ke /api/auth.php, lalu pindah ke aplikasi.
 *
 * Di versi PHP ini adalah POST biasa yang me-redirect ulang. Di sini cukup
 * fetch karena cookie sesi ikut di respons dan redirect di sisi klien.
 */

const form = document.getElementById('loginForm')
const submit = document.getElementById('loginSubmit')
const errBox = document.getElementById('loginError')
const errText = document.getElementById('loginErrorText')
const userInput = document.getElementById('loginUser')
const passInput = document.getElementById('passInput')

function tampilError(pesan) {
  errText.textContent = pesan
  errBox.hidden = false
}

document.getElementById('togglePass').addEventListener('click', () => {
  passInput.type = passInput.type === 'password' ? 'text' : 'password'
})

/* Blok "Akun demo" disembunyikan di markup dan hanya dibuka kalau server
   mengonfirmasi bahwa ini bukan produksi - jadi credential demo tidak pernah
   terkirim ke browser yang terhubung ke situs publik. */
const demoBox = document.getElementById('authDemo')

/* Kalau cookie sesi masih hidup, tidak perlu tampilkan form lagi. */
;(async () => {
  try {
    const res = await fetch('/api/auth.php?action=whoami')
    const json = await res.json().catch(() => null)

    if (json?.demo && demoBox) {
      demoBox.hidden = false
      document.getElementById('fillDemo').addEventListener('click', () => {
        userInput.value = 'christa'
        passInput.value = 'wira26'
      })
    }

    if (res.ok) location.replace('/')
  } catch (err) {
    /* offline: biarkan form tetap tampil, blok demo tetap tersembunyi */
  }
})()

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  errBox.hidden = true

  const label = submit.querySelector('.btn-text').textContent
  submit.disabled = true
  submit.querySelector('.btn-text').textContent = 'Memeriksa…'

  try {
    const res = await fetch('/api/auth.php?action=login', {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: new FormData(form),
    })

    let json = null
    try { json = await res.json() } catch (err) { /* respons non-JSON */ }

    if (!res.ok || !json?.success) {
      tampilError(json?.message || 'Gagal masuk. Coba lagi beberapa saat.')
      passInput.select()
      return
    }

    submit.querySelector('.btn-text').textContent = 'Berhasil! Mengalihkan…'
    location.replace('/')
  } catch (err) {
    tampilError('Tidak dapat terhubung ke server.')
  } finally {
    submit.disabled = false
    submit.querySelector('.btn-text').textContent = label
  }
})
