<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RestoreBackupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:51200', 'extensions:sqlite,db,sqlite3'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.extensions' => 'Berkas harus berekstensi .sqlite, .db, atau .sqlite3.',
        ];
    }
}
