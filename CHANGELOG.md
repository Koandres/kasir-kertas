# Changelog — Kasir Kertas

Catatan perubahan aplikasi. **Aturan:** sebelum mengubah kode, tulis rencananya dulu di bagian **Rencana**. Setelah selesai dieksekusi dan diuji, pindahkan baris yang sama ke bagian **Selesai** (paling atas) dan hapus dari **Rencana**.

Format satu baris:

`- YYYY-MM-DD · Berkas: <file terdampak> · Ubah: <apa yang diubah>`

## Rencana

## Selesai

- 2026-11-17 · Berkas: `.gitignore` · Ubah: mengabaikan folder artefak agen AI lokal (`/.claude/`, `/.gemini/`, `/.windsurf/`, `/.aider*`, `/.continue/`, `/.junie/`, `/.kiro/`, `/.roo/`) sambil menyatukan `/.codex` dan `/.cursor/` dalam satu blok berkomentar; `AGENTS.md`, `CLAUDE.md`, `boost.json`, dan `.mcp.json` tetap dilacak karena berisi panduan/konfigurasi bersama.

- 2026-11-17 · Berkas: `app/Http/Controllers/CashierController.php` · Ubah: menghapus batas `limit(60)` pada katalog kasir agar seluruh produk aktif tampil; pencarian server `/kasir/cari` dan filter kategori tetap, tanpa pagination.
- 2026-11-17 · Berkas: `database/migrations/2026_11_16_000009_add_discounts_to_products_and_sale_items.php` (baru), `app/Models/Product.php`, `app/Models/SaleItem.php`, `app/Models/Sale.php` · Ubah: kolom `discount_type`/`discount_value` di `products` (diskon default, default `none`), kolom `discount_type`/`discount_value`/`discount` di `sale_items`, dan kolom `item_discount` di `sales` untuk total potongan item.
- 2026-11-17 · Berkas: `app/Http/Requests/StoreSaleRequest.php`, `app/Http/Requests/HoldSaleRequest.php`, `app/Services/SaleService.php` · Ubah: validasi diskon per item (`nominal`/`percent`), perhitungan `discount` per baris dan `line_total = price × quantity − discount`, `subtotal` tetap bruto, diskon nota dihitung setelah diskon item, penggabungan baris produk hanya bila diskonnya sama, serta stok dikurangi sekali per produk.
- 2026-11-17 · Berkas: `resources/js/Pages/Cashier.jsx`, `resources/js/styles/cashier.css`, `resources/js/Components/Receipt.jsx`, `app/Support/Receipt.php`, `resources/js/Pages/Sales/Show.jsx` · Ubah: editor diskon per baris keranjang (Rp atau %, terapkan/hapus), baris "Diskon item" pada ringkasan struk sementara dan struk cetak, detail item menampilkan potongan, serta draft memuat kembali diskon item; diskon default produk otomatis mengisi baris keranjang.
- 2026-11-17 · Berkas: `app/Http/Requests/StoreProductRequest.php`, `app/Http/Controllers/ProductController.php`, `resources/js/Pages/Products/Index.jsx` · Ubah: field diskon default (tipe + nilai) pada form produk, tampilan badge potongan di tabel, dukungan kolom `discount_type`/`discount_value` pada impor dan template CSV.
- 2026-11-17 · Berkas: `README.md` · Ubah: dokumentasi diskon per item di keranjang (Rp/persen), diskon default produk, serta kolom diskon pada impor/template CSV.
- 2026-11-17 · Berkas: `tests/Feature/PosTest.php` · Ubah: tes diskon per item nominal dan persen, penolakan diskon melebihi harga baris, serta penggabungan baris produk dengan diskon berbeda.
- 2026-11-16 · Berkas: `CHANGELOG.md` · Ubah: berkas baru dengan pemisahan bagian Rencana dan Selesai (tanggal, berkas terdampak, detail perubahan).
- 2026-11-16 · Berkas: `resources/css/app.css` · Ubah: mengganti `@source '../js/**/*.jsx'` (gagal memindai di Windows) dengan daftar `@source` eksplisit per direktori (`resources/js/*.jsx`, `lib/*.js`, `Components`, dan tiap folder `Pages/*`) plus komentar penjelasan; CSS build 80,8 kB → 91,9 kB karena kelas utility yang sebelumnya hilang ikut ter-generate.
- 2026-11-16 · Berkas: `resources/js/Pages/Settings/Index.jsx`, `resources/js/lib/format.js`, `resources/js/styles/tokens.css` · Ubah: pratinjau tema/aksen/font langsung saat diklik (`previewAppearance()` + `applyAppearance()`), bilah `Simpan tampilan`/`Kembalikan`, pembatalan pratinjau saat pindah tab, kartu terpilih memakai border/ring aksen + `aria-pressed` + ikon centang.
- 2026-11-16 · Berkas: `resources/js/Components/Layout.jsx`, `resources/js/Pages/Settings/Index.jsx`, `resources/css/app.css` · Ubah: sidebar 240 px dengan wordmark berikon dan pemisah bagian, item aktif memakai `bg-accent-wash` + bar aksen kiri + `aria-current`, badge rata kanan dengan `min-w-[20px]`, nav mobile `min-h-12`/`whitespace-nowrap`, tab Pengaturan memakai `role="tablist"`/`aria-selected` dengan `bg-accent-wash` dan scroll horizontal.
