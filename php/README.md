# 💰 APK Keuangan

Aplikasi web pencatatan keuangan harian: catat **gaji masuk** setiap bulan, rinci
setiap **pengeluaran per hari**, dan lihat rekap per bulan dengan grafik serta
siap cetak.

- **URL** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: http://localhost/apk_keuangan/php/
- **Username** &nbsp;: `christa`
- **Password** &nbsp;: `wira26`

---

## Fitur

| Halaman | Isi |
|---|---|
| **Dashboard** | Kartu: sisa bulan, pemasukan, pengeluaran, saldo tersedia. Grafik batang arus harian, donat komposisi per kategori, tren 6 bulan, 7 transaksi terakhir, hari paling boros, rata-rata belanja harian. |
| **Transaksi** | Tambah cepat dari mana saja (tombol "Transaksi Baru"), edit, hapus. Filter bulan / jenis / kategori, pencarian live. Ringkasan total di atas tabel. |
| **Kategori** | Tambah / edit / hapus kategori pemasukan dan pengeluaran, lengkap dengan pilih ikon emoji dan warna. |
| **Rekap Bulanan** | Rekap per kategori (jumlah transaksi, persentase, total), navigasi bulan sebelumnya / berikutnya, perbandingan versus bulan lalu, tombol **Cetak / PDF** dan **Export CSV**. |

Tambahan: atur **saldo awal**, pilihan metode (Tunai / Transfer / QRIS / Debit),
notifikasi toast, tampilan responsif (mobile sampai desktop), mode gelap.

---

## Kebutuhan

- XAMPP dengan **Apache** dan **MySQL / MariaDB** (PHP 8.0+)
- Database sudah terisi (lihat bagian Instalasi)

---

## Instalasi dari awal

Database `apk_keuangan` sudah dibuat di komputer ini. Kalau ingin mengulang
dari nol:

**1. Buat database, tabel, dan data awal**

Buka **Command Prompt**:

```bat
cd C:\xampp\mysql\bin
mysql -u root --default-character-set=utf8mb4 -e "source C:/xampp/htdocs/apk_keuangan/php/database/apk_keuangan.sql"
```

Atau lewat **phpMyAdmin**: buka tab Import, pilih file
`htdocs/apk_keuangan/php/database/apk_keuangan.sql`, lalu klik Go.

> Penting: selalu tambahkan `--default-character-set=utf8mb4` agar ikon emoji
> kategori tidak berubah menjadi teks biasa.

**2. Isi data contoh** (opsional, 72 transaksi September supaya tampilan
langsung terlihat jelas)

```bat
mysql -u root --default-character-set=utf8mb4 -e "source C:/xampp/htdocs/apk_keuangan/php/database/contoh_data.sql"
```

**3. Buka di browser**

```
http://localhost/apk_keuangan/php/
```

---

## Menghapus data contoh

Semua transaksi contoh berawalan teks `[contoh]`, jadi mudah dihapus tanpa
menyentuh data asli:

```bat
mysql -u root --default-character-set=utf8mb4 -e "source C:/xampp/htdocs/apk_keuangan/php/database/hapus_contoh.sql"
```

Atau hapus manual satu per satu dari halaman **Transaksi**.

---

## Struktur folder

```
apk_keuangan/
├── index.php              Router: ?page=dashboard|transaksi|kategori|rekap
├── login.php              Halaman login
├── logout.php
├── config/
│   └── config.php         Kredensi DB, session, koneksi PDO
├── includes/
│   ├── auth.php           Autentikasi dan penjaga akses
│   ├── functions.php      Helper (format Rupiah, tanggal, CSRF, JSON)
│   ├── model.php          Seluruh query database
│   ├── header.php         Layout: sidebar dan topbar
│   └── footer.php         Layout bawah + modal transaksi
├── pages/                 Isi tiap halaman
│   ├── dashboard.php
│   ├── transaksi.php
│   ├── kategori.php
│   └── rekap.php
├── api/                   Endpoint JSON (dipakai AJAX)
│   ├── bootstrap.php
│   ├── transaksi.php      list | simpan | update | hapus | get
│   ├── kategori.php       list | simpan | update | hapus
│   └── dashboard.php      statistik | saldo_awal
├── print/
│   ├── rekap.php          Halaman cetak ukuran A4
│   └── export.php         Unduh rekap sebagai CSV
├── assets/
│   ├── css/style.css
│   └── js/app.js
└── database/
    ├── apk_keuangan.sql   Skema dan data awal
    ├── contoh_data.sql    Data contoh September
    └── hapus_contoh.sql   Penghapus data contoh
```

---

## Struktur database

| Tabel | Isi |
|---|---|
| `users` | Akun pengguna, password disimpan sebagai hash bcrypt |
| `kategori` | Kategori pemasukan / pengeluaran, ikon emoji, dan warna |
| `transaksi` | Catatan harian: tanggal, jenis, kategori, nominal, keterangan, metode |
| `pengaturan` | Pengaturan per pengguna (kunci dan nilai), dipakai untuk `saldo_awal` |

Rumus saldo:

```
saldo = saldo_awal + total pemasukan - total pengeluaran
```

---

## Keamanan

- Password disimpan sebagai hash `bcrypt` (`password_hash()`) dan diverifikasi
  dengan `password_verify()`, tidak pernah disimpan polos.
- Semua input ke database memakai **prepared statement** (pencegahan SQL injection).
- Setiap request yang mengubah data diverifikasi dengan **token CSRF**.
- Session di-regenerate setelah login, dan seluruh output diproses dengan
  `htmlspecialchars()` (pencegahan XSS).
- Halaman dilindungi penjaga akses; API mengembalikan 401 bila belum login.

---

## Catatan teknis

- Routing memakai satu front controller: `index.php?page=...`
- Grrafik memakai Chart.js 4 (dimuat dari CDN)
- Tanpa framework dan tanpa proses build: cukup buka di browser
- Deteksi kode status: XAMPP tidak menerima kode HTTP non-standar seperti 419,
  sehingga kegagalan CSRF memakai 403
