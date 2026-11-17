<?php

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Http\UploadedFile;

function importAdmin(): User
{
    return User::create([
        'name' => 'Admin Impor',
        'email' => 'impor-'.uniqid().'@kasirkertas.test',
        'password' => 'password',
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function importCsv(string $rows): UploadedFile
{
    $header = 'sku,name,category,price,cost_price,stock,min_stock,unit,track_stock,is_active,discount_type,discount_value';

    return UploadedFile::fake()->createWithContent('produk.csv', $header."\n".$rows."\n");
}

test('impor csv membuat produk baru beserta diskon dan stok awal', function () {
    $admin = importAdmin();

    $this->actingAs($admin)
        ->post('/produk/impor', [
            'file' => importCsv('IMP-001,Kopi Impor,Minuman,12000,5000,8,2,pcs,1,1,percent,10'),
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $product = Product::where('sku', 'IMP-001')->firstOrFail();

    expect($product->name)->toBe('Kopi Impor')
        ->and($product->price)->toBe(12000)
        ->and($product->cost_price)->toBe(5000)
        ->and($product->stock)->toBe(8)
        ->and($product->discount_type)->toBe('percent')
        ->and($product->discount_value)->toBe(10)
        ->and($product->category->name)->toBe('Minuman')
        ->and(StockMovement::where('product_id', $product->id)->where('type', 'in')->where('quantity', 8)->exists())->toBeTrue();
});

test('impor csv memperbarui produk yang sudah ada tanpa menduplikasi', function () {
    $admin = importAdmin();

    $this->actingAs($admin)->post('/produk/impor', [
        'file' => importCsv('IMP-002,Teh Impor,Minuman,8000,3000,8,2,pcs,1,1,none,0'),
    ])->assertRedirect();

    $this->actingAs($admin)->post('/produk/impor', [
        'file' => importCsv('IMP-002,Teh Impor Baru,Minuman,15000,6000,5,2,pcs,1,1,nominal,2000'),
    ])->assertRedirect();

    $product = Product::where('sku', 'IMP-002')->firstOrFail();

    expect(Product::where('sku', 'IMP-002')->count())->toBe(1)
        ->and($product->name)->toBe('Teh Impor Baru')
        ->and($product->price)->toBe(15000)
        ->and($product->cost_price)->toBe(6000)
        ->and($product->stock)->toBe(5)
        ->and($product->discount_type)->toBe('nominal')
        ->and($product->discount_value)->toBe(2000)
        ->and(StockMovement::where('product_id', $product->id)->where('type', 'adjustment')->where('quantity', -3)->exists())->toBeTrue();
});

test('impor csv ditolak untuk kasir dan kolom wajib dicek', function () {
    $admin = importAdmin();

    $kasir = User::create([
        'name' => 'Kasir Impor',
        'email' => 'kasir-impor-'.uniqid().'@kasirkertas.test',
        'password' => 'password',
        'role' => 'kasir',
        'is_active' => true,
    ]);

    $this->actingAs($kasir)
        ->post('/produk/impor', ['file' => importCsv('IMP-003,Produk Kasir,,10000,,1,0,pcs,1,1,none,0')])
        ->assertForbidden();

    $this->actingAs($admin)
        ->post('/produk/impor', [
            'file' => UploadedFile::fake()->createWithContent('produk.csv', "sku,price\nIMP-004,10000\n"),
        ])
        ->assertRedirect()
        ->assertSessionHas('error');

    expect(Product::where('sku', 'IMP-003')->exists())->toBeFalse()
        ->and(Product::where('sku', 'IMP-004')->exists())->toBeFalse();
});
