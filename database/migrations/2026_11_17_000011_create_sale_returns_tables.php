<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reason');
            $table->string('refund_method')->default('cash');
            $table->unsignedInteger('total')->default(0);
            $table->timestamps();

            $table->index(['sale_id', 'created_at']);
        });

        Schema::create('sale_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_return_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_item_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('refund_amount')->default(0);
            $table->timestamps();
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->unsignedInteger('returned_quantity')->default(0)->after('quantity');
            $table->unsignedInteger('returned_amount')->default(0)->after('line_total');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->unsignedInteger('returned_total')->default(0)->after('total');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn('returned_total');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['returned_quantity', 'returned_amount']);
        });

        Schema::dropIfExists('sale_return_items');
        Schema::dropIfExists('sale_returns');
    }
};
