<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Path Komponen Halaman Inertia
    |--------------------------------------------------------------------------
    |
    | Default paket Inertia memakai `js/pages` (huruf kecil). Proyek ini
    | memakai `js/Pages`, sehingga pada sistem berkas case-sensitive seperti
    | CI Linux, `assertInertia` gagal menemukan komponen. Path dan ekstensi
    | ditentukan eksplisit di sini agar lokal dan CI konsisten.
    |
    */

    'pages' => [
        'ensure_pages_exist' => false,
        'paths' => [
            resource_path('js/Pages'),
        ],
        'extensions' => ['js', 'jsx', 'svelte', 'ts', 'tsx', 'vue'],
    ],

    'testing' => [
        'ensure_pages_exist' => true,
    ],

];
