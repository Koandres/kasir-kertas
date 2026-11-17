<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Identitas Toko (nilai awal)
    |--------------------------------------------------------------------------
    | Nilai ini dipakai sebelum pengaturan disimpan lewat halaman Pengaturan.
    */

    'store' => [
        'name' => 'Kasir Kertas',
        'address' => 'Jl. Kertas No. 1, Jakarta',
        'phone' => '0812-0000-0000',
        'footer' => 'Terima kasih. Barang yang sudah dibeli tidak dapat ditukar.',
        'logo' => null,
    ],

    /*
    |--------------------------------------------------------------------------
    | Metode Pembayaran
    |--------------------------------------------------------------------------
    | Tambahkan baris baru di sini untuk menambah pilihan pembayaran.
    | 'cash' => true berarti pembayaran menghitung kembalian.
    */

    'payment_methods' => [
        'cash' => ['label' => 'Tunai', 'cash' => true],
        'transfer' => ['label' => 'Transfer', 'cash' => false],
        'qris' => ['label' => 'QRIS', 'cash' => false],
        'card' => ['label' => 'Kartu', 'cash' => false],
    ],

    /*
    |--------------------------------------------------------------------------
    | Tampilan
    |--------------------------------------------------------------------------
    */

    'receipt_widths' => ['58', '80'],

    'accents' => [
        'terakota' => 'Terakota',
        'zaitun' => 'Zaitun',
        'samudra' => 'Samudra',
        'anggur' => 'Anggur',
    ],

    'fonts' => [
        'humanis' => 'Source Sans 3',
        'plex' => 'IBM Plex Sans',
    ],

    'currency' => [
        'prefix' => 'Rp',
        'suffix' => '',
        'decimals' => 0,
        'thousand_separator' => '.',
        'decimal_separator' => ',',
    ],

    /*
    |--------------------------------------------------------------------------
    | Backup Database
    |--------------------------------------------------------------------------
    | Backup memakai VACUUM INTO agar konsisten walau mode WAL sedang aktif.
    | Berkas terjadwal disimpan di folder ini dan dipangkas sesuai retensi.
    */

    'backup' => [
        'database' => env('DB_BACKUP_DATABASE', database_path('database.sqlite')),
        'directory' => env('DB_BACKUP_DIRECTORY', storage_path('app/backups')),
        'connection' => env('DB_BACKUP_CONNECTION'),
        'keep' => (int) env('DB_BACKUP_KEEP', 14),
        'hour' => env('DB_BACKUP_HOUR', '23:30'),
    ],

];
