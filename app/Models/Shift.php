<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    protected $fillable = [
        'user_id', 'opened_at', 'closed_at', 'opening_cash', 'closing_cash', 'expected_cash',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'opening_cash' => 'integer',
            'closing_cash' => 'integer',
            'expected_cash' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function cashSalesTotal(): int
    {
        return (int) $this->sales()
            ->where('status', 'paid')
            ->where('payment_method', 'cash')
            ->sum('total');
    }

    public function expectedCash(): int
    {
        return $this->opening_cash + $this->cashSalesTotal();
    }

    public function difference(): ?int
    {
        return $this->closing_cash === null ? null : $this->closing_cash - $this->expected_cash;
    }
}
