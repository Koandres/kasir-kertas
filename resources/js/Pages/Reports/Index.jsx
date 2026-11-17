import { Head, Link } from '@inertiajs/react';
import AppLayout, { EmptyState, PageHeader } from '../../Components/Layout';
import { formatMoney, formatNumber } from '../../lib/format';

function TrendChart({ trend, money }) {
    const width = 760;
    const height = 220;
    const paddingX = 36;
    const paddingY = 26;
    const values = trend.values;
    const max = Math.max(...values, 1);
    const step = values.length > 1 ? (width - paddingX * 2) / (values.length - 1) : 0;
    const points = values.map((value, index) => {
        const x = paddingX + index * step;
        const y = height - paddingY - (value / max) * (height - paddingY * 2);

        return [x, y];
    });
    const line = points.map(([x, y]) => `${x},${y}`).join(' ');
    const area = `${paddingX},${height - paddingY} ${line} ${width - paddingX},${height - paddingY}`;
    const labelEvery = Math.ceil(trend.labels.length / 7);
    const last = points[points.length - 1];

    return (
        <div className="overflow-x-auto">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-auto w-full min-w-[560px]"
                role="img"
                aria-label={`Grafik tren penjualan: ${trend.labels
                    .map((label, index) => `${label} ${money(values[index])}`)
                    .join(', ')}`}
            >
                <defs>
                    <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
                    </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = height - paddingY - ratio * (height - paddingY * 2);

                    return (
                        <g key={ratio}>
                            <line
                                x1={paddingX}
                                x2={width - paddingX}
                                y1={y}
                                y2={y}
                                stroke="var(--line)"
                                strokeWidth="1"
                                strokeDasharray="2 5"
                            />
                            <text x={4} y={y + 3} fill="var(--muted)" fontSize="9">
                                {formatNumber(Math.round(max * ratio / 1000))}rb
                            </text>
                        </g>
                    );
                })}

                <polygon points={area} fill="url(#trend-area)" />
                <polyline
                    points={line}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {points.map(([x, y], index) => (
                    <g key={trend.labels[index]}>
                        {index === points.length - 1 ? (
                            <>
                                <circle cx={x} cy={y} r="7" fill="var(--accent)" opacity="0.16" />
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="3.6"
                                    fill="var(--surface)"
                                    stroke="var(--accent)"
                                    strokeWidth="2"
                                />
                            </>
                        ) : (
                            <circle cx={x} cy={y} r="2.4" fill="var(--accent)" opacity="0.55" />
                        )}
                        {index % labelEvery === 0 || index === points.length - 1 ? (
                            <text
                                x={x}
                                y={height - 6}
                                textAnchor="middle"
                                fill="var(--muted)"
                                fontSize="9"
                            >
                                {trend.labels[index]}
                            </text>
                        ) : null}
                    </g>
                ))}

                {last ? (
                    <line
                        x1={last[0]}
                        x2={last[0]}
                        y1={last[1]}
                        y2={height - paddingY}
                        stroke="var(--accent)"
                        strokeWidth="1"
                        strokeDasharray="2 4"
                        opacity="0.45"
                    />
                ) : null}
            </svg>
        </div>
    );
}

export default function ReportsIndex({
    period,
    summary,
    trend,
    topProducts,
    lowStock,
    payments,
    trendLabel,
    currency,
}) {
    const money = (value) => formatMoney(value, currency);
    const maxQuantity = Math.max(...topProducts.map((product) => product.quantity), 1);
    const periods = [
        { key: 'daily', label: 'Harian' },
        { key: 'weekly', label: 'Mingguan' },
        { key: 'monthly', label: 'Bulanan' },
    ];

    return (
        <AppLayout>
            <Head title="Laporan" />
            <PageHeader
                eyebrow="Laporan"
                title="Laporan penjualan"
                description="Ringkasan hari ini, tren, produk terlaris, stok menipis, dan rekap metode bayar. Semua bisa diunduh sebagai CSV."
                actions={
                    <a href="/laporan/ekspor/ringkasan" className="btn">
                        Ekspor ringkasan
                    </a>
                }
            />

            <div className="stat-strip grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
                <div className="stat-cell lg:border-r lg:border-line">
                    <p className="stat-label">Penjualan hari ini</p>
                    <p className="stat-value stat-value-lg">{money(summary.total)}</p>
                </div>
                <div className="stat-cell lg:border-r lg:border-line">
                    <p className="stat-label">Transaksi lunas</p>
                    <p className="stat-value stat-value-lg">{summary.count}</p>
                </div>
                <div className="stat-cell lg:border-r lg:border-line">
                    <p className="stat-label">Rata-rata per transaksi</p>
                    <p className="stat-value stat-value-lg">{money(summary.average)}</p>
                </div>
                <div className="stat-cell">
                    <p className="stat-label">Penjualan tunai</p>
                    <p className="stat-value stat-value-lg">{money(summary.cash)}</p>
                </div>
            </div>

            <section className="panel mt-4">
                <div className="panel-head">
                    <div>
                        <h2 className="panel-title">Tren penjualan</h2>
                        <p className="panel-sub">{trendLabel}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex border border-line">
                            {periods.map((item) => (
                                <Link
                                    key={item.key}
                                    href={`/laporan?period=${item.key}`}
                                    preserveScroll
                                    className={`flex min-h-9 items-center px-3 text-xs font-semibold transition-colors ${
                                        period === item.key
                                            ? 'bg-accent text-accent-ink'
                                            : 'bg-surface text-muted hover:bg-surface2'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                        <a href={`/laporan/ekspor/tren?period=${period}`} className="btn btn-sm btn-ghost">
                            Unduh CSV
                        </a>
                    </div>
                </div>
                <div className="px-3 py-4">
                    <TrendChart trend={trend} money={money} />
                </div>
            </section>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <section className="panel">
                    <div className="panel-head">
                        <div>
                            <h2 className="panel-title">Produk terlaris</h2>
                            <p className="panel-sub">30 hari terakhir</p>
                        </div>
                        <a href="/laporan/ekspor/produk" className="btn btn-sm btn-ghost">CSV</a>
                    </div>
                    {topProducts.length === 0 ? (
                        <EmptyState title="Belum ada penjualan" />
                    ) : (
                        <ul className="divide-y divide-line">
                            {topProducts.map((product) => (
                                <li key={product.name} className="px-4 py-2.5">
                                    <div className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="min-w-0 truncate font-semibold">{product.name}</span>
                                        <span className="whitespace-nowrap text-muted">
                                            <span className="money text-ink">{product.quantity}</span> terjual
                                        </span>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-3">
                                        <div className="h-1.5 flex-1 bg-surface2">
                                            <div
                                                className="h-1.5"
                                                style={{
                                                    width: `${(product.quantity / maxQuantity) * 100}%`,
                                                    background: 'var(--accent)',
                                                }}
                                            />
                                        </div>
                                        <span className="money w-24 text-right text-xs text-muted">{money(product.revenue)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="panel">
                    <div className="panel-head">
                        <div>
                            <h2 className="panel-title">Rekap metode bayar</h2>
                            <p className="panel-sub">Hari ini</p>
                        </div>
                        <a href="/laporan/ekspor/pembayaran" className="btn btn-sm btn-ghost">CSV</a>
                    </div>
                    {payments.length === 0 ? (
                        <EmptyState title="Belum ada pembayaran hari ini" />
                    ) : (
                        <table className="table-pos">
                            <thead>
                                <tr>
                                    <th>Metode</th>
                                    <th className="text-right">Transaksi</th>
                                    <th className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => (
                                    <tr key={payment.method}>
                                        <td className="font-semibold">{payment.label}</td>
                                        <td className="money text-right">{payment.count}</td>
                                        <td className="money text-right">{money(payment.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>

            <section className="panel mt-4">
                <div className="panel-head">
                    <div>
                        <h2 className="panel-title">Produk dengan stok menipis</h2>
                        <p className="panel-sub">Stok aktif di bawah atau sama dengan batas minimum</p>
                    </div>
                    <a href="/laporan/ekspor/stok" className="btn btn-sm btn-ghost">CSV</a>
                </div>
                {lowStock.length === 0 ? (
                    <EmptyState title="Semua stok aman" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-pos min-w-[560px]">
                            <thead>
                                <tr>
                                    <th>Produk</th>
                                    <th>SKU</th>
                                    <th className="text-right">Stok</th>
                                    <th className="text-right">Minimum</th>
                                    <th>Satuan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowStock.map((product) => (
                                    <tr key={product.sku}>
                                        <td className="font-semibold">{product.name}</td>
                                        <td className="money text-muted">{product.sku}</td>
                                        <td className="money text-right text-warning">{product.stock}</td>
                                        <td className="money text-right">{product.min_stock}</td>
                                        <td className="text-muted">{product.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </AppLayout>
    );
}
