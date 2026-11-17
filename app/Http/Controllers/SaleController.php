<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSaleReturnRequest;
use App\Http\Requests\VoidSaleRequest;
use App\Models\Sale;
use App\Models\User;
use App\Services\SaleService;
use App\Support\Receipt;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'user_id' => ['nullable', 'integer'],
            'payment_method' => ['nullable', Rule::in(array_keys(config('pos.payment_methods')))],
            'status' => ['nullable', Rule::in(['paid', 'void', 'draft'])],
            'q' => ['nullable', 'string', 'max:60'],
        ]);

        $query = Sale::query()
            ->with('user:id,name')
            ->withCount('items')
            ->when(! $user->isAdmin(), fn ($builder) => $builder->where('user_id', $user->id))
            ->when($filters['from'] ?? null, fn ($builder, $value) => $builder->whereDate('created_at', '>=', $value))
            ->when($filters['to'] ?? null, fn ($builder, $value) => $builder->whereDate('created_at', '<=', $value))
            ->when($filters['user_id'] ?? null, fn ($builder, $value) => $builder->where('user_id', $value))
            ->when($filters['payment_method'] ?? null, fn ($builder, $value) => $builder->where('payment_method', $value))
            ->when($filters['status'] ?? null, fn ($builder, $value) => $builder->where('status', $value))
            ->when($filters['q'] ?? null, fn ($builder, $value) => $builder->where('number', 'like', "%{$value}%"));

        $summary = (clone $query)->where('status', 'paid')->selectRaw('COALESCE(SUM(total - returned_total),0) as total, COUNT(*) as count')->first();

        $sales = $query->latest()->paginate(20)->withQueryString()->through(fn (Sale $sale) => [
            'id' => $sale->id,
            'number' => $sale->number,
            'created_at' => $sale->created_at?->format('d/m/Y H:i'),
            'cashier' => $sale->user?->name,
            'items_count' => $sale->items_count,
            'total' => $sale->total,
            'returned_total' => $sale->returned_total,
            'net_total' => $sale->netTotal(),
            'has_return' => $sale->hasReturns(),
            'payment_method' => $sale->payment_method,
            'payment_label' => config("pos.payment_methods.{$sale->payment_method}.label", $sale->payment_method),
            'status' => $sale->status,
        ]);

        return Inertia::render('Sales/Index', [
            'sales' => $sales,
            'filters' => $filters,
            'summary' => [
                'total' => (int) ($summary->total ?? 0),
                'count' => (int) ($summary->count ?? 0),
            ],
            'cashiers' => $user->isAdmin() ? User::orderBy('name')->get(['id', 'name']) : [],
        ]);
    }

    public function show(Request $request, Sale $sale): Response
    {
        $user = $request->user();

        abort_unless($user->isAdmin() || $sale->user_id === $user->id, 403);

        $sale->load([
            'items',
            'user:id,name',
            'voidedBy:id,name',
            'shift',
            'returns.user:id,name',
            'returns.items.saleItem:id,name',
        ]);

        $hasReturns = $sale->returns->isNotEmpty();

        return Inertia::render('Sales/Show', [
            'receipt' => Receipt::forSale($sale),
            'canVoid' => $user->isAdmin() && $sale->status === 'paid' && ! $hasReturns,
            'canReturn' => $user->isAdmin() && $sale->status === 'paid',
            'meta' => [
                'status' => $sale->status,
                'created_at' => $sale->created_at?->format('d/m/Y H:i'),
                'cashier' => $sale->user?->name,
                'void_reason' => $sale->void_reason,
                'voided_at' => $sale->voided_at?->format('d/m/Y H:i'),
                'voided_by' => $sale->voidedBy?->name,
                'shift_opened_at' => $sale->shift?->opened_at?->format('d/m/Y H:i'),
                'has_returns' => $hasReturns,
            ],
        ]);
    }

    public function returnItems(StoreSaleReturnRequest $request, Sale $sale, SaleService $sales)
    {
        $return = $sales->returnItems($sale, $request->user(), $request->validated());

        return redirect()
            ->route('penjualan.show', $sale)
            ->with('success', 'Retur dicatat. Dana dikembalikan sebesar Rp '.number_format($return->total, 0, ',', '.').'.');
    }

    public function void(VoidSaleRequest $request, Sale $sale, SaleService $sales)
    {
        $sales->void($sale, $request->user(), $request->validated('reason'));

        return redirect()->route('penjualan.show', $sale)->with('success', 'Transaksi dibatalkan dan stok sudah dikembalikan.');
    }
}
