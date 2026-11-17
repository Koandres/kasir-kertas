<?php

use App\Support\Settings;

$appearance = ['theme' => 'light', 'accent' => 'terakota', 'font' => 'humanis'];

try {
    $appearance = Settings::appearance();
} catch (\Throwable) {
    // Tabel settings mungkin belum dimigrasi (mis. saat instalasi pertama).
}
?><!DOCTYPE html>
<html lang="id" data-theme="<?php echo e($appearance['theme']); ?>" data-accent="<?php echo e($appearance['accent']); ?>" data-font="<?php echo e($appearance['font']); ?>">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">
    <meta name="theme-color" content="#F6F3EC">
    <title inertia>Kasir Kertas</title>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @inertiaHead
</head>
<body>
    @inertia
</body>
</html>
