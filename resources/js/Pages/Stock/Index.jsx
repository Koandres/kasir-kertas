import { Head, useForm } from '@inertiajs/react';
import AppLayout, { EmptyState, FormError, PageHeader } from '../../Components/Layout';
import Pagination from '../../Components/Pagination';

const typeLabel = {
    in: 'Masuk',
    out: 'Keluar',
    adjustment: 'Koreksi',
    sale: 'Penjualan',
    void: 'Void',
};

const typeBadge = {
    in: 'badge-success',
    out: 'badge-warning',
    adjustment: 'badge-neutral',
    sale: 'badge-neutral',
    void: 'badge-danger',
};

export default function StockIndex({ movements, lowStock, products }) {
    const form = useForm({ product_id: '', type: 'in', quantity: '', note: '' });
    const selected = products.find((product) => String(product.id) === String(form.data.product_id));

    function submit(event) {
        event.preventDefault();
        form.post('/stok/penyesuaian', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('quantity', 'note');
            },
        });
    }

    function pick(product) {
        form.setData('product_id', String(product.id));
        form.setData('type', 'in');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return (
        <AppLayout>
            <Head title="Stok" />
            <PageHeader
                eyebrow="Gudang"
                title="Stok"
                description="Setiap perubahan stok tercatat sebagai pergerakan. Gunakan koreksi untuk hasil hitung ulang."
            />

            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                <form onSubmit={submit} className="panel p-4">
                    <h2 className="mb-4 text-lg font-semibold">Penyesuaian stok</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="label" htmlFor="produk-stok">Produk</label>
                            <select id="produk-stok" className="input" value={form.data.product_id} onChange={(event) => form.setData('product_id', event.target.value)}>
                                <option value="">Pilih produk…</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} — {product.sku} ({product.track_stock ? `${product.stock} ${product.unit}` : 'tanpa stok'})
                                    </option>
                                ))}
                            </select>
                            <FormError message={form.errors.product_id} />
                        </div>

                        <div>
                            <label className="label" htmlFor="jenis-stok">Jenis</label>
                            <select id="jenis-stok" className="input" value={form.data.type} onChange={(event) => form.setData('type', event.target.value)}>
                                <option value="in">Barang masuk (+)</option>
                                <option value="out">Barang keluar / rusak (−)</option>
                                <option value="adjustment">Koreksi (boleh minus)</option>
                            </select>
                            <FormError message={form.errors.type} />
                        </div>

                        <div>
                            <label className="label" htmlFor="jumlah-stok">Jumlah</label>
                            <input
                                id="jumlah-stok"
                                className="input money"
                                inputMode="numeric"
                                value={form.data.quantity}
                                onChange={(event) => form.setData('quantity', event.target.value.replace(/[^0-9-]/g, ''))}
                                placeholder="0"
                            />
                            <FormError message={form.errors.quantity} />
                            {selected ? (
                                <p className="mt-1 text-xs text-muted">
                                    Stok saat ini <span className="money text-ink">{selected.stock}</span> {selected.unit}
                                </p>
                            ) : null}
                        </div>

                        <div className="sm:col-span-2">
                            <label className="label" htmlFor="catatan-stok">Alasan / catatan</label>
                            <input
                                id="catatan-stok"
                                className="input"
                                value={form.data.note}
                                onChange={(event) => form.setData('note', event.target.value)}
                                placeholder="Contoh: kiriman dari supplier, kemasan rusak, hasil hitung ulang"
                            />
                            <FormError message={form.errors.note} />
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button type="submit" className="btn btn-primary" disabled={form.processing}>
                            {form.processing ? 'Menyimpan…' : 'Simpan penyesuaian'}
                        </button>
                    </div>
                </form>

                <section className="panel p-4">
                    <h2 className="mb-1 text-lg font-semibold">Stok menipis</h2>
                    <p className="mb-3 text-xs text-muted">Produk aktif dengan stok di bawah batas minimum.</p>
                    {lowStock.length === 0 ? (
                        <p className="py-6 text-sm text-muted">Semua stok aman.</p>
                    ) : (
                        <ul className="divide-y divide-line border-y border-line">
                            {lowStock.map((product) => (
                                <li key={product.id} className="flex items-center justify-between gap-3 py-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold">{product.name}</p>
                                        <p className="money text-[11px] text-muted">
                                            {product.sku} · min {product.min_stock}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="money text-sm text-warning">
                                            {product.stock} {product.unit}
                                        </span>
                                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => pick(product)}>
                                            Isi
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <section className="panel mt-4 overflow-hidden">
                <div className="border-b border-line px-4 py-3">
                    <h2 className="text-lg font-semibold">Pergerakan stok</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="table-pos min-w-[720px]">
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>Produk</th>
                                <th>Jenis</th>
                                <th className="text-right">Perubahan</th>
                                <th>Catatan</th>
                                <th>Oleh</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.data.length === 0 ? (
                                <tr>
                                    <td colSpan="6">
                                        <EmptyState title="Belum ada pergerakan stok">
                                            Penjualan dan penyesuaian akan muncul di sini.
                                        </EmptyState>
                                    </td>
                                </tr>
                            ) : (
                                movements.data.map((movement) => (
                                    <tr key={movement.id}>
                                        <td className="money whitespace-nowrap text-muted">{movement.created_at}</td>
                                        <td>
                                            <div className="font-semibold">{movement.product ?? 'Produk dihapus'}</div>
                                            <div className="money text-[11px] text-muted">{movement.sku}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${typeBadge[movement.type] ?? 'badge-neutral'}`}>
                                                {typeLabel[movement.type] ?? movement.type}
                                            </span>
                                        </td>
                                        <td className={`money text-right font-semibold ${movement.quantity < 0 ? 'text-danger' : 'text-success'}`}>
                                            {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                                        </td>
                                        <td className="text-muted">{movement.note ?? '—'}</td>
                                        <td className="text-muted">{movement.user ?? '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination paginator={movements} />
            </section>
        </AppLayout>
    );
}
