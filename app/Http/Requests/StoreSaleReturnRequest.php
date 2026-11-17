<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSaleReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:255'],
            'refund_method' => ['required', Rule::in(array_keys(config('pos.payment_methods')))],
            'items' => ['required', 'array', 'min:1'],
            'items.*.sale_item_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'Alasan retur wajib diisi.',
            'refund_method.required' => 'Pilih metode pengembalian dana.',
            'refund_method.in' => 'Metode pengembalian dana tidak dikenal.',
            'items.required' => 'Pilih minimal satu item yang diretur.',
            'items.min' => 'Pilih minimal satu item yang diretur.',
            'items.*.quantity.min' => 'Jumlah retur minimal 1.',
        ];
    }
}
