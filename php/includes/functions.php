<?php
/**
 * Fungsi bantu (helper) aplikasi
 */

/** Escape output HTML */
function e(?string $teks): string
{
    return htmlspecialchars((string) $teks, ENT_QUOTES, 'UTF-8');
}

/** Format angka ke Rupiah: 1500000 -> "Rp 1.500.000" */
function rupiah($angka, bool $denganSimbol = true): string
{
    $angka = (float) $angka;
    $teks  = number_format($angka, ($angka == (int) $angka) ? 0 : 2, ',', '.');

    return $denganSimbol ? 'Rp ' . $teks : $teks;
}

/** Ringkas untuk kartu statistik: 1250000 -> "Rp 1,25 jt" */
function rupiahRingkas($angka): string
{
    $angka = (float) $angka;
    $sign  = $angka < 0 ? '-' : '';
    $abs   = abs($angka);

    if ($abs >= 1_000_000_000) return $sign . 'Rp ' . number_format($abs / 1_000_000_000, 2, ',', '.') . ' M';
    if ($abs >= 1_000_000)     return $sign . 'Rp ' . number_format($abs / 1_000_000, 2, ',', '.') . ' jt';
    if ($abs >= 1_000)         return $sign . 'Rp ' . number_format($abs / 1_000, 0, ',', '.') . ' rb';

    return $sign . 'Rp ' . number_format($abs, 0, ',', '.');
}

/** Bersihkan input angka dari karakter non-angka: "15.000" -> 15000 */
function angka($teks): float
{
    return (float) str_replace(['.', ',', ' ', 'Rp'], '', (string) $teks);
}

/** Format tanggal Indonesia: 2026-09-28 -> "Senin, 28 Sep 2026" */
function tanggalIndo(?string $tgl, bool $denganHari = true): string
{
    if (empty($tgl)) return '-';

    $ts   = strtotime($tgl);
    $hari = ['', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    $bln  = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    $hasil = date('j', $ts) . ' ' . $bln[(int) date('n', $ts)] . ' ' . date('Y', $ts);

    return $denganHari ? $hari[(int) date('w', $ts)] . ', ' . $hasil : $hasil;
}

/** Nama bulan dari angka: 9 -> "September" */
function bulanIndo(int $bulan, bool $panjang = true): string
{
    $bln = [1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    $nama = $bln[$bulan] ?? '-';

    if (!$panjang) return substr($nama, 0, 3);

    return $nama;
}

/** "2026-09" -> "September 2026" */
function periodeIndo(string $periode): string
{
    [$y, $m] = array_pad(explode('-', $periode), 2, date('m'));
    return bulanIndo((int) $m) . ' ' . $y;
}

/** Periode default = bulan berjalan */
function periodeSekarang(): string
{
    return date('Y-m');
}

/** Perpindahan halaman */
function redirect(string $url): void
{
    header('Location: ' . $url);
    exit;
}

/** Base URL aplikasi */
function baseUrl(string $path = ''): string
{
    $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    return $base . '/' . ltrim($path, '/');
}

// ---------------- Flash message ----------------
function flashSet(string $tipe, string $pesan): void
{
    $_SESSION['flash'][] = ['tipe' => $tipe, 'pesan' => $pesan];
}

function flashGet(): array
{
    $data = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $data;
}

// ---------------- CSRF ----------------
function csrfToken(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrfVerify(?string $token): bool
{
    return !empty($_SESSION['csrf']) && hash_equals($_SESSION['csrf'], (string) $token);
}

// ---------------- Response JSON ----------------
function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $pesan, int $status = 400): void
{
    jsonResponse(['success' => false, 'message' => $pesan], $status);
}

// ---------------- Input ----------------
function post(string $key, $default = null)
{
    return $_POST[$key] ?? $default;
}

function get(string $key, $default = null)
{
    return $_GET[$key] ?? $default;
}

function isPost(): bool
{
    return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
}

/** Sanitasi teks pendek */
function teks(string $s, int $max = 255): string
{
    $s = trim(preg_replace('/\s+/u', ' ', $s));
    return mb_substr($s, 0, $max);
}

/** Ubah hex ke rgba: "#f97316", 0.16 -> "rgba(249, 115, 22, .16)" */
function hexRgba(?string $hex, float $a): string
{
    $hex = ltrim((string) $hex, '#');
    if (strlen($hex) === 3) {
        $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
    }
    if (!preg_match('/^[0-9a-fA-F]{6}$/', $hex)) {
        $hex = '6366f1';
    }
    $n = hexdec($hex);
    return sprintf('rgba(%d, %d, %d, %s)', ($n >> 16) & 255, ($n >> 8) & 255, $n & 255, rtrim(rtrim(number_format($a, 3, '.', ''), '0'), '.'));
}

/** Daftar metode pembayaran */
function metodeList(): array
{
    return ['tunai' => 'Tunai', 'transfer' => 'Transfer', 'qris' => 'QRIS', 'debit' => 'Debit'];
}
