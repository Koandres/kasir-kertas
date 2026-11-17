import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout, { EmptyState, PageHeader } from '../../Components/Layout';
import Pagination from '../../Components/Pagination';
import { formatMoney } from '../../lib/format';

const statusBadge = {
    paid: 'badge-success',
    void: 'badge-danger',
    draft: 'badge-neutral',
};

const statusLabel = {
    paid: 'Lunas',
    void: 'Void',
    draft: 'Draft',
};

export default function SalesIndex({ sales, filters, summary, cashiers, currency, paymentMethods }) {
    const money = (value) => formatMoney(value, currency);
    const [form, setForm] = useState({
        from: filters.from ?? '',
        to: filters.to ?? '',
        user_id: filters.user_id ?? '',
        payment_method: filters.payment_method ?? '',
        status: filters.status ?? '',
        q: filters.q ?? '',
    });

    function apply(event) {
        event?.preventDefault();
        router.get('/penjualan', Object.fromEntries(
            Object.entries(form).filter(([, value]) => value !== ''),
        ), { preserveState: true, preserveScroll: true, replace: true });
    }

    function reset() {
        const cleared = { from: '', to: '', user_id: '', payment_method: '', status: '', q: '' };
        setForm(cleared);
        router.get('/penjualan', {}, { preserveState: true, preserveScroll: true, replace: true });
    }

    function update(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    return (
        <AppLayout>
            <Head title="Riwayat transaksi" />
            <PageHeader
                eyebrow="Operasional"
                title="Riwayat transaksi"
                description="Cari transaksi berdasarkan tanggal, kasir, metode, atau nomor struk. Klik baris untuk membuka struk."
            />

            <div className="stat-strip mb-4 grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="stat-cell">
                    <p className="stat-label">Pendapatan neto (filter)</p>
                    <p className="stat-value">{money(summary.total)}</p>
                </div>
                <div className="stat-cell">
                    <p className="stat-label">Transaksi lunas</p>
                    <p className="stat-value">{summary.count}</p>
                </div>
                <div className="stat-cell">
                    <p className="stat-label">Rata-rata</p>
                    <p className="stat-value">
                        {money(summary.count > 0 ? Math.round(summary.total / summary.count) : 0)}
                    </p>
                </div>
            </div>

            <form onSubmit={apply} className="mb-4 grid gap-2 border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-6">
                <div>
                    <label className="label" htmlFor="dari">Dari tanggal</label>
                    <input id="dari" type="date" className="input" value={form.from} onChange={(event) => update('from', event.target.value)} />
                </div>
                <div>
                    <label className="label" htmlFor="sampai">Sampai tanggal</label>
                    <input id="sampai" type="date" className="input" value={form.to} onChange={(event) => update('to', event.target.value)} />
                </div>
                {cashiers.length > 0 ? (
                    <div>
                        <label className="label" htmlFor="kasir">Kasir</label>
                        <select id="kasir" className="input" value={form.user_id} onChange={(event) => update('user_id', event.target.value)}>
                            <option value="">Semua kasir</option>
                            {cashiers.map((cashier) => (
                                <option key={cashier.id} value={cashier.id}>{cashier.name}</option>
                            ))}
                        </select>
                    </div>
                ) : null}
                <div>
                    <label className="label" htmlFor="metode">Metode</label>
                    <select id="metode" className="input" value={form.payment_method} onChange={(event) => update('payment_method', event.target.value)}>
                        <option value="">Semua metode</option>
                        {paymentMethods.map((method) => (
                            <option key={method.key} value={method.key}>{method.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="label" htmlFor="status">Status</label>
                    <select id="status" className="input" value={form.status} onChange={(event) => update('status', event.target.value)}>
                        <option value="">Semua status</option>
                        <option value="paid">Lunas</option>
                        <option value="void">Void</option>
                        <option value="draft">Draft</option>
                    </select>
                </div>
                <div>
                    <label className="label" htmlFor="nomor">Nomor</label>
                    <input id="nomor" className="input" value={form.q} onChange={(event) => update('q', event.target.value)} placeholder="POS-…" />
                </div>
                <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
                    <button type="submit" className="btn btn-primary">Terapkan filter</button>
                    <button type="button" className="btn btn-ghost" onClick={reset}>Reset</button>
                </div>
            </form>

            <div className="panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table-pos min-w-[760px]">
                        <thead>
                            <tr>
                                <th>Nomor</th>
                                <th>Waktu</th>
                                <th>Kasir</th>
                                <th className="text-right">Item</th>
                                <th>Metode</th>
                                <th className="text-right">Total</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.data.length === 0 ? (
                                <tr>
                                    <td colSpan="7">
                                        <EmptyState title="Tidak ada transaksi">
                                            Coba longgarkan filter tanggal atau kata kunci.
                                        </EmptyState>
                                    </td>
                                </tr>
                            ) : (
                                sales.data.map((sale) => (
                                    <tr key={sale.id} className="cursor-pointer" onClick={() => router.visit(`/penjualan/${sale.id}`)}>
                                        <td>
                                            <Link href={`/penjualan/${sale.id}`} className="money link-underline font-semibold">
                                                {sale.number}
                                            </Link>
                                        </td>
                                        <td className="money whitespace-nowrap text-muted">{sale.created_at}</td>
                                        <td>{sale.cashier}</td>
                                        <td className="money text-right">{sale.items_count}</td>
                                        <td>{sale.payment_label}</td>
                                        <td className="money text-right font-semibold">
                                            {money(sale.net_total)}
                                            {sale.has_return ? (
                                                <span className="block text-[11px] font-normal text-muted line-through">
                                                    {money(sale.total)}
                                                </span>
                                            ) : null}
                                        </td>
                                        <td>
                                            <span className={`badge ${statusBadge[sale.status] ?? 'badge-neutral'}`}>
                                                {statusLabel[sale.status] ?? sale.status}
                                            </span>
                                            {sale.has_return ? (
                                                <span className="badge badge-warning ml-1">Retur</span>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination paginator={sales} />
            </div>
        </AppLayout>
    );
}
