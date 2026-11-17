<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportProductsRequest;
use App\Http\Requests\StoreProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:60'],
            'category_id' => ['nullable', 'integer'],
            'status' => ['nullable', 'in:active,inactive,low'],
        ]);

        $products = Product::query()
            ->with('category:id,name')
            ->when($filters['q'] ?? null, fn ($builder, $value) => $builder->where(function ($query) use ($value) {
                $query->where('name', 'like', "%{$value}%")->orWhere('sku', 'like', "%{$value}%");
            }))
            ->when($filters['category_id'] ?? null, fn ($builder, $value) => $builder->where('category_id', $value))
            ->when(($filters['status'] ?? null) === 'active', fn ($builder) => $builder->where('is_active', true))
            ->when(($filters['status'] ?? null) === 'inactive', fn ($builder) => $builder->where('is_active', false))
            ->when(($filters['status'] ?? null) === 'low', fn ($builder) => $builder->lowStock())
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Product $product) => [
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'category' => $product->category?->name,
                'category_id' => $product->category_id,
                'price' => $product->price,
                'discount_type' => $product->discount_type,
                'discount_value' => $product->discount_value,
                'cost_price' => $product->cost_price,
                'stock' => $product->stock,
                'min_stock' => $product->min_stock,
                'unit' => $product->unit,
                'track_stock' => $product->track_stock,
                'is_active' => $product->is_active,
                'low_stock' => $product->isLowStock(),
            ]);

        return Inertia::render('Products/Index', [
            'products' => $products,
            'categories' => Category::orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'filters' => $filters,
            'stats' => [
                'total' => Product::count(),
                'active' => Product::where('is_active', true)->count(),
                'low' => Product::lowStock()->where('is_active', true)->count(),
            ],
        ]);
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        $data = $this->prepare($request);

        DB::transaction(function () use ($data, $request) {
            $product = Product::create($data);

            if ($product->track_stock && $product->stock > 0) {
                StockMovement::create([
                    'product_id' => $product->id,
                    'type' => 'in',
                    'quantity' => $product->stock,
                    'note' => 'Stok awal produk baru',
                    'user_id' => $request->user()->id,
                ]);
            }
        });

        return back()->with('success', 'Produk ditambahkan.');
    }

    public function update(StoreProductRequest $request, Product $product): RedirectResponse
    {
        $data = $this->prepare($request);

        DB::transaction(function () use ($data, $product, $request) {
            $oldStock = $product->stock;
            $product->update($data);

            $difference = $product->stock - $oldStock;

            if ($product->track_stock && $difference !== 0) {
                StockMovement::create([
                    'product_id' => $product->id,
                    'type' => 'adjustment',
                    'quantity' => $difference,
                    'note' => 'Perubahan stok dari form produk',
                    'user_id' => $request->user()->id,
                ]);
            }
        });

        return back()->with('success', 'Produk diperbarui.');
    }

    public function destroy(Product $product): RedirectResponse
    {
        if ($product->saleItems()->exists()) {
            return back()->with('error', 'Produk sudah dipakai di transaksi. Nonaktifkan saja agar riwayat tetap utuh.');
        }

        $product->delete();

        return back()->with('success', 'Produk dihapus.');
    }

    public function import(ImportProductsRequest $request): RedirectResponse
    {
        $handle = fopen($request->file('file')->getRealPath(), 'r');

        if ($handle === false) {
            return back()->with('error', 'Berkas CSV tidak dapat dibaca.');
        }

        $header = fgetcsv($handle);

        if (! $header) {
            fclose($handle);

            return back()->with('error', 'Berkas CSV kosong.');
        }

        $header = array_map(fn ($value) => strtolower(trim((string) preg_replace('/^\xEF\xBB\xBF/', '', (string) $value))), $header);
        $required = ['sku', 'name', 'price'];

        foreach ($required as $column) {
            if (! in_array($column, $header, true)) {
                fclose($handle);

                return back()->with('error', "Kolom wajib '{$column}' tidak ditemukan di baris pertama CSV.");
            }
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];
        $line = 1;

        DB::transaction(function () use ($handle, $header, &$created, &$updated, &$skipped, &$errors, &$line, $request) {
            while (($row = fgetcsv($handle)) !== false) {
                $line++;

                if ($row === [null] || count(array_filter($row, fn ($value) => trim((string) $value) !== '')) === 0) {
                    continue;
                }

                $row = array_slice(array_pad($row, count($header), ''), 0, count($header));
                $data = array_combine($header, $row);

                $sku = trim((string) ($data['sku'] ?? ''));
                $name = trim((string) ($data['name'] ?? ''));
                $price = (int) preg_replace('/[^0-9-]/', '', (string) ($data['price'] ?? ''));

                if ($sku === '' || $name === '') {
                    $skipped++;
                    $errors[] = "Baris {$line}: SKU dan nama wajib diisi.";

                    continue;
                }

                $categoryId = null;
                $categoryName = trim((string) ($data['category'] ?? ''));

                if ($categoryName !== '') {
                    $categoryId = Category::firstOrCreate(['name' => $categoryName])->id;
                }

                $trackStock = $this->parseBool($data['track_stock'] ?? '1');

                $payload = [
                    'name' => $name,
                    'category_id' => $categoryId,
                    'price' => max(0, $price),
                    'cost_price' => $this->nullableInt($data['cost_price'] ?? null),
                    'stock' => $trackStock ? max(0, (int) ($data['stock'] ?? 0)) : 0,
                    'min_stock' => $trackStock ? max(0, (int) ($data['min_stock'] ?? 0)) : 0,
                    'unit' => trim((string) ($data['unit'] ?? '')) ?: 'pcs',
                    'track_stock' => $trackStock,
                    'is_active' => $this->parseBool($data['is_active'] ?? '1'),
                ];

                if (array_key_exists('discount_type', $data) || array_key_exists('discount_value', $data)) {
                    $discountType = strtolower(trim((string) ($data['discount_type'] ?? 'none')));
                    $discountValue = max(0, (int) preg_replace('/[^0-9]/', '', (string) ($data['discount_value'] ?? 0)));

                    if (! in_array($discountType, ['nominal', 'percent'], true)) {
                        $discountType = 'none';
                        $discountValue = 0;
                    }

                    $payload['discount_type'] = $discountType;
                    $payload['discount_value'] = match ($discountType) {
                        'percent' => min(100, $discountValue),
                        'nominal' => min($discountValue, max(0, $price)),
                        default => 0,
                    };
                }

                $product = Product::where('sku', $sku)->first();

                if ($product) {
                    $oldStock = $product->stock;
                    $product->update($payload);
                    $difference = $product->stock - $oldStock;

                    if ($product->track_stock && $difference !== 0) {
                        StockMovement::create([
                            'product_id' => $product->id,
                            'type' => 'adjustment',
                            'quantity' => $difference,
                            'note' => 'Impor CSV',
                            'user_id' => $request->user()->id,
                        ]);
                    }

                    $updated++;
                } else {
                    $product = Product::create($payload + ['sku' => $sku]);

                    if ($product->track_stock && $product->stock > 0) {
                        StockMovement::create([
                            'product_id' => $product->id,
                            'type' => 'in',
                            'quantity' => $product->stock,
                            'note' => 'Stok awal dari impor CSV',
                            'user_id' => $request->user()->id,
                        ]);
                    }

                    $created++;
                }
            }
        });

        fclose($handle);

        $message = "Impor selesai: {$created} produk baru, {$updated} diperbarui, {$skipped} dilewati.";

        if ($errors !== []) {
            $message .= ' '.implode(' ', array_slice($errors, 0, 3));
        }

        return back()->with($skipped > 0 ? 'error' : 'success', $message);
    }

    public function template(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['sku', 'name', 'category', 'price', 'cost_price', 'stock', 'min_stock', 'unit', 'track_stock', 'is_active', 'discount_type', 'discount_value']);
            fputcsv($out, ['KOPI-001', 'Kopi Hitam', 'Minuman', 8000, 4000, 50, 10, 'pcs', 1, 1, 'none', 0]);
            fputcsv($out, ['JASA-001', 'Jasa Pembuatan', 'Jasa', 50000, '', 0, 0, 'kali', 0, 1, 'percent', 10]);
            fclose($out);
        }, 'template-produk-kasir-kertas.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    protected function prepare(StoreProductRequest $request): array
    {
        $data = $request->validated();

        $data['category_id'] = $data['category_id'] ?? null;
        $data['cost_price'] = $data['cost_price'] ?? null;
        $data['min_stock'] = $data['min_stock'] ?? 0;
        $data['track_stock'] = $request->boolean('track_stock');
        $data['is_active'] = $request->boolean('is_active');

        $type = in_array($data['discount_type'] ?? 'none', ['nominal', 'percent'], true)
            ? $data['discount_type']
            : 'none';
        $value = $type === 'none' ? 0 : max(0, (int) ($data['discount_value'] ?? 0));

        $data['discount_type'] = $type;
        $data['discount_value'] = match ($type) {
            'percent' => min(100, $value),
            'nominal' => min($value, (int) $data['price']),
            default => 0,
        };

        if (! $data['track_stock']) {
            $data['stock'] = 0;
            $data['min_stock'] = 0;
        }

        return $data;
    }

    protected function nullableInt(mixed $value): ?int
    {
        $value = preg_replace('/[^0-9]/', '', (string) $value);

        return $value === '' ? null : (int) $value;
    }

    protected function parseBool(mixed $value): bool
    {
        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'ya', 'yes', 'y', 'aktif'], true);
    }
}
