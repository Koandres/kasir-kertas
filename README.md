# Kasir Kertas

Aplikasi kasir (point of sale) ringan untuk warung, kafe, dan toko kecil. Satu layar untuk transaksi, satu berkas SQLite untuk seluruh data, dan struk kertas 58 mm atau 80 mm.

Dibangun dengan **Laravel 12**, **Inertia.js v3**, **React 19**, **Tailwind CSS v4**, dan **SQLite**. Seluruh nominal disimpan sebagai bilangan bulat rupiah, tanpa pembulatan tersembunyi.

---

## Daftar isi

1. [Fitur](#fitur)
2. [Kebutuhan sistem](#kebutuhan-sistem)
3. [Instalasi](#instalasi)
4. [Akun bawaan](#akun-bawaan)
5. [Panduan pemakaian](#panduan-pemakaian)
6. [Pintasan papan ketik](#pintasan-papan-ketik)
7. [Data, backup, dan restore](#data-backup-dan-restore)
8. [Pengujian](#pengujian)
9. [Pemecahan masalah](#pemecahan-masalah)
10. [Peta folder](#peta-folder)
11. [Panduan modifikasi](#panduan-modifikasi)

---

## Fitur

- **Kasir** — seluruh produk aktif tampil di katalog dengan pencarian dan tab kategori, keranjang bergaya struk, ubah jumlah, diskon per item (nominal/persen) dan diskon nota, kembalian otomatis, pembayaran tunai dan non-tunai, tahan/lanjutkan transaksi (draft), serta keranjang tersimpan di `localStorage`.
- **Riwayat** — filter tanggal, kasir, metode, status, dan nomor struk; buka struk; void transaksi oleh admin dengan pengembalian stok otomatis.
- **Shift** — buka shift dengan modal awal, hitung kas diharapkan, tutup shift dengan kas fisik dan selisih yang ditampilkan terbuka.
- **Produk & kategori** — CRUD produk/jasa, harga jual dan modal, pelacakan stok, batas stok minimum, impor CSV, serta unduh template CSV.
- **Stok** — penyesuaian masuk/keluar/koreksi, daftar stok menipis, dan riwayat pergerakan stok.
- **Laporan** — ringkasan hari ini, tren 14 hari (harian/mingguan/bulanan), produk terlaris 30 hari, rekap metode bayar, stok menipis, dan ekspor CSV per bagian.
- **Pengaturan** — profil toko dan logo, ukuran struk, tema terang/gelap, empat warna aksen, dua pilihan font antarmuka, format mata uang, pengguna dan peran, backup/restore database.
- **Peran** — `admin` mengelola semuanya; `kasir` bertransaksi dan hanya melihat riwayat serta shift miliknya sendiri.

---

## Kebutuhan sistem

- PHP **8.2+** dengan ekstensi `pdo_sqlite`, `mbstring`, `openssl`, `fileinfo`
- Composer 2
- Node.js **20+** dan npm
- SQLite 3 (sudah termasuk di PHP)

Aplikasi tidak membutuhkan MySQL, Redis, atau layanan eksternal. Font di-host sendiri di `public/fonts/`, tidak ada CDN.

---

## Instalasi

Jalankan dari akar proyek.

```bash
# 1. Dependensi
composer install
npm install

# 2. Konfigurasi environment
cp .env.example .env          # Windows: copy .env.example .env
php artisan key:generate

# 3. Pastikan database SQLite tersedia
#    (Windows PowerShell)
New-Item -ItemType File -Force database/database.sqlite
#    (macOS/Linux)
touch database/database.sqlite

# 4. Migrasi dan data contoh
php artisan migrate --seed

# 5. Aset frontend
npm run build

# 6. Jalankan aplikasi
php artisan serve
```

Buka `http://localhost:8000`. Jika memakai Laravel Herd, cukup akses `http://kasir-kertas.test` setelah folder ini berada di direktori Herd.

### Konfigurasi penting

`.env` bawaan sudah memakai SQLite:

```dotenv
APP_LOCALE=id
APP_TIMEZONE=Asia/Jakarta
DB_CONNECTION=sqlite
SESSION_DRIVER=database
```

Koneksi SQLite di `config/database.php` mengaktifkan **WAL**, `synchronous = NORMAL`, dan `busy_timeout = 5000` agar transaksi tetap aman saat struk dicetak atau dua tab dibuka bersamaan.

### Mode pengembangan

```bash
# Terminal 1
php artisan serve

# Terminal 2
npm run dev
```

Jangan menyalin berkas `public/hot` ke server produksi. Berkas itu hanya dibuat oleh Vite saat `npm run dev` berjalan.

---

## Akun bawaan

Seeder membuat dua akun:

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Admin | `admin@kasirkertas.test` | `password` |
| Kasir | `kasir@kasirkertas.test` | `password` |

Nama kasir bawaan adalah **Rina Kasir**. Segera ganti kata sandi melalui menu **Pengaturan → Pengguna** setelah pemakaian pertama.

Seeder juga mengisi 5 kategori, 14 produk/jasa, dan pengaturan toko contoh. Data ini aman dihapus atau diubah.

---

## Panduan pemakaian

### 1. Buka shift

Menu **Shift** → masukkan **modal awal kas** → **Buka shift**.

Kasir tetap dapat bertransaksi tanpa shift, tetapi transaksi tersebut tidak masuk perhitungan kas shift. Untuk perhitungan kas yang rapi, biasakan membuka shift sebelum jualan.

### 2. Transaksi

1. Di layar **Kasir**, ketik nama/kode produk atau tekan `/` untuk fokus ke kolom cari.
2. Tekan **Enter** untuk menambahkan hasil pertama, atau klik produk. Klik lagi untuk menambah jumlah.
3. Sesuaikan jumlah lewat tombol `−` / `+` atau isi langsung kolom jumlah.
4. Diskon per baris: klik **Diskon item** di bawah nama produk, pilih **Rp** (nominal) atau **%** (persen), lalu **OK**. Tekan **Hapus** untuk membatalkan potongan baris itu. Produk dengan diskon default akan otomatis mengisi potongan ini saat masuk keranjang; nilainya masih bisa diubah.
5. Diskon nota (opsional): isi kolom **Diskon nota** di bawah keranjang. Diskon nota dihitung setelah semua diskon item.
6. Tekan **F9** atau tombol **Bayar**.
7. Pilih metode: **Tunai**, **Transfer**, **QRIS**, atau **Kartu**.
   - Tunai: masukkan uang diterima atau pilih nominal cepat; kembalian dihitung otomatis.
   - Non-tunai: transaksi hanya dicatat, pastikan dana sudah diterima.
8. Setelah selesai, struk tampil. Pilih **Cetak struk** atau **Transaksi baru**.

Keranjang disimpan otomatis per pengguna di `localStorage`, jadi tidak hilang saat halaman dimuat ulang.

### 3. Tahan dan lanjutkan transaksi

- **Tahan** menyimpan keranjang sebagai draft **tanpa mengurangi stok**.
- Tombol **Draft** di atas katalog membuka daftar draft. **Lanjutkan** memuat isinya ke keranjang; draft kemudian dihapus. **Hapus** membuang draft.

### 4. Riwayat dan void

Menu **Riwayat** menampilkan transaksi lunas, void, dan draft. Gunakan filter tanggal, kasir, metode, status, atau nomor.

Klik nomor struk untuk membuka detail dan mencetak ulang. **Batalkan (void)** hanya tersedia untuk admin dan wajib disertai alasan. Void mengembalikan stok produk yang terlacak dan mencatat pergerakan stok `void`.

### 5. Produk, kategori, dan stok

- **Produk** — tambah barang/jasa, atur harga jual, harga modal, satuan, kategori, pelacakan stok, batas minimum, status aktif, dan **diskon default** (Rp atau %). Diskon default hanya mengisi otomatis potongan baris di keranjang kasir; nilai akhir tetap bisa diubah saat transaksi. Produk nonaktif tidak muncul di kasir.
- **Kategori** — urutan kategori menentukan susunan tab di kasir.
- **Stok** — pilih produk, tentukan jenis (**masuk**, **keluar/rusak**, atau **koreksi**), isi jumlah dan alasan. Setiap perubahan tercatat di daftar pergerakan.
- **Impor CSV** — unduh template dari tombol **Impor CSV → Unduh template**, isi, lalu unggah. Baris dengan `sku` yang sudah ada akan memperbarui produk tersebut. Kolom opsional `discount_type` (`none`/`nominal`/`percent`) dan `discount_value` mengisi diskon default produk.

### 6. Laporan

Menu **Laporan** menampilkan:

- ringkasan penjualan hari ini,
- tren 14 hari terakhir (harian, mingguan, bulanan),
- produk terlaris 30 hari terakhir,
- rekap metode bayar hari ini,
- produk dengan stok menipis.

Setiap bagian memiliki tombol **CSV** untuk diunduh. Tombol **Ekspor ringkasan** mengunduh ringkasan lengkap.

### 7. Pengaturan

- **Profil toko** — nama, alamat, telepon, catatan kaki struk, logo (PNG/JPG/WEBP maks. 2 MB), dan lebar struk 58/80 mm.
- **Tampilan & uang** — tema terang/gelap, aksen Terakota/Zaitun/Samudra/Anggur, font Source Sans 3/IBM Plex Sans, serta format mata uang (awalan, akhiran, desimal, pemisah).
- **Pengguna** — tambah/ubah pengguna, peran, dan status aktif. Admin tidak dapat menonaktifkan atau menurunkan perannya sendiri.
- **Backup & restore** — unduh `database.sqlite`, atau pulihkan dari berkas `.sqlite`. Restore membuat cadangan pengaman di `storage/app/` lebih dulu, lalu mengakhiri semua sesi.

---

## Pintasan papan ketik

| Tombol | Fungsi |
| --- | --- |
| `/` | Fokus ke kolom pencarian produk |
| `Enter` | Tambahkan hasil pencarian pertama ke keranjang |
| `F9` | Buka dialog pembayaran |
| `Esc` | Tutup dialog/struk, kosongkan pencarian, atau kosongkan keranjang |

Pintasan `F9` dan `Esc` tetap bekerja saat fokus berada di kolom input.

---

## Data, backup, dan restore

Seluruh data berada di **`database/database.sqlite`**.

### Backup manual

Cara paling aman: hentikan aplikasi, lalu salin `database/database.sqlite` (beserta `-wal` dan `-shm` bila ada) ke tempat lain.

Cara dari aplikasi: **Pengaturan → Backup & restore → Unduh file SQLite**. Pengunduhan dilakukan saat aplikasi aktif; untuk data yang benar-benar konsisten, hentikan penjualan sebentar.

### Restore

1. Buka **Pengaturan → Backup & restore**.
2. Pilih berkas `.sqlite` hasil unduhan.
3. Klik **Restore sekarang** dan konfirmasi.

Aplikasi mencadangkan database saat ini ke `storage/app/` dengan nama `backup-sebelum-restore-*.sqlite`, mengganti database, menghapus sesi, lalu mengarahkan Anda ke halaman masuk. Masuk kembali memakai akun dari database yang dipulihkan.

### Reset data

Untuk mengembalikan ke kondisi demo (menghapus seluruh transaksi dan pengguna lain):

```bash
php artisan migrate:fresh --seed
```

---

## Pengujian

```bash
php artisan test
```

Test mencakup pembayaran, stok tidak cukup, hold/resume draft, void dan pengembalian stok, pembatasan peran, penyalinan nama/harga produk ke item transaksi, serta penolakan pembayaran tunai yang kurang.

Untuk memeriksa gaya kode PHP:

```bash
vendor/bin/pint
```

---

## Pemecahan masalah

### Halaman 403 saat membuka menu admin

Akun yang dipakai berperan `kasir`. Masuk memakai akun `admin` atau ubah peran pengguna lewat **Pengaturan → Pengguna**.

### `419 Page Expired`

Sesi kedaluwarsa atau token CSRF tidak cocok. Muat ulang halaman, lalu masuk kembali. Jika sering terjadi, periksa `SESSION_DRIVER=database` dan pastikan tabel `sessions` ada (`php artisan migrate`).

### `SQLSTATE[HY000]: no such table: ...`

Database belum dimigrasi atau berkas SQLite menunjuk ke lokasi lain. Jalankan:

```bash
php artisan migrate --seed
```

Periksa juga `DB_DATABASE` di `.env`.

### `database is locked`

Biasanya ada proses lain yang menahan transaksi. Pastikan hanya satu `php artisan serve`/queue worker yang berjalan, lalu coba lagi. Konfigurasi WAL dan `busy_timeout` sudah membantu mengurangi kejadian ini.

### Aset tampil tanpa CSS atau React tidak jalan

Jalankan `npm run build`, lalu muat ulang. Jika memakai `npm run dev`, pastikan server Vite hidup dan hapus `public/hot` bila Vite sudah dimatikan.

### Font terlihat berbeda

Font hanya dimuat dari `public/fonts/*.woff2`. Pastikan folder itu ikut terpasang dan server mengizinkan akses ke `/fonts/`. Tidak ada permintaan ke layanan font eksternal.

### Struk kosong saat dicetak

Cetak dari halaman detail transaksi atau dari dialog setelah pembayaran. CSS cetak hanya menampilkan area `.receipt-print`; pastikan browser tidak memblokir pencetakan latar belakang bila memakai warna khusus.

### Logo tidak muncul setelah diunggah

Pastikan folder `public/uploads/` dapat ditulis oleh proses PHP. Aplikasi membuat folder tersebut otomatis saat unggahan pertama.

### Waktu transaksi tidak sesuai

Atur `APP_TIMEZONE=Asia/Jakarta` di `.env`, lalu jalankan `php artisan config:clear`.

---

## Peta folder

```
app/
├── Http/
│   ├── Controllers/          # Auth, Cashier, Product, Category, Stock, Sale, Shift, Report, Setting
│   ├── Middleware/            # EnsureRole, HandleInertiaRequests
│   └── Requests/              # Validasi form (15 request)
├── Models/                    # User, Category, Product, StockMovement, Shift, Sale, SaleItem
├── Services/SaleService.php   # Transaksi, hold, void, nomor struk, stok
└── Support/                   # Settings (key/value), Receipt (payload cetak)

config/pos.php                 # Metode bayar, aksen, font, mata uang, ukuran struk, data toko

database/
├── database.sqlite            # Seluruh data aplikasi
├── migrations/                # 8 migrasi aplikasi + tabel bawaan Laravel
└── seeders/DatabaseSeeder.php # Akun, katalog, pengaturan contoh

resources/
├── css/app.css                # Tailwind + kelas komponen (btn, input, panel, tabel)
├── views/app.blade.php        # Root Inertia, atribut tema dari Settings
└── js/
    ├── app.jsx                # Entry Inertia + React
    ├── Components/            # Layout, Modal, Pagination, Receipt
    ├── Pages/                 # Login, Cashier, Products, Categories, Stock, Sales, Shifts, Reports, Settings
    ├── lib/                   # format.js, shortcuts.js, print.js
    ├── print/receipt.css      # Gaya struk dan aturan @media print
    └── styles/
        ├── tokens.css         # Sumber tunggal warna, font, spasi, radius
        └── cashier.css        # Tata letak kasir dan struk sementara

public/
├── build/                     # Hasil npm run build (tidak di-commit)
├── fonts/                     # Font .woff2 yang di-host sendiri
└── uploads/                   # Logo toko

routes/web.php                 # Semua rute + pembatasan peran
tests/Feature/PosTest.php      # Test alur kasir inti
```

---

## Panduan modifikasi

Panduan langkah demi langkah untuk mengubah warna, font, kategori, produk, format uang, metode bayar, field baru, dan lainnya ada di:

```
docs/PANDUAN-MODIFIKASI.md
```

Berkas tersebut bersifat lokal dan tidak ikut di-commit (lihat `.gitignore`).

---

## Lisensi

Aplikasi ini dibuat untuk keperluan toko dan dapat disesuaikan. Komponen Laravel, Inertia, React, dan Tailwind mengikuti lisensi masing-masing.
