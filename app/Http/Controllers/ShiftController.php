<?php

namespace App\Http\Controllers;

use App\Http\Requests\CloseShiftRequest;
use App\Http\Requests\StoreShiftRequest;
use App\Models\Shift;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ShiftController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $current = $user->openShift();

        $history = Shift::query()
            ->with('user:id,name')
            ->when(! $user->isAdmin(), fn ($builder) => $builder->where('user_id', $user->id))
            ->latest('opened_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Shift $shift) => [
                'id' => $shift->id,
                'cashier' => $shift->user?->name,
                'opened_at' => $shift->opened_at?->format('d/m/Y H:i'),
                'closed_at' => $shift->closed_at?->format('d/m/Y H:i'),
                'opening_cash' => $shift->opening_cash,
                'closing_cash' => $shift->closing_cash,
                'expected_cash' => $shift->expected_cash,
                'difference' => $shift->difference(),
                'is_open' => $shift->closed_at === null,
            ]);

        return Inertia::render('Shifts/Index', [
            'current' => $current ? [
                'id' => $current->id,
                'opened_at' => $current->opened_at?->format('d/m/Y H:i'),
                'opening_cash' => $current->opening_cash,
                'cash_sales' => $current->cashSalesTotal(),
                'expected_cash' => $current->expectedCash(),
                'sales_count' => $current->sales()->where('status', 'paid')->count(),
            ] : null,
            'history' => $history,
        ]);
    }

    public function open(StoreShiftRequest $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->openShift()) {
            return back()->with('error', 'Masih ada shift yang terbuka. Tutup dulu shift tersebut.');
        }

        $user->shifts()->create([
            'opened_at' => now(),
            'opening_cash' => $request->integer('opening_cash'),
        ]);

        return back()->with('success', 'Shift dibuka. Selamat bekerja.');
    }

    public function close(CloseShiftRequest $request): RedirectResponse
    {
        $user = $request->user();
        $shift = $user->openShift();

        if (! $shift) {
            return back()->with('error', 'Tidak ada shift yang sedang terbuka.');
        }

        $expected = $shift->expectedCash();
        $closing = $request->integer('closing_cash');

        $shift->update([
            'closed_at' => now(),
            'closing_cash' => $closing,
            'expected_cash' => $expected,
        ]);

        $difference = $closing - $expected;

        return back()->with('success', sprintf(
            'Shift ditutup. Selisih kas: %s%s.',
            $difference === 0 ? 'pas' : ($difference > 0 ? 'lebih ' : 'kurang '),
            $difference === 0 ? '' : number_format(abs($difference), 0, ',', '.'),
        ));
    }
}
