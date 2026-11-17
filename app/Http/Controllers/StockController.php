<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAdjustmentRequest;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\SaleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockController extends Controller
{
    public function index(Request $request): Response
    {
        $movements = StockMovement::query()
            ->with(['product:id,name,sku,unit', 'user:id,name'])
            ->latest()
            ->paginate(30)
            ->withQueryString()
            ->through(fn (StockMovement $movement) => [
                'id' => $movement->id,
                'type' => $movement->type,
                'quantity' => $movement->quantity,
                'note' => $movement->note,
                'created_at' => $movement->created_at?->format('d/m/Y H:i'),
                'product' => $movement->product?->name,
                'sku' => $movement->product?->sku,
                'unit' => $movement->product?->unit,
                'user' => $movement->user?->name,
            ]);

        return Inertia::render('Stock/Index', [
            'movements' => $movements,
            'lowStock' => Product::query()
                ->lowStock()
                ->where('is_active', true)
                ->orderBy('stock')
                ->limit(12)
                ->get(['id', 'name', 'sku', 'stock', 'min_stock', 'unit']),
            'products' => Product::query()
                ->active()
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'stock', 'unit', 'track_stock']),
        ]);
    }

    public function adjust(StoreAdjustmentRequest $request, SaleService $sales): RedirectResponse
    {
        $product = Product::findOrFail($request->integer('product_id'));

        $sales->adjustStock(
            $product,
            $request->string('type')->toString(),
            $request->integer('quantity'),
            $request->string('note')->toString(),
            $request->user(),
        );

        return back()->with('success', 'Stok diperbarui dan pergerakannya tercatat.');
    }
}
