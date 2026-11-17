<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\CashierController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\StockController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'create'])->name('login');
    Route::post('/login', [LoginController::class, 'store']);
});

Route::post('/logout', [LoginController::class, 'destroy'])->middleware('auth')->name('logout');

Route::middleware(['auth', 'role:admin,kasir'])->group(function () {
    Route::redirect('/', '/kasir');

    Route::get('/kasir', [CashierController::class, 'index'])->name('kasir');
    Route::get('/kasir/cari', [CashierController::class, 'search'])->name('kasir.cari');
    Route::post('/kasir/bayar', [CashierController::class, 'pay'])->name('kasir.bayar');
    Route::post('/kasir/tahan', [CashierController::class, 'hold'])->name('kasir.tahan');
    Route::get('/kasir/draft/{sale}', [CashierController::class, 'resume'])->name('kasir.draft');
    Route::delete('/kasir/draft/{sale}', [CashierController::class, 'destroyDraft'])->name('kasir.draft.hapus');

    Route::get('/penjualan', [SaleController::class, 'index'])->name('penjualan.index');
    Route::get('/penjualan/{sale}', [SaleController::class, 'show'])->name('penjualan.show');

    Route::get('/shift', [ShiftController::class, 'index'])->name('shift.index');
    Route::post('/shift/buka', [ShiftController::class, 'open'])->name('shift.buka');
    Route::post('/shift/tutup', [ShiftController::class, 'close'])->name('shift.tutup');
});

Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::post('/penjualan/{sale}/void', [SaleController::class, 'void'])->name('penjualan.void');

    Route::get('/produk/template', [ProductController::class, 'template'])->name('produk.template');
    Route::post('/produk/impor', [ProductController::class, 'import'])->name('produk.impor');
    Route::resource('produk', ProductController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->parameters(['produk' => 'product']);

    Route::resource('kategori', CategoryController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->parameters(['kategori' => 'category']);

    Route::get('/stok', [StockController::class, 'index'])->name('stok.index');
    Route::post('/stok/penyesuaian', [StockController::class, 'adjust'])->name('stok.penyesuaian');

    Route::get('/laporan', [ReportController::class, 'index'])->name('laporan.index');
    Route::get('/laporan/ekspor/{section}', [ReportController::class, 'export'])->name('laporan.ekspor');

    Route::get('/pengaturan', [SettingController::class, 'index'])->name('pengaturan.index');
    Route::post('/pengaturan/toko', [SettingController::class, 'updateStore'])->name('pengaturan.toko');
    Route::post('/pengaturan/tampilan', [SettingController::class, 'updateAppearance'])->name('pengaturan.tampilan');
    Route::post('/pengaturan/pengguna', [SettingController::class, 'storeUser'])->name('pengaturan.pengguna.store');
    Route::put('/pengaturan/pengguna/{user}', [SettingController::class, 'updateUser'])->name('pengaturan.pengguna.update');
    Route::get('/pengaturan/backup', [SettingController::class, 'backup'])->name('pengaturan.backup');
    Route::post('/pengaturan/restore', [SettingController::class, 'restore'])->name('pengaturan.restore');
});
