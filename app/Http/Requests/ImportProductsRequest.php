<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportProductsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:4096'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.mimes' => 'Berkas harus berformat CSV.',
        ];
    }
}
