<?php
/**
 * Konfigurasi global aplikasi APK Keuangan
 */

// ---------- Error reporting ----------
// APP_DEBUG menampilkan detail error ke output. Pakai 1 saat pengembangan
// lokal (XAMPP) supaya mudah menelusuri masalah, dan 0 kalau folder ini
// bisa diakses dari jaringan publik - detail PDO membocorkan nama database,
// nama tabel, dan struktur skema.
//
// Set lewat environment variable kalau hosting tidak bisa diedit:
//   SetEnv APP_DEBUG 0   (Apache)   |   export APP_DEBUG=0  (CLI)
define('APP_DEBUG', getenv('APP_DEBUG') !== false ? (bool) (int) getenv('APP_DEBUG') : true);

error_reporting(E_ALL);
ini_set('display_errors', APP_DEBUG ? '1' : '0');

// ---------- Session ----------
if (session_status() === PHP_SESSION_NONE) {
    session_name('APKKEUANGAN');
    session_start();
}

// ---------- Database (XAMPP) ----------
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'apk_keuangan');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// ---------- Aplikasi ----------
define('APP_NAME', 'APK Keuangan');
define('APP_TAGLINE', 'Catat Gaji & Pengeluaran Harian');
define('APP_VERSION', '2.0.0');

// ---------- Tombol "Akun demo" ----------
// Kredensial demo dicetak di halaman login, jadi ia PUBLIK begitu folder ini
// bisa diakses orang lain lewat jaringan. Padanan perilaku versi Netlify:
// tampil di localhost, sembunyi saat disajikan lewat host publik.
//
// Set DEMO_LOGIN=1 atau DEMO_LOGIN=0 untuk memaksa pilihan salah satu,
// misalnya saat aplikasi diakses lewat IP LAN.
$hostDemo = strtolower(explode(':', (string) ($_SERVER['HTTP_HOST'] ?? ''))[0]);
$diLokal = in_array($hostDemo, ['localhost', '127.0.0.1', '::1', ''], true);
$demoEnv = getenv('DEMO_LOGIN');
define('DEMO_LOGIN', $demoEnv === false ? $diLokal : $demoEnv === '1');

date_default_timezone_set('Asia/Jakarta');

// ---------- Koneksi PDO (singleton) ----------
function db(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_PORT,
            DB_NAME,
            DB_CHARSET
        );

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            error_log('Koneksi database gagal: ' . $e->getMessage());
            http_response_code(500);
            exit(
                APP_DEBUG
                    ? 'Koneksi database gagal: ' . $e->getMessage()
                    : 'Koneksi database gagal. Periksa konfigurasi di config/config.php.'
            );
        }
    }

    return $pdo;
}
