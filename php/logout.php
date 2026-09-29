<?php
/** Keluar dari aplikasi */
require_once __DIR__ . '/includes/auth.php';

logout();

redirect('login.php');
