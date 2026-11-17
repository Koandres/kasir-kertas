<?php

use App\Models\Sale;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function reportAdmin(): User
{
    return User::create([
        'name' => 'Admin Laporan',
        'email' => 'laporan-'.uniqid().'@kasirkertas.test',
        'password' => 'password',
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function reportSale(User $user, array $attributes = []): Sale
{
    static $sequence = 0;
    $sequence++;

    return Sale::forceCreate(array_merge([
        'number' => 'UJI-'.now()->format('Ymd').'-'.uniqid().'-'.$sequence,
        'user_id' => $user->id,
        'subtotal' => 20000,
        'item_discount' => 0,
        'discount' => 0,
        'discount_type' => 'nominal',
        'discount_value' => 0,
        'total' => 20000,
        'returned_total' => 0,
        'paid' => 20000,
        'change' => 0,
        'payment_method' => 'cash',
        'status' => 'paid',
        'created_at' => now(),
        'updated_at' => now(),
    ], $attributes));
}

test('ringkasan laporan memakai pendapatan neto setelah retur', function () {
    $admin = reportAdmin();

    $sale = reportSale($admin, ['total' => 20000, 'returned_total' => 5000]);
    $sale->items()->create([
        'name' => 'Kopi Uji',
        'price' => 10000,
        'cost_price' => 4000,
        'quantity' => 2,
        'line_total' => 20000,
        'returned_quantity' => 1,
        'returned_amount' => 5000,
    ]);

    reportSale($admin, [
        'total' => 10000,
        'paid' => 10000,
        'created_at' => now()->subDay(),
        'updated_at' => now()->subDay(),
    ]);

    reportSale($admin, [
        'total' => 8000,
        'paid' => 8000,
        'payment_method' => 'qris',
        'created_at' => now()->subDay(),
        'updated_at' => now()->subDay(),
    ]);

    reportSale($admin, ['total' => 30000, 'status' => 'void']);

    $this->actingAs($admin)
        ->get('/laporan')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Reports/Index')
            ->where('summary.total', 15000)
            ->where('summary.cash', 15000)
            ->where('summary.count', 1)
            ->where('summary.average', 15000)
            ->where('payments.0.total', 15000)
            ->where('trend.values.13', 15000)
            ->where('trend.values.12', 18000)
            ->where('topProducts.0.name', 'Kopi Uji')
            ->where('topProducts.0.quantity', 1)
            ->where('topProducts.0.revenue', 15000)
        );
});

test('ekspor laporan menghasilkan csv yang bisa diunduh', function () {
    $admin = reportAdmin();
    reportSale($admin, ['total' => 20000, 'returned_total' => 5000]);

    $response = $this->actingAs($admin)->get('/laporan/ekspor/ringkasan');

    $response->assertOk();
    $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

    $content = $response->streamedContent();

    expect($content)->toContain('Total penjualan')
        ->and($content)->toContain('15000');

    $this->actingAs($admin)
        ->get('/laporan/ekspor/tren?period=weekly')
        ->assertOk()
        ->assertDownload('tren-penjualan-weekly.csv');
});
