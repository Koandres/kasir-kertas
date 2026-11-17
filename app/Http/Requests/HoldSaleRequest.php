<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class HoldSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
            'items.*.discount_type' => ['nullable', Rule::in(['nominal', 'percent'])],
            'items.*.discount_value' => ['nullable', 'integer', 'min:0', 'max:1000000000'],
            'discount_type' => ['nullable', Rule::in(['nominal', 'percent'])],
            'discount_value' => ['nullable', 'integer', 'min:0', 'max:1000000000'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Keranjang masih kosong.',
            'items.min' => 'Keranjang masih kosong.',
            'items.*.discount_value.max' => 'Diskon item terlalu besar.',
        ];
    }
}
