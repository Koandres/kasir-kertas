<?php

use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;

function posUser(string $role = 'kasir'): User
{
    return User::create([
        'name' => ucfirst($role).' Uji',
        'email' => $role.'-'.uniqid().'@kasirkertas.test',
        'password' => 'password',
        'role' => $role,
        'is_active' => true,
    ]);
}

function posProduct(array $attributes = []): Product
{
    return Product::create(array_merge([
        'sku' => 'UJI-'.uniqid(),
        'name' => 'Kopi Uji',
        'price' => 10000,
        'cost_price' => 4000,
        'track_stock' => true,
        'stock' => 10,
        'min_stock' => 2,
        'unit' => 'cangkir',
        'is_active' => true,
    ], $attributes));
}

test('kasir dapat membayar transaksi dan stok berkurang', function () {
    $kasir = posUser();
    $product = posProduct();

    $response = $this->actingAs($kasir)->postJson('/kasir/bayar', [
        'items' => [['product_id' => $product->id, 'quantity' => 2]],
        'discount_type' => 'nominal',
        'discount_value' => 1000,
        'payment_method' => 'cash',
        'paid' => 25000,
    ]);

    $response->assertOk()->assertJsonPath('sale.sale.total', 19000);

    $sale = Sale::firstOrFail();

    expect($sale->status)->toBe('paid')
        ->and($sale->subtotal)->toBe(20000)
        ->and($sale->discount)->toBe(1000)
        ->and($sale->change)->toBe(6000)
        ->and($sale->shift_id)->toBeNull()
        ->and($sale->items->first()->name)->toBe('Kopi Uji')
        ->and($sale->items->first()->price)->toBe(10000)
        ->and($product->fresh()->stock)->toBe(8);

    expect(StockMovement::where('type', 'sale')->where('quantity', -2)->count())->toBe(1);
});

test('transaksi ditolak jika stok tidak cukup', function () {
    $kasir = posUser();
    $product = posProduct(['stock' => 1]);

    $this->actingAs($kasir)->postJson('/kasir/bayar', [
        'items' => [['product_id' => $product->id, 'quantity' => 2]],
        'payment_method' => 'cash',
        'paid' => 50000,
    ])->assertStatus(422);

    expect(Sale::count())->toBe(0)
        ->and($product->fresh()->stock)->toBe(1);
});

test('hold membuat draft tanpa mengubah stok lalu dapat dilanjutkan', function () {
    $kasir = posUser();
    $product = posProduct();

    $this->actingAs($kasir)->postJson('/kasir/tahan', [
        'items' => [['product_id' => $product->id, 'quantity' => 3]],
    ])->assertOk();

    $draft = Sale::firstOrFail();

    expect($draft->status)->toBe('draft')
        ->and($product->fresh()->stock)->toBe(10);

    $this->actingAs($kasir)
        ->getJson("/kasir/draft/{$draft->id}")
        ->assertOk()
        ->assertJsonPath('draft.items.0.quantity', 3);
});

test('void mengembalikan stok dan hanya boleh dilakukan admin', function () {
    $kasir = posUser();
    $admin = posUser('admin');
    $product = posProduct(['stock' => 5]);

    $this->actingAs($kasir)->postJson('/kasir/bayar', [
        'items' => [['product_id' => $product->id, 'quantity' => 2]],
        'payment_method' => 'cash',
        'paid' => 20000,
    ])->assertOk();

    $sale = Sale::firstOrFail();

    expect($product->fresh()->stock)->toBe(3);

    $this->actingAs($kasir)
        ->post("/penjualan/{$sale->id}/void", ['reason' => 'Salah input item'])
        ->assertForbidden();

    $this->actingAs($admin)
        ->post("/penjualan/{$sale->id}/void", ['reason' => 'Salah input item'])
        ->assertRedirect();

    expect($sale->fresh()->status)->toBe('void')
        ->and($product->fresh()->stock)->toBe(5)
        ->and(StockMovement::where('type', 'void')->where('quantity', 2)->count())->toBe(1);
});

test('kasir tidak dapat membuka halaman admin', function () {
    $kasir = posUser();

    foreach (['/produk', '/kategori', '/stok', '/laporan', '/pengaturan'] as $path) {
        $this->actingAs($kasir)->get($path)->assertForbidden();
    }
});

test('nama dan harga produk disalin ke item transaksi', function () {
    $kasir = posUser();
    $product = posProduct();

    $this->actingAs($kasir)->postJson('/kasir/bayar', [
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
        'payment_method' => 'cash',
        'paid' => 10000,
    ])->assertOk();

    $product->update(['name' => 'Nama Baru', 'price' => 25000]);

    $item = Sale::firstOrFail()->items->first();

    expect($item->name)->toBe('Kopi Uji')
        ->and($item->price)->toBe(10000);
});

test('pembayaran tunai kurang ditolak', function () {
    $kasir = posUser();
    $product = posProduct();

    $this->actingAs($kasir)->postJson('/kasir/bayar', [
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
        'payment_method' => 'cash',
        'paid' => 5000,
    ])->assertStatus(422);

    expect(Sale::count())->toBe(0);
});

test('diskon item nominal diterapkan sebelum diskon nota', function () {
    $kasir = posUser();
    $product = posProduct();

    $this->actingAs($kasir)->postJson('/kasir/bayar', [
        'items' => [[
            'product_id' => $product->id,
            'quantity' => 2,
            'discount_type' => 'nominal',
            'discount_value' => 2500,
        ]],
        'discount_type' => 'nominal',
        'discount_value' => 1000,
        'payment_method' => 'cash',
        'paid' => 25000,
    ])->assertOk()->assertJsonPath('sale.sale.total', 16500);

    $sale = Sale::firstOrFail();
    $item = $sale->items->first();

    expect($sale->subtotal)->toBe(20000)
        ->and($sale->item_discount)->toBe(2500)
        ->and($sale->discount)->toBe(1000)
        ->and($sale->total)->toBe(16500)
        ->and($item->discount_type)->toBe('nominal')
        ->and($item->discount)->toBe(2500)
        ->and($item->line_total)->toBe(17500);
});

test('diskon item persen dihitung dari harga baris', function () {
    $kasir = posUser();
    $product = posProduct();

    $this->actingAs($kasir)->postJson('/kasir/bayar', [
        'items' => [[
            'product_id' => $product->id,
            'quantity' => 2,
            'discount_type' => 'percent',
            'discount_value' => 10,
        ]],
        'payment_method' => 'cash',
        'paid' => 20000,
    ])->assertOk()->assertJsonPath('sale.sale.total', 18000);

    $sale = Sale::firstOrFail();

    expect($sale->item_discount)->toBe(2000)
        ->and($sale->items->first()->discount)->toBe(2000)
        ->and($sale->items->first()->line_total)->toBe(18000);
});

test('diskon item melebihi harga baris ditolak', function () {
    $kasir = posUser();
    $product = posProduct();

    $this->actingAs($kasir)->postJson('/kasir/bayar', [
        'items' => [[
            'product_id' => $product->id,
            'quantity' => 1,
            'discount_type' => 'nominal',
            'discount_value' => 12000,
        ]],
        'payment_method' => 'cash',
        'paid' => 20000,
    ])->assertStatus(422);

    expect(Sale::count())->toBe(0)
        ->and($product->fresh()->stock)->toBe(10);
});

test('baris produk dengan diskon berbeda tidak digabung dan stok dipotong sekali', function () {
    $kasir = posUser();
    $product = posProduct();

    $this->actingAs($kasir)->postJson('/kasir/bayar', [
        'items' => [
            [
                'product_id' => $product->id,
                'quantity' => 1,
                'discount_type' => 'nominal',
                'discount_value' => 1000,
            ],
            [
                'product_id' => $product->id,
                'quantity' => 1,
                'discount_type' => 'nominal',
                'discount_value' => 2000,
            ],
        ],
        'payment_method' => 'cash',
        'paid' => 20000,
    ])->assertOk();

    $sale = Sale::firstOrFail();

    expect($sale->items)->toHaveCount(2)
        ->and($sale->item_discount)->toBe(3000)
        ->and($sale->total)->toBe(17000)
        ->and($product->fresh()->stock)->toBe(8)
        ->and(StockMovement::where('type', 'sale')->where('quantity', -2)->count())->toBe(1);
});
