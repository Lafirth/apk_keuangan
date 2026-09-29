# 💰 APK Keuangan (Web & Netlify App)

Aplikasi web pencatatan keuangan harian: catat pemasukan/gaji tiap bulan, rinci pengeluaran harian, serta pantau ringkasan, grafik arus kas, dan rekap siap cetak / export CSV.

Proyek ini mendukung **dua mode penggunaan**:
1. **Mode Netlify (Serverless + Netlify Blobs)**: Berkas statis di `public/` + backend serverless di `netlify/functions/`. Tanpa perlu MySQL/Apache terpisah!
2. **Mode XAMPP (PHP 8 + MySQL)**: Terletak di folder `php/` untuk dijalankan di server lokal Apache & MySQL.

---

## 🔑 Kredensial Default

- **Username**: `christa`
- **Password**: `wira26`

---

## 🚀 Panduan Deploy ke Netlify (netlify.app)

Ada 2 cara mudah untuk mendeploy aplikasi ini ke Netlify:

### Cara 1: Menggunakan Git & GitHub (Direkomendasikan)

1. **Inisialisasi & Push ke GitHub**:
   Jika belum memiliki remote repository di GitHub, buat repositori baru di [GitHub](https://github.com/new), lalu jalankan perintah berikut di terminal:
   ```bash
   git add .
   git commit -m "Initial commit for Netlify deployment"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```

2. **Hubungkan ke Netlify**:
   - Buka [app.netlify.com](https://app.netlify.com/) dan login.
   - Klik **"Add new site"** > **"Import an existing project"**.
   - Pilih **GitHub** dan pilih repositori proyek ini.

3. **Konfigurasi Build**:
   Netlify akan otomatis membaca konfigurasi dari `netlify.toml`:
   - **Base directory**: (kosongkan)
   - **Build command**: `npm install --omit=dev --no-audit --no-fund`
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`

4. **Wajib: Set Environment Variable `SESSION_SECRET`**:
   - Sebelum atau setelah klik Deploy, masuk ke menu **Site configuration** > **Environment variables** > **Add a variable**.
   - **Key**: `SESSION_SECRET`
   - **Value**: String acak panjang minimal 32 karakter. Contoh generate di PowerShell:
     ```powershell
     [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
     ```
   - *(Opsional)* Jika ingin menampilkan tombol "Akun demo" di halaman login versi produksi, tambahkan variabel:
     - **Key**: `DEMO_LOGIN`
     - **Value**: `1`

5. **Deploy Site**:
   - Klik **Deploy site**.
   - Tunggu 1–2 menit, dan website APK Keuangan Anda akan aktif di alamat seperti `https://nama-proyek-anda.netlify.app`.

---

### Cara 2: Menggunakan Netlify CLI (Langsung dari Terminal)

Proyek ini sudah terpasang `netlify-cli` di dalam `devDependencies`. Anda dapat mendeploy langsung dari komputer:

1. **Login ke Netlify**:
   ```bash
   npx netlify login
   ```
   *(Browser akan terbuka untuk konfirmasi otorisasi akun Netlify Anda)*

2. **Inisialisasi atau Hubungkan Proyek**:
   ```bash
   npx netlify init
   ```
   Ikuti petunjuk di terminal:
   - Pilih *“Create & configure a new site”*
   - Pilih tim Anda
   - Masukkan nama subdomain yang diinginkan (misal `apk-keuangan-anda`)

3. **Set Environment Variable `SESSION_SECRET` di Netlify**:
   ```bash
   npx netlify env:set SESSION_SECRET "IsiDenganSecretAcakMinimal32Karakter"
   ```

4. **Deploy ke Production**:
   ```bash
   npm run deploy
   ```
   *(Atau jalankan `npx netlify deploy --prod`)*

Setelah selesai, URL situs Netlify aktif Anda akan langsung tercetak di terminal!

---

## 💻 Menjalankan Secara Lokal

### Menjalankan Versi Netlify Secara Lokal
Pastikan berkas `.env` sudah ada (sudah dibuat otomatis dengan `SESSION_SECRET` dan `DEMO_LOGIN=1`):
```bash
npm run dev
```
Aplikasi akan terbuka di `http://localhost:8888` dengan fungsi serverless dan storage Blobs yang diemulasikan secara lokal.

### Menjalankan Pengujian (Testing)
Untuk memastikan seluruh API, autentikasi, transaksi, dan CSRF berjalan 100% lulus:
```bash
npm test
```

Untuk memeriksa sinkronisasi logika antara versi Netlify dan versi PHP:
```bash
npm run check-sync
```

### Menjalankan Versi PHP / XAMPP
1. Pastikan Apache dan MySQL aktif di panel kontrol XAMPP.
2. Impor database di `php/database/apk_keuangan.sql` ke database MySQL `apk_keuangan`.
3. Buka browser di `http://localhost/apk_keuangan/php/`.

---

## 📁 Struktur Berkas

```
apk_keuangan/
├── netlify.toml          # Konfigurasi build, headers keamanan, CSP, & redirects Netlify
├── package.json          # Dependencies (@netlify/blobs, bcryptjs, netlify-cli)
├── .env                  # Variabel lingkungan lokal (SESSION_SECRET) - jangan di-commit!
├── .env.example          # Contoh variabel lingkungan
│
├── public/               # Frontend Statis Netlify (SPA)
│   ├── index.html        # Shell aplikasi utama
│   ├── login.html        # Halaman masuk
│   ├── logout.html       # Handler keluar
│   ├── print.html        # Halaman cetak A4 & export
│   ├── pages/            # Fragmen tampilan (dashboard, transaksi, kategori, rekap)
│   ├── assets/           # CSS & JS klien
│   └── vendor/           # Chart.js
│
├── netlify/functions/    # Backend Serverless Netlify
│   ├── api-auth.mjs      # Endpoint login, logout, whoami
│   ├── api-session.mjs   # Endpoint sesi & preferensi
│   ├── api-transaksi.mjs # CRUD transaksi
│   ├── api-kategori.mjs  # CRUD kategori
│   ├── api-dashboard.mjs # Statistik & ringkasan
│   ├── bootstrap.mjs     # Auth cookie, HMAC token, CSRF
│   ├── store.mjs         # Abstraksi @netlify/blobs
│   └── queries.mjs       # Logika bisnis transaksi & agregasi
│
├── php/                  # Versi asli PHP + MySQL (XAMPP)
└── scripts/              # Skrip pengujian otomatis (123 pengujian in-memory)
```

---

## 🛡️ Keamanan

- **Autentikasi Aman**: Cookie `HttpOnly`, `SameSite=Lax`, ditandatangani dengan HMAC-SHA256.
- **Perlindungan CSRF**: Token stateless berbasis slot waktu dan user ID untuk setiap request mutasi (POST).
- **Proteksi Brute Force**: Rate limiting otomatis pada percobaan login gagal.
- **Keamanan Header**: CSP ketat, X-Frame-Options DENY, X-Content-Type-Options nosniff, dan HSTS.
- **Isolasi Data**: Data keuangan pengguna di Netlify Blobs diisolasi secara ketat per user ID.
