<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Support\Settings;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@kasirkertas.test'],
            [
                'name' => 'Admin Kasir Kertas',
                'password' => 'password',
                'role' => 'admin',
                'is_active' => true,
            ],
        );

        User::firstOrCreate(
            ['email' => 'kasir@kasirkertas.test'],
            [
                'name' => 'Rina Kasir',
                'password' => 'password',
                'role' => 'kasir',
                'is_active' => true,
            ],
        );

        $categories = collect([
            ['name' => 'Minuman', 'sort_order' => 1],
            ['name' => 'Makanan', 'sort_order' => 2],
            ['name' => 'Kopi Bubuk', 'sort_order' => 3],
            ['name' => 'Jasa', 'sort_order' => 4],
            ['name' => 'Lainnya', 'sort_order' => 5],
        ])->mapWithKeys(fn ($category) => [
            $category['name'] => Category::firstOrCreate(['name' => $category['name']], ['sort_order' => $category['sort_order']]),
        ]);

        $products = [
            ['KOPI-001', 'Kopi Hitam', 'Minuman', 10000, 4500, 42, 10, 'cangkir', true],
            ['KOPI-002', 'Kopi Susu Gula Aren', 'Minuman', 18000, 8000, 36, 10, 'cangkir', true],
            ['TEH-001', 'Teh Melati', 'Minuman', 7000, 2500, 55, 12, 'cangkir', true],
            ['AIR-001', 'Air Mineral 600ml', 'Minuman', 5000, 3000, 60, 12, 'botol', true],
            ['ROT-001', 'Roti Bakar Cokelat', 'Makanan', 15000, 7000, 18, 6, 'porsi', true],
            ['NAS-001', 'Nasi Goreng Kampung', 'Makanan', 22000, 11000, 14, 5, 'porsi', true],
            ['MIE-001', 'Mie Goreng Spesial', 'Makanan', 20000, 9500, 4, 5, 'porsi', true],
            ['SNK-001', 'Keripik Singkong', 'Makanan', 9000, 5000, 32, 10, 'bungkus', true],
            ['BJK-001', 'Biji Kopi Arabika 250g', 'Kopi Bubuk', 85000, 52000, 9, 4, 'bungkus', true],
            ['BJK-002', 'Biji Kopi Robusta 250g', 'Kopi Bubuk', 65000, 38000, 12, 4, 'bungkus', true],
            ['GULA-001', 'Gula Aren Cair 250ml', 'Kopi Bubuk', 25000, 14000, 3, 6, 'botol', true],
            ['JASA-001', 'Jasa Giling Kopi', 'Jasa', 10000, null, 0, 0, 'kali', false],
            ['JASA-002', 'Jasa Seduh Manual', 'Jasa', 15000, null, 0, 0, 'kali', false],
            ['LNY-001', 'Tote Bag Kasir Kertas', 'Lainnya', 45000, 27000, 7, 3, 'pcs', true],
        ];

        foreach ($products as [$sku, $name, $category, $price, $cost, $stock, $min, $unit, $track]) {
            Product::firstOrCreate(
                ['sku' => $sku],
                [
                    'name' => $name,
                    'category_id' => $categories[$category]->id,
                    'price' => $price,
                    'cost_price' => $cost,
                    'stock' => $stock,
                    'min_stock' => $min,
                    'unit' => $unit,
                    'track_stock' => $track,
                    'is_active' => true,
                ],
            );
        }

        $settings = [
            'store_name' => config('pos.store.name'),
            'store_address' => config('pos.store.address'),
            'store_phone' => config('pos.store.phone'),
            'store_footer' => config('pos.store.footer'),
            'receipt_width' => '58',
            'theme' => 'light',
            'accent' => 'terakota',
            'font' => 'humanis',
            'currency_prefix' => 'Rp',
            'currency_suffix' => '',
            'currency_decimals' => 0,
            'currency_thousand_separator' => '.',
            'currency_decimal_separator' => ',',
        ];

        foreach ($settings as $key => $value) {
            if (Settings::get($key) === null) {
                Settings::put($key, $value);
            }
        }
    }
}
