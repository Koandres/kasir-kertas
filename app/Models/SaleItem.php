<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleItem extends Model
{
    protected $fillable = [
        'sale_id', 'product_id', 'name', 'price', 'cost_price', 'discount_type',
        'discount_value', 'discount', 'quantity', 'line_total', 'returned_quantity',
        'returned_amount',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'cost_price' => 'integer',
            'discount_value' => 'integer',
            'discount' => 'integer',
            'quantity' => 'integer',
            'line_total' => 'integer',
            'returned_quantity' => 'integer',
            'returned_amount' => 'integer',
        ];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function returnItems(): HasMany
    {
        return $this->hasMany(SaleReturnItem::class);
    }
}
