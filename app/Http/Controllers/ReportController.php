<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $period = in_array($request->query('period'), ['daily', 'weekly', 'monthly'], true)
            ? $request->query('period')
            : 'daily';

        return Inertia::render('Reports/Index', [
            'period' => $period,
            'summary' => $this->summary(),
            'trend' => $this->trend($period),
            'topProducts' => $this->topProducts(),
            'lowStock' => $this->lowStock(),
            'payments' => $this->payments(),
            'trendLabel' => match ($period) {
                'weekly' => '12 minggu terakhir',
                'monthly' => '12 bulan terakhir',
                default => '14 hari terakhir',
            },
        ]);
    }

    public function export(Request $request, string $section): StreamedResponse
    {
        $period = in_array($request->query('period'), ['daily', 'weekly', 'monthly'], true)
            ? $request->query('period')
            : 'daily';

        [$filename, $rows] = match ($section) {
            'tren' => ["tren-penjualan-{$period}.csv", $this->trendRows($period)],
            'produk' => ['produk-terlaris.csv', $this->topProductRows()],
            'stok' => ['stok-menipis.csv', $this->lowStockRows()],
            'pembayaran' => ['rekap-pembayaran.csv', $this->paymentRows()],
            default => ['ringkasan-hari-ini.csv', $this->summaryRows()],
        };

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");

            foreach ($rows as $row) {
                fputcsv($out, $row);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    protected function summary(): array
    {
        $today = Sale::paid()->whereDate('created_at', today());
        $total = (int) (clone $today)->selectRaw('COALESCE(SUM(total - returned_total), 0) as net')->first()->net;
        $count = (clone $today)->count();

        return [
            'total' => $total,
            'count' => $count,
            'average' => $count > 0 ? (int) round($total / $count) : 0,
            'cash' => (int) (clone $today)->where('payment_method', 'cash')
                ->selectRaw('COALESCE(SUM(total - returned_total), 0) as net')
                ->first()->net,
        ];
    }

    protected function trend(string $period): array
    {
        [$labels, $buckets, $rows] = $this->trendData($period);

        return [
            'labels' => $labels,
            'values' => array_map(fn ($bucket) => (int) ($rows[$bucket] ?? 0), $buckets),
        ];
    }

    /** @return array{0: array<int, string>, 1: array<int, string>, 2: Collection<string, int>} */
    protected function trendData(string $period): array
    {
        $labels = [];
        $buckets = [];

        if ($period === 'monthly') {
            $start = today()->subMonths(11)->startOfMonth();

            for ($i = 0; $i < 12; $i++) {
                $date = $start->copy()->addMonths($i);
                $buckets[] = $date->format('Y-m');
                $labels[] = $date->translatedFormat('M Y');
            }

            $rows = Sale::paid()
                ->where('created_at', '>=', $start)
                ->selectRaw("strftime('%Y-%m', created_at) as bucket, SUM(total - returned_total) as total")
                ->groupBy('bucket')
                ->pluck('total', 'bucket');
        } elseif ($period === 'weekly') {
            $start = today()->subWeeks(11)->startOfWeek();

            for ($i = 0; $i < 12; $i++) {
                $date = $start->copy()->addWeeks($i);
                $buckets[] = $date->format('Y-W');
                $labels[] = $date->format('d M');
            }

            $rows = Sale::paid()
                ->where('created_at', '>=', $start)
                ->selectRaw("strftime('%Y-%W', created_at) as bucket, SUM(total - returned_total) as total")
                ->groupBy('bucket')
                ->pluck('total', 'bucket');
        } else {
            $start = today()->subDays(13)->startOfDay();

            for ($i = 0; $i < 14; $i++) {
                $date = $start->copy()->addDays($i);
                $buckets[] = $date->format('Y-m-d');
                $labels[] = $date->format('d M');
            }

            $rows = Sale::paid()
                ->where('created_at', '>=', $start)
                ->selectRaw('date(created_at) as bucket, SUM(total - returned_total) as total')
                ->groupBy('bucket')
                ->pluck('total', 'bucket');
        }

        return [$labels, $buckets, $rows];
    }

    protected function topProducts(): array
    {
        return $this->topProductQuery()->get()->map(fn ($row) => [
            'name' => $row->name,
            'quantity' => (int) $row->quantity,
            'revenue' => (int) $row->revenue,
        ])->all();
    }

    protected function topProductQuery()
    {
        return SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', 'paid')
            ->where('sales.created_at', '>=', now()->subDays(30))
            ->selectRaw('sale_items.name, SUM(sale_items.quantity - sale_items.returned_quantity) as quantity, SUM(sale_items.line_total - sale_items.returned_amount) as revenue')
            ->groupBy('sale_items.name')
            ->havingRaw('SUM(sale_items.quantity - sale_items.returned_quantity) > 0')
            ->orderByDesc('quantity')
            ->limit(8);
    }

    protected function lowStock(): array
    {
        return Product::query()
            ->lowStock()
            ->where('is_active', true)
            ->orderBy('stock')
            ->limit(12)
            ->get(['id', 'name', 'sku', 'stock', 'min_stock', 'unit'])
            ->map(fn (Product $product) => [
                'name' => $product->name,
                'sku' => $product->sku,
                'stock' => $product->stock,
                'min_stock' => $product->min_stock,
                'unit' => $product->unit,
            ])->all();
    }

    protected function payments(): array
    {
        $methods = config('pos.payment_methods');

        return Sale::paid()
            ->whereDate('created_at', today())
            ->selectRaw('payment_method, COUNT(*) as count, SUM(total - returned_total) as total')
            ->groupBy('payment_method')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'method' => $row->payment_method,
                'label' => $methods[$row->payment_method]['label'] ?? $row->payment_method,
                'count' => (int) $row->count,
                'total' => (int) $row->total,
            ])->all();
    }

    protected function summaryRows(): array
    {
        $summary = $this->summary();

        return [
            ['Ringkasan', 'Hari ini', Carbon::now()->format('d/m/Y H:i')],
            ['Total penjualan', $summary['total']],
            ['Jumlah transaksi', $summary['count']],
            ['Rata-rata per transaksi', $summary['average']],
            ['Penjualan tunai', $summary['cash']],
        ];
    }

    protected function trendRows(string $period): array
    {
        $trend = $this->trend($period);
        $rows = [['Periode', 'Total penjualan']];

        foreach ($trend['labels'] as $index => $label) {
            $rows[] = [$label, $trend['values'][$index]];
        }

        return $rows;
    }

    protected function topProductRows(): array
    {
        $rows = [['Produk', 'Jumlah terjual', 'Pendapatan']];

        foreach ($this->topProducts() as $product) {
            $rows[] = [$product['name'], $product['quantity'], $product['revenue']];
        }

        return $rows;
    }

    protected function lowStockRows(): array
    {
        $rows = [['SKU', 'Produk', 'Stok', 'Stok minimum', 'Satuan']];

        foreach ($this->lowStock() as $product) {
            $rows[] = [$product['sku'], $product['name'], $product['stock'], $product['min_stock'], $product['unit']];
        }

        return $rows;
    }

    protected function paymentRows(): array
    {
        $rows = [['Metode', 'Transaksi', 'Total']];

        foreach ($this->payments() as $payment) {
            $rows[] = [$payment['label'], $payment['count'], $payment['total']];
        }

        return $rows;
    }
}
