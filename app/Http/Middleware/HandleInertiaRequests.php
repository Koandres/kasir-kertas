<?php

namespace App\Http\Middleware;

use App\Models\Product;
use App\Support\Settings;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();
        $openShift = $user?->openShift();

        return array_merge(parent::share($request), [
            'appName' => 'Kasir Kertas',
            'store' => Settings::store(),
            'appearance' => Settings::appearance(),
            'currency' => Settings::currency(),
            'receiptWidth' => Settings::receiptWidth(),
            'paymentMethods' => collect(config('pos.payment_methods'))
                ->map(fn ($method, $key) => [
                    'key' => $key,
                    'label' => $method['label'],
                    'cash' => (bool) $method['cash'],
                ])->values()->all(),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ] : null,
            ],
            'openShift' => $openShift ? [
                'id' => $openShift->id,
                'opened_at' => $openShift->opened_at?->format('d/m/Y H:i'),
                'opening_cash' => $openShift->opening_cash,
                'expected_cash' => $openShift->expectedCash(),
            ] : null,
            'draftCount' => $user ? $user->sales()->where('status', 'draft')->count() : 0,
            'lowStockCount' => $user?->isAdmin()
                ? Product::lowStock()->where('is_active', true)->count()
                : 0,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }
}
