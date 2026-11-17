<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Penyimpanan pengaturan sederhana (tabel key/value) dengan cache per request.
 */
class Settings
{
    /** @var array<string, string|null>|null */
    protected static ?array $cache = null;

    public static function all(): array
    {
        if (static::$cache === null) {
            static::$cache = DB::table('settings')->pluck('value', 'key')->all();
        }

        return static::$cache;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $all = static::all();

        return array_key_exists($key, $all) && $all[$key] !== null ? $all[$key] : $default;
    }

    public static function put(string $key, mixed $value): void
    {
        $now = now();

        DB::table('settings')->updateOrInsert(
            ['key' => $key],
            ['value' => $value === null ? null : (string) $value, 'updated_at' => $now, 'created_at' => $now],
        );

        $all = static::all();
        $all[$key] = $value === null ? null : (string) $value;
        static::$cache = $all;
    }

    /** @param array<string, mixed> $values */
    public static function putMany(array $values): void
    {
        foreach ($values as $key => $value) {
            static::put($key, $value);
        }
    }

    public static function flush(): void
    {
        static::$cache = null;
    }

    /** @return array{name: string, address: string, phone: string, footer: string, logo: ?string} */
    public static function store(): array
    {
        $defaults = config('pos.store');

        return [
            'name' => (string) static::get('store_name', $defaults['name']),
            'address' => (string) static::get('store_address', $defaults['address']),
            'phone' => (string) static::get('store_phone', $defaults['phone']),
            'footer' => (string) static::get('store_footer', $defaults['footer']),
            'logo' => static::get('store_logo'),
        ];
    }

    /** @return array{theme: string, accent: string, font: string} */
    public static function appearance(): array
    {
        $theme = static::get('theme', 'light');
        $accent = static::get('accent', 'terakota');
        $font = static::get('font', 'humanis');

        return [
            'theme' => in_array($theme, ['light', 'dark'], true) ? $theme : 'light',
            'accent' => array_key_exists($accent, config('pos.accents')) ? $accent : 'terakota',
            'font' => array_key_exists($font, config('pos.fonts')) ? $font : 'humanis',
        ];
    }

    /** @return array{prefix: string, suffix: string, decimals: int, thousand_separator: string, decimal_separator: string} */
    public static function currency(): array
    {
        $defaults = config('pos.currency');

        return [
            'prefix' => (string) static::get('currency_prefix', $defaults['prefix']),
            'suffix' => (string) static::get('currency_suffix', $defaults['suffix']),
            'decimals' => (int) static::get('currency_decimals', $defaults['decimals']),
            'thousand_separator' => (string) static::get('currency_thousand_separator', $defaults['thousand_separator']),
            'decimal_separator' => (string) static::get('currency_decimal_separator', $defaults['decimal_separator']),
        ];
    }

    public static function receiptWidth(): string
    {
        $width = (string) static::get('receipt_width', '58');

        return in_array($width, config('pos.receipt_widths'), true) ? $width : '58';
    }
}
