<?php

namespace App\Support;

use App\Models\Sale;

class Receipt
{
    public static function forSale(Sale $sale): array
    {
        $sale->loadMissing(['items', 'user']);

        $methods = config('pos.payment_methods');

        return [
            'store' => Settings::store(),
            'width' => Settings::receiptWidth(),
            'sale' => [
                'id' => $sale->id,
                'number' => $sale->number,
                'created_at' => $sale->created_at?->format('d/m/Y H:i'),
                'cashier' => $sale->user?->name,
                'subtotal' => $sale->subtotal,
                'item_discount' => $sale->item_discount,
                'discount' => $sale->discount,
                'discount_type' => $sale->discount_type,
                'discount_value' => $sale->discount_value,
                'total' => $sale->total,
                'paid' => $sale->paid,
                'change' => $sale->change,
                'payment_method' => $sale->payment_method,
                'payment_label' => $methods[$sale->payment_method]['label'] ?? $sale->payment_method,
                'status' => $sale->status,
                'void_reason' => $sale->void_reason,
            ],
            'items' => $sale->items->map(fn ($item) => [
                'name' => $item->name,
                'price' => $item->price,
                'quantity' => $item->quantity,
                'discount_type' => $item->discount_type,
                'discount_value' => $item->discount_value,
                'discount' => $item->discount,
                'line_total' => $item->line_total,
            ])->values()->all(),
        ];
    }
}
