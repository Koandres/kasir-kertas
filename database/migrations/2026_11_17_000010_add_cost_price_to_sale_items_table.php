<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->unsignedInteger('cost_price')->nullable()->after('price');
        });

        // Isi snapshot untuk transaksi lama memakai harga modal produk saat ini.
        DB::statement(
            'UPDATE sale_items
             SET cost_price = (SELECT products.cost_price FROM products WHERE products.id = sale_items.product_id)
             WHERE cost_price IS NULL'
        );
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn('cost_price');
        });
    }
};
