<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('discount_type')->default('none')->after('price');
            $table->unsignedInteger('discount_value')->default(0)->after('discount_type');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->string('discount_type')->default('nominal')->after('price');
            $table->unsignedInteger('discount_value')->default(0)->after('discount_type');
            $table->unsignedInteger('discount')->default(0)->after('discount_value');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->unsignedInteger('item_discount')->default(0)->after('subtotal');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn('item_discount');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['discount_type', 'discount_value', 'discount']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['discount_type', 'discount_value']);
        });
    }
};
