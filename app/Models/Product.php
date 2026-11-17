<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'category_id', 'sku', 'name', 'price', 'discount_type', 'discount_value',
        'cost_price', 'track_stock', 'stock', 'min_stock', 'unit', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'discount_value' => 'integer',
            'cost_price' => 'integer',
            'track_stock' => 'boolean',
            'stock' => 'integer',
            'min_stock' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function hasDefaultDiscount(): bool
    {
        return in_array($this->discount_type, ['nominal', 'percent'], true) && $this->discount_value > 0;
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->where('track_stock', true)->whereColumn('stock', '<=', 'min_stock');
    }

    public function isLowStock(): bool
    {
        return $this->track_stock && $this->stock <= $this->min_stock;
    }
}
