<?php

namespace App\Support;

use App\Models\Sale;

class Receipt
{
    public static function forSale(Sale $sale): array
    {
        $sale->loadMissing([
            'items',
            'user',
            'returns.user',
            'returns.items.saleItem',
        ]);

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
                'returned_total' => $sale->returned_total,
                'net_total' => $sale->netTotal(),
                'has_return' => $sale->hasReturns(),
                'paid' => $sale->paid,
                'change' => $sale->change,
                'payment_method' => $sale->payment_method,
                'payment_label' => $methods[$sale->payment_method]['label'] ?? $sale->payment_method,
                'status' => $sale->status,
                'void_reason' => $sale->void_reason,
            ],
            'items' => $sale->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'price' => $item->price,
                'cost_price' => $item->cost_price,
                'quantity' => $item->quantity,
                'returned_quantity' => $item->returned_quantity,
                'returned_amount' => $item->returned_amount,
                'remaining_quantity' => $item->quantity - $item->returned_quantity,
                'discount_type' => $item->discount_type,
                'discount_value' => $item->discount_value,
                'discount' => $item->discount,
                'line_total' => $item->line_total,
            ])->values()->all(),
            'returns' => $sale->returns
                ->sortByDesc('created_at')
                ->map(fn ($return) => [
                    'id' => $return->id,
                    'created_at' => $return->created_at?->format('d/m/Y H:i'),
                    'cashier' => $return->user?->name,
                    'reason' => $return->reason,
                    'refund_method' => $return->refund_method,
                    'refund_label' => $methods[$return->refund_method]['label'] ?? $return->refund_method,
                    'total' => $return->total,
                    'items' => $return->items->map(fn ($item) => [
                        'name' => $item->saleItem?->name ?? 'Item',
                        'quantity' => $item->quantity,
                        'refund_amount' => $item->refund_amount,
                    ])->values()->all(),
                ])->values()->all(),
        ];
    }
}
