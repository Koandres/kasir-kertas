<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaleService
{
    /**
     * Simpan transaksi penjualan beserta pengurangan stok dalam satu transaction.
     */
    public function pay(User $user, array $data): Sale
    {
        return DB::transaction(function () use ($user, $data) {
            $items = $this->resolveItems($data['items'], lock: true, checkStock: true);
            $totals = $this->totals($items, $data);

            $method = $data['payment_method'];
            $isCash = (bool) config("pos.payment_methods.{$method}.cash", false);
            $paid = $isCash ? (int) ($data['paid'] ?? 0) : $totals['total'];

            if ($isCash && $paid < $totals['total']) {
                throw ValidationException::withMessages([
                    'paid' => 'Uang yang dibayar kurang dari total transaksi.',
                ]);
            }

            $sale = Sale::create([
                'number' => $this->nextNumber(),
                'shift_id' => $user->openShift()?->id,
                'user_id' => $user->id,
                'subtotal' => $totals['subtotal'],
                'item_discount' => $totals['item_discount'],
                'discount' => $totals['discount'],
                'discount_type' => $data['discount_type'] ?? 'nominal',
                'discount_value' => (int) ($data['discount_value'] ?? 0),
                'total' => $totals['total'],
                'paid' => $paid,
                'change' => $isCash ? $paid - $totals['total'] : 0,
                'payment_method' => $method,
                'status' => 'paid',
            ]);

            foreach ($items as $item) {
                /** @var Product $product */
                $product = $item['product'];
                $discount = $this->lineDiscount($item);

                $sale->items()->create([
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'price' => $product->price,
                    'discount_type' => $item['discount_type'],
                    'discount_value' => $item['discount_value'],
                    'discount' => $discount,
                    'quantity' => $item['quantity'],
                    'line_total' => $product->price * $item['quantity'] - $discount,
                ]);
            }

            $this->applyStock($items, $sale, $user);

            return $sale->load(['items', 'user']);
        });
    }

    /**
     * Simpan keranjang sebagai draft tanpa mengubah stok.
     */
    public function hold(User $user, array $data): Sale
    {
        return DB::transaction(function () use ($user, $data) {
            $items = $this->resolveItems($data['items']);
            $totals = $this->totals($items, $data);

            $sale = Sale::create([
                'number' => $this->nextNumber(),
                'shift_id' => $user->openShift()?->id,
                'user_id' => $user->id,
                'subtotal' => $totals['subtotal'],
                'item_discount' => $totals['item_discount'],
                'discount' => $totals['discount'],
                'discount_type' => $data['discount_type'] ?? 'nominal',
                'discount_value' => (int) ($data['discount_value'] ?? 0),
                'total' => $totals['total'],
                'paid' => 0,
                'change' => 0,
                'payment_method' => 'cash',
                'status' => 'draft',
            ]);

            foreach ($items as $item) {
                /** @var Product $product */
                $product = $item['product'];

                $sale->items()->create([
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'price' => $product->price,
                    'discount_type' => $item['discount_type'],
                    'discount_value' => $item['discount_value'],
                    'discount' => $this->lineDiscount($item),
                    'quantity' => $item['quantity'],
                    'line_total' => $product->price * $item['quantity'] - $this->lineDiscount($item),
                ]);
            }

            return $sale->load('items');
        });
    }

    /**
     * Batalkan transaksi dan kembalikan stok.
     */
    public function void(Sale $sale, User $user, string $reason): Sale
    {
        return DB::transaction(function () use ($sale, $user, $reason) {
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();

            if ($sale->status !== 'paid') {
                throw ValidationException::withMessages([
                    'sale' => 'Hanya transaksi berstatus paid yang dapat dibatalkan.',
                ]);
            }

            $sale->update([
                'status' => 'void',
                'void_reason' => $reason,
                'voided_at' => now(),
                'voided_by' => $user->id,
            ]);

            foreach ($sale->items as $item) {
                if (! $item->product_id) {
                    continue;
                }

                $product = Product::whereKey($item->product_id)->lockForUpdate()->first();

                if ($product && $product->track_stock) {
                    $product->increment('stock', $item->quantity);

                    StockMovement::create([
                        'product_id' => $product->id,
                        'type' => 'void',
                        'quantity' => $item->quantity,
                        'note' => 'Void '.$sale->number.' — '.$reason,
                        'user_id' => $user->id,
                    ]);
                }
            }

            return $sale->fresh(['items', 'user', 'voidedBy']);
        });
    }

    /**
     * Penyesuaian stok manual. Tipe in menambah, out mengurangi, adjustment mengikuti tanda.
     */
    public function adjustStock(Product $product, string $type, int $quantity, ?string $note, User $user): Product
    {
        return DB::transaction(function () use ($product, $type, $quantity, $note, $user) {
            $product = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();

            $delta = match ($type) {
                'in' => abs($quantity),
                'out' => -abs($quantity),
                default => $quantity,
            };

            if ($delta === 0) {
                throw ValidationException::withMessages(['quantity' => 'Jumlah penyesuaian tidak boleh nol.']);
            }

            if ($product->track_stock && $product->stock + $delta < 0) {
                throw ValidationException::withMessages([
                    'quantity' => 'Stok tidak boleh menjadi negatif.',
                ]);
            }

            $product->increment('stock', $delta);

            StockMovement::create([
                'product_id' => $product->id,
                'type' => $type,
                'quantity' => $delta,
                'note' => $note,
                'user_id' => $user->id,
            ]);

            return $product->fresh();
        });
    }

    /**
     * @param  array<int, array{product: Product, quantity: int, discount_type: string, discount_value: int}>  $items
     */
    protected function applyStock(array $items, Sale $sale, User $user): void
    {
        $quantities = [];
        $products = [];

        foreach ($items as $item) {
            $product = $item['product'];
            $quantities[$product->id] = ($quantities[$product->id] ?? 0) + $item['quantity'];
            $products[$product->id] = $product;
        }

        foreach ($quantities as $productId => $quantity) {
            $product = $products[$productId];

            if (! $product->track_stock) {
                continue;
            }

            $product->decrement('stock', $quantity);

            StockMovement::create([
                'product_id' => $product->id,
                'type' => 'sale',
                'quantity' => -$quantity,
                'note' => 'Penjualan '.$sale->number,
                'user_id' => $user->id,
            ]);
        }
    }

    /**
     * Potongan rupiah untuk satu baris item, dihitung dari harga snapshot.
     *
     * @param  array{product: Product, quantity: int, discount_type: string, discount_value: int}  $item
     */
    protected function lineDiscount(array $item): int
    {
        $bruto = $item['product']->price * $item['quantity'];

        if ($item['discount_type'] === 'percent') {
            return (int) floor($bruto * min(100, $item['discount_value']) / 100);
        }

        return min($bruto, $item['discount_value']);
    }

    /**
     * @return array<int, array{product: Product, quantity: int, discount_type: string, discount_value: int}>
     */
    protected function resolveItems(array $rows, bool $lock = false, bool $checkStock = false): array
    {
        $ids = collect($rows)->pluck('product_id')->filter()->unique()->values();

        $query = Product::whereIn('id', $ids);

        if ($lock) {
            $query->lockForUpdate();
        }

        $products = $query->get()->keyBy('id');
        $merged = [];

        foreach ($rows as $row) {
            $product = $products->get((int) $row['product_id']);
            $quantity = (int) $row['quantity'];

            if (! $product) {
                throw ValidationException::withMessages(['items' => 'Ada produk yang tidak ditemukan.']);
            }

            if ($quantity < 1) {
                throw ValidationException::withMessages(['items' => 'Jumlah item minimal 1.']);
            }

            $requestedType = $row['discount_type'] ?? 'nominal';
            $type = in_array($requestedType, ['nominal', 'percent'], true) ? $requestedType : 'nominal';
            $value = max(0, (int) ($row['discount_value'] ?? 0));
            $value = $type === 'percent' ? min(100, $value) : $value;

            if ($type === 'nominal' && $value > $product->price * $quantity) {
                throw ValidationException::withMessages([
                    'items' => "Diskon {$product->name} melebihi harga baris.",
                ]);
            }

            $key = "{$product->id}|{$type}|{$value}";

            if (isset($merged[$key])) {
                $merged[$key]['quantity'] += $quantity;
            } else {
                $merged[$key] = [
                    'product' => $product,
                    'quantity' => $quantity,
                    'discount_type' => $type,
                    'discount_value' => $value,
                ];
            }
        }

        if ($merged === []) {
            throw ValidationException::withMessages(['items' => 'Keranjang masih kosong.']);
        }

        if ($checkStock) {
            $quantities = [];
            $productsById = [];

            foreach ($merged as $item) {
                $id = $item['product']->id;
                $quantities[$id] = ($quantities[$id] ?? 0) + $item['quantity'];
                $productsById[$id] = $item['product'];
            }

            foreach ($quantities as $id => $quantity) {
                $product = $productsById[$id];

                if ($product->track_stock && $product->stock < $quantity) {
                    throw ValidationException::withMessages([
                        'items' => "Stok {$product->name} tinggal {$product->stock} {$product->unit}.",
                    ]);
                }
            }
        }

        return array_values($merged);
    }

    /**
     * @param  array<int, array{product: Product, quantity: int, discount_type: string, discount_value: int}>  $items
     * @return array{subtotal: int, item_discount: int, discount: int, total: int}
     */
    protected function totals(array $items, array $data): array
    {
        $subtotal = 0;
        $itemDiscount = 0;

        foreach ($items as $item) {
            $subtotal += $item['product']->price * $item['quantity'];
            $itemDiscount += $this->lineDiscount($item);
        }

        $itemDiscount = min($itemDiscount, $subtotal);
        $net = $subtotal - $itemDiscount;

        $requestedType = $data['discount_type'] ?? 'nominal';
        $type = in_array($requestedType, ['nominal', 'percent'], true) ? $requestedType : 'nominal';
        $value = max(0, (int) ($data['discount_value'] ?? 0));

        $discount = $type === 'percent'
            ? (int) floor($net * min(100, $value) / 100)
            : $value;

        $discount = min($discount, $net);

        return [
            'subtotal' => $subtotal,
            'item_discount' => $itemDiscount,
            'discount' => $discount,
            'total' => max(0, $net - $discount),
        ];
    }

    protected function nextNumber(): string
    {
        $date = now()->format('Ymd');
        $prefix = "POS-{$date}-";

        $last = Sale::where('number', 'like', $prefix.'%')
            ->lockForUpdate()
            ->orderByDesc('number')
            ->value('number');

        $sequence = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}
