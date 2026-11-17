<?php

namespace App\Http\Controllers;

use App\Http\Requests\HoldSaleRequest;
use App\Http\Requests\StoreSaleRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Services\SaleService;
use App\Support\Receipt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CashierController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $shift = $user->openShift();

        return Inertia::render('Cashier', [
            'categories' => Category::query()
                ->withCount(['products' => fn ($query) => $query->where('is_active', true)])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name']),
            'products' => $this->productPayload(
                Product::query()->active()->orderBy('name')->get()
            ),
            'drafts' => $user->sales()
                ->where('status', 'draft')
                ->withCount('items')
                ->latest()
                ->get()
                ->map(fn (Sale $sale) => [
                    'id' => $sale->id,
                    'number' => $sale->number,
                    'total' => $sale->total,
                    'item_count' => $sale->items_count,
                    'created_at' => $sale->created_at?->format('d/m/Y H:i'),
                ]),
            'shift' => $shift ? [
                'opened_at' => $shift->opened_at?->format('d/m/Y H:i'),
                'opening_cash' => $shift->opening_cash,
                'expected_cash' => $shift->expectedCash(),
            ] : null,
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q'));

        if ($query === '') {
            return response()->json(['products' => []]);
        }

        $products = Product::query()
            ->active()
            ->where(function ($builder) use ($query) {
                $builder->where('name', 'like', "%{$query}%")
                    ->orWhere('sku', 'like', "%{$query}%");
            })
            ->orderByRaw('CASE WHEN sku = ? THEN 0 WHEN name LIKE ? THEN 1 ELSE 2 END', [$query, "{$query}%"])
            ->orderBy('name')
            ->limit(30)
            ->get();

        return response()->json(['products' => $this->productPayload($products)]);
    }

    public function pay(StoreSaleRequest $request, SaleService $sales): JsonResponse
    {
        $sale = $sales->pay($request->user(), $request->validated());

        return response()->json(['sale' => Receipt::forSale($sale)]);
    }

    public function hold(HoldSaleRequest $request, SaleService $sales): JsonResponse
    {
        $sale = $sales->hold($request->user(), $request->validated());

        return response()->json([
            'draft' => [
                'id' => $sale->id,
                'number' => $sale->number,
                'total' => $sale->total,
                'created_at' => $sale->created_at?->format('d/m/Y H:i'),
            ],
        ]);
    }

    public function resume(Request $request, Sale $sale): JsonResponse
    {
        $this->authorizeDraft($request, $sale);

        $sale->load('items.product');

        return response()->json([
            'draft' => [
                'id' => $sale->id,
                'number' => $sale->number,
                'discount_type' => $sale->discount_type,
                'discount_value' => $sale->discount_value,
                'items' => $sale->items->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'name' => $item->name,
                    'sku' => $item->product?->sku,
                    'price' => $item->product?->price ?? $item->price,
                    'quantity' => $item->quantity,
                    'discount_type' => $item->discount_type,
                    'discount_value' => $item->discount_value,
                    'stock' => $item->product?->stock ?? 0,
                    'track_stock' => (bool) ($item->product?->track_stock ?? false),
                    'unit' => $item->product?->unit ?? 'pcs',
                ])->values(),
            ],
        ]);
    }

    public function destroyDraft(Request $request, Sale $sale): JsonResponse
    {
        $this->authorizeDraft($request, $sale);

        $sale->delete();

        return response()->json(['ok' => true]);
    }

    protected function authorizeDraft(Request $request, Sale $sale): void
    {
        $user = $request->user();

        abort_unless($user->isAdmin() || $sale->user_id === $user->id, 403);
        abort_unless($sale->status === 'draft', 404);
    }

    protected function productPayload($products): array
    {
        return $products->map(fn (Product $product) => [
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'price' => $product->price,
            'discount_type' => $product->discount_type,
            'discount_value' => $product->discount_value,
            'stock' => $product->stock,
            'track_stock' => $product->track_stock,
            'unit' => $product->unit,
            'category_id' => $product->category_id,
        ])->values()->all();
    }
}
