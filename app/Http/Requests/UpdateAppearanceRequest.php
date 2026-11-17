<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAppearanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'theme' => ['required', Rule::in(['light', 'dark'])],
            'accent' => ['required', Rule::in(array_keys(config('pos.accents')))],
            'font' => ['required', Rule::in(array_keys(config('pos.fonts')))],
            'currency_prefix' => ['required', 'string', 'max:10'],
            'currency_suffix' => ['nullable', 'string', 'max:10'],
            'currency_decimals' => ['required', 'integer', 'min:0', 'max:2'],
            'currency_thousand_separator' => ['required', 'string', 'max:1'],
            'currency_decimal_separator' => ['required', 'string', 'max:1'],
        ];
    }
}
