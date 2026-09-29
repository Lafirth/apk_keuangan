<?php
/** Bootstrap untuk semua endpoint API */
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/model.php';

if (!isLoggedIn()) {
    jsonError('Sesi berakhir, silakan login kembali.', 401);
}

// Proteksi CSRF untuk request yang mengubah data
// Catatan: pakai 403 (bukan 419) karena SAPI PHP di XAMPP menolak kode
// status non-standar dan menggantinya menjadi 500.
if (isPost() && !csrfVerify(post('csrf'))) {
    jsonError('Token keamanan tidak valid. Muat ulang halaman.', 403);
}
