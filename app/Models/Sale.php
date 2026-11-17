<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    protected $fillable = [
        'number', 'shift_id', 'user_id', 'subtotal', 'item_discount', 'discount',
        'discount_type', 'discount_value', 'total', 'paid', 'change', 'payment_method',
        'status', 'void_reason', 'voided_at', 'voided_by',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'integer',
            'item_discount' => 'integer',
            'discount' => 'integer',
            'discount_value' => 'integer',
            'total' => 'integer',
            'paid' => 'integer',
            'change' => 'integer',
            'voided_at' => 'datetime',
        ];
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }
}
