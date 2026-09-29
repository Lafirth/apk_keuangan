<?php
/**
 * Autentikasi & penjaga akses
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/functions.php';

/** User yang sedang login (array) atau null */
function currentUser(): ?array
{
    return $_SESSION['user'] ?? null;
}

function userId(): ?int
{
    return $_SESSION['user']['id'] ?? null;
}

function isLoggedIn(): bool
{
    return currentUser() !== null;
}

/** Halaman hanya untuk yang sudah login */
function requireLogin(): void
{
    if (!isLoggedIn()) {
        redirect('login.php');
    }
}

/** Halaman hanya untuk yang BELUM login */
function requireGuest(): void
{
    if (isLoggedIn()) {
        redirect('index.php');
    }
}

/** Coba login dengan username + password */
function attemptLogin(string $username, string $password): bool
{
    $st = db()->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
    $st->execute([$username]);
    $user = $st->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        return false;
    }

    session_regenerate_id(true);
    $_SESSION['user'] = [
        'id'       => (int) $user['id'],
        'username' => $user['username'],
        'nama'     => $user['nama'],
    ];
    $_SESSION['csrf'] = bin2hex(random_bytes(32));

    return true;
}

function logout(): void
{
    $_SESSION = [];
    session_destroy();
}
