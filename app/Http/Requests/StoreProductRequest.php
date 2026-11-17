<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $product = $this->route('product');

        return [
            'name' => ['required', 'string', 'max:120'],
            'sku' => ['required', 'string', 'max:64', Rule::unique('products', 'sku')->ignore($product)],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'price' => ['required', 'integer', 'min:0', 'max:999999999'],
            'discount_type' => ['nullable', Rule::in(['none', 'nominal', 'percent'])],
            'discount_value' => ['nullable', 'integer', 'min:0', 'max:1000000000'],
            'cost_price' => ['nullable', 'integer', 'min:0', 'max:999999999'],
            'track_stock' => ['boolean'],
            'stock' => ['required', 'integer', 'min:0', 'max:1000000000'],
            'min_stock' => ['nullable', 'integer', 'min:0', 'max:1000000000'],
            'unit' => ['required', 'string', 'max:20'],
            'is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'sku.unique' => 'Kode/SKU sudah dipakai produk lain.',
        ];
    }
}
