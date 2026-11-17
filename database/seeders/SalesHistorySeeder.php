<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\Shift;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SalesHistorySeeder extends Seeder
{
    /**
     * Isi riwayat penjualan 45 hari agar laporan dan grafik langsung hidup.
     * Dilewati bila database sudah punya cukup riwayat.
     */
    public function run(): void
    {
        $recent = Sale::where('created_at', '>=', now()->subDays(45)->startOfDay())->count();

        if ($recent > 50) {
            return;
        }

        $admin = User::where('role', 'admin')->orderBy('id')->first();
        $kasir = User::where('role', 'kasir')->orderBy('id')->first() ?? $admin;

        if (! $admin || ! $kasir) {
            return;
        }

        $products = Product::where('is_active', true)->orderBy('name')->get();

        if ($products->isEmpty()) {
            return;
        }

        $returns = ['Produk rusak', 'Salah pesanan', 'Pembeli mengembalikan sebagian', 'Kemasan penyok'];
        $voids = ['Salah input item', 'Pembeli membatalkan pesanan', 'Pembayaran gagal'];

        $start = today()->subDays(44);

        for ($day = 0; $day < 45; $day++) {
            $date = $start->copy()->addDays($day);

            if ($date->isToday() && now()->lt($date->copy()->setTime(8, 5))) {
                continue;
            }

            $closedAt = $date->isToday()
                ? now()->subMinute()
                : $date->copy()->setTime(21, 0);

            $shift = Shift::create([
                'user_id' => $kasir->id,
                'opened_at' => $date->copy()->setTime(8, 0),
                'closed_at' => $closedAt,
                'opening_cash' => 200000,
            ]);

            $prefix = 'POS-'.$date->format('Ymd').'-';
            $sequence = Sale::where('number', 'like', $prefix.'%')
                ->pluck('number')
                ->map(fn (string $number) => (int) substr($number, strlen($prefix)))
                ->max() ?? 0;

            $count = random_int(2, 4);

            for ($i = 0; $i < $count; $i++) {
                $at = $date->isToday()
                    ? now()->subMinutes(random_int(10, 240))
                    : $date->copy()->setTime(random_int(8, 20), random_int(0, 59));

                if ($at->lt($date->copy()->setTime(8, 0))) {
                    continue;
                }

                $sequence++;
                $this->createSale($products, $kasir, $admin, $shift, $at, $prefix.$sequence, $returns, $voids);
            }

            $cash = $shift->sales()->where('status', 'paid')->where('payment_method', 'cash')->sum('total');
            $refunds = SaleReturn::whereIn('sale_id', $shift->sales()->select('id'))
                ->where('refund_method', 'cash')
                ->sum('total');
            $expected = 200000 + (int) $cash - (int) $refunds;

            $shift->update([
                'expected_cash' => $expected,
                'closing_cash' => $expected + random_int(-5000, 5000),
            ]);
        }
    }

    /**
     * @param  Collection<int, Product>  $products
     * @param  array<int, string>  $returns
     * @param  array<int, string>  $voids
     */
    protected function createSale(
        $products,
        User $kasir,
        User $admin,
        Shift $shift,
        Carbon $at,
        string $number,
        array $returns,
        array $voids,
    ): void {
        $chosen = $products->shuffle()->take(random_int(1, 4));
        $rows = [];
        $subtotal = 0;
        $itemDiscount = 0;
        $stock = [];

        foreach ($chosen as $product) {
            $quantity = $product->track_stock ? random_int(1, 3) : random_int(1, 2);
            $this->ensureStock($product, $quantity, $at->copy()->subMinutes(random_int(30, 240)), $kasir);

            $gross = $product->price * $quantity;
            [$discountType, $discountValue, $discount] = $this->lineDiscount($gross);

            $rows[] = [
                'product_id' => $product->id,
                'name' => $product->name,
                'price' => $product->price,
                'cost_price' => $product->cost_price,
                'discount_type' => $discountType,
                'discount_value' => $discountValue,
                'discount' => $discount,
                'quantity' => $quantity,
                'line_total' => $gross - $discount,
            ];

            $subtotal += $gross;
            $itemDiscount += $discount;
            $stock[] = ['product' => $product, 'quantity' => $quantity];
        }

        $net = $subtotal - $itemDiscount;
        $discount = 0;
        $discountType = 'nominal';
        $discountValue = 0;

        if (random_int(1, 100) <= 12) {
            $discountType = 'percent';
            $discountValue = random_int(1, 2) === 1 ? 5 : 10;
            $discount = (int) floor($net * $discountValue / 100);
        }

        $total = max(0, $net - $discount);
        $method = $this->paymentMethod();
        $paid = $method === 'cash'
            ? (int) (ceil($total / 5000) * 5000)
            : $total;

        $sale = Sale::create([
            'number' => $number,
            'shift_id' => $shift->id,
            'user_id' => $kasir->id,
            'subtotal' => $subtotal,
            'item_discount' => $itemDiscount,
            'discount' => $discount,
            'discount_type' => $discountType,
            'discount_value' => $discountValue,
            'total' => $total,
            'returned_total' => 0,
            'paid' => $paid,
            'change' => $method === 'cash' ? $paid - $total : 0,
            'payment_method' => $method,
            'status' => 'paid',
        ]);

        $this->stamp('sales', $sale->id, $at);
        $sale->setAttribute('created_at', $at);

        $sale->items()->createMany($rows);
        DB::table('sale_items')->where('sale_id', $sale->id)->update(['created_at' => $at, 'updated_at' => $at]);

        foreach ($stock as $row) {
            $product = $row['product'];

            if (! $product->track_stock) {
                continue;
            }

            $product->decrement('stock', $row['quantity']);

            $movement = StockMovement::create([
                'product_id' => $product->id,
                'type' => 'sale',
                'quantity' => -$row['quantity'],
                'note' => 'Penjualan '.$sale->number,
                'user_id' => $kasir->id,
            ]);

            $this->stamp('stock_movements', $movement->id, $at);
        }

        $roll = random_int(1, 100);

        if ($roll <= 4) {
            $this->voidSale($sale, $admin, $at->copy()->addMinutes(random_int(5, 60)), $voids[array_rand($voids)]);

            return;
        }

        if ($roll <= 14) {
            $this->returnSale($sale, $admin, $at->copy()->addHours(random_int(1, 36)), $returns[array_rand($returns)]);
        }
    }

    protected function ensureStock(Product $product, int $needed, Carbon $at, User $user): void
    {
        if (! $product->track_stock || $product->stock >= $needed) {
            return;
        }

        $addition = max($needed - $product->stock, 12, (int) $product->min_stock * 2);

        $product->update(['stock' => $product->stock + $addition]);

        $movement = StockMovement::create([
            'product_id' => $product->id,
            'type' => 'in',
            'quantity' => $addition,
            'note' => 'Restok demo',
            'user_id' => $user->id,
        ]);

        $this->stamp('stock_movements', $movement->id, $at);
    }

    /** @return array{0: string, 1: int, 2: int} */
    protected function lineDiscount(int $gross): array
    {
        $roll = random_int(1, 100);

        if ($roll <= 8) {
            $percent = random_int(1, 2) === 1 ? 5 : 10;

            return ['percent', $percent, (int) floor($gross * $percent / 100)];
        }

        if ($roll <= 16) {
            $value = min($gross, random_int(1, 3) * 1000);

            return ['nominal', $value, $value];
        }

        return ['nominal', 0, 0];
    }

    protected function paymentMethod(): string
    {
        $roll = random_int(1, 100);

        return match (true) {
            $roll <= 60 => 'cash',
            $roll <= 80 => 'qris',
            $roll <= 92 => 'transfer',
            default => 'card',
        };
    }

    protected function voidSale(Sale $sale, User $admin, Carbon $at, string $reason): void
    {
        $sale->update([
            'status' => 'void',
            'void_reason' => $reason,
            'voided_at' => $at,
            'voided_by' => $admin->id,
        ]);

        DB::table('sales')->where('id', $sale->id)->update(['updated_at' => $at]);

        foreach ($sale->items()->get() as $item) {
            $this->restoreStock($item->product_id, $item->quantity, 'void', 'Void '.$sale->number.' — '.$reason, $admin, $at);
        }
    }

    protected function returnSale(Sale $sale, User $admin, Carbon $at, string $reason): void
    {
        $item = $sale->items()->get()->random();
        $quantity = $item->quantity > 1 && random_int(1, 2) === 1 ? 1 : $item->quantity;
        $netBase = $sale->subtotal - $sale->item_discount;
        $allocated = $netBase > 0
            ? intdiv($item->line_total * $quantity * $sale->total, $item->quantity * $netBase)
            : 0;
        $refund = max(0, $allocated);
        $method = $this->paymentMethod();

        $return = SaleReturn::create([
            'sale_id' => $sale->id,
            'user_id' => $admin->id,
            'reason' => $reason,
            'refund_method' => $method,
            'total' => $refund,
        ]);

        $this->stamp('sale_returns', $return->id, $at);

        $returnItem = $return->items()->create([
            'sale_item_id' => $item->id,
            'quantity' => $quantity,
            'refund_amount' => $refund,
        ]);

        $this->stamp('sale_return_items', $returnItem->id, $at);

        $item->update([
            'returned_quantity' => $item->returned_quantity + $quantity,
            'returned_amount' => $item->returned_amount + $refund,
        ]);

        $sale->update([
            'returned_total' => $sale->returned_total + $refund,
        ]);

        DB::table('sales')->where('id', $sale->id)->update(['updated_at' => $at]);

        $this->restoreStock($item->product_id, $quantity, 'return', 'Retur '.$sale->number.' — '.$reason, $admin, $at);
    }

    protected function restoreStock(?int $productId, int $quantity, string $type, string $note, User $user, Carbon $at): void
    {
        if (! $productId) {
            return;
        }

        $product = Product::find($productId);

        if (! $product || ! $product->track_stock) {
            return;
        }

        $product->increment('stock', $quantity);

        $movement = StockMovement::create([
            'product_id' => $product->id,
            'type' => $type,
            'quantity' => $quantity,
            'note' => $note,
            'user_id' => $user->id,
        ]);

        $this->stamp('stock_movements', $movement->id, $at);
    }

    protected function stamp(string $table, int $id, Carbon $at): void
    {
        DB::table($table)->where('id', $id)->update([
            'created_at' => $at,
            'updated_at' => $at,
        ]);
    }
}
