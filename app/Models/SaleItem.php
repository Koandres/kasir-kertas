<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    protected $fillable = [
        'sale_id', 'product_id', 'name', 'price', 'discount_type', 'discount_value',
        'discount', 'quantity', 'line_total',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'discount_value' => 'integer',
            'discount' => 'integer',
            'quantity' => 'integer',
            'line_total' => 'integer',
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
}
