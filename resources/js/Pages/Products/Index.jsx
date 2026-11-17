import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout, { EmptyState, FormError, PageHeader } from '../../Components/Layout';
import Modal from '../../Components/Modal';
import Pagination from '../../Components/Pagination';
import { formatMoney } from '../../lib/format';

const emptyProduct = {
    name: '',
    sku: '',
    category_id: '',
    price: '',
    discount_type: 'none',
    discount_value: '',
    cost_price: '',
    track_stock: true,
    stock: '0',
    min_stock: '0',
    unit: 'pcs',
    is_active: true,
};

export default function ProductsIndex({ products, categories, filters, stats, currency }) {
    const money = (value) => formatMoney(value, currency);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const [search, setSearch] = useState(filters.q ?? '');
    const [category, setCategory] = useState(filters.category_id ?? '');
    const [status, setStatus] = useState(filters.status ?? '');

    const form = useForm({ ...emptyProduct });
    const importer = useForm({ file: null });

    function applyFilters(event) {
        event?.preventDefault();
        router.get(
            '/produk',
            {
                q: search || undefined,
                category_id: category || undefined,
                status: status || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function resetFilters() {
        setSearch('');
        setCategory('');
        setStatus('');
        router.get('/produk', {}, { preserveState: true, preserveScroll: true, replace: true });
    }

    function openCreate() {
        setEditing(null);
        form.setData({ ...emptyProduct });
        form.clearErrors();
        setFormOpen(true);
    }

    function openEdit(product) {
        setEditing(product);
        form.setData({
            name: product.name,
            sku: product.sku,
            category_id: product.category_id ?? '',
            price: String(product.price),
            discount_type: product.discount_type ?? 'none',
            discount_value: product.discount_value > 0 ? String(product.discount_value) : '',
            cost_price: product.cost_price === null ? '' : String(product.cost_price),
            track_stock: product.track_stock,
            stock: String(product.stock),
            min_stock: String(product.min_stock),
            unit: product.unit,
            is_active: product.is_active,
        });
        form.clearErrors();
        setFormOpen(true);
    }

    function submit(event) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setFormOpen(false);
                form.reset();
            },
        };

        if (editing) {
            form.put(`/produk/${editing.id}`, options);
        } else {
            form.post('/produk', options);
        }
    }

    function destroy(product) {
        if (window.confirm(`Hapus produk ${product.name}?`)) {
            router.delete(`/produk/${product.id}`, { preserveScroll: true });
        }
    }

    function submitImport(event) {
        event.preventDefault();
        importer.post('/produk/impor', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setImportOpen(false);
                importer.reset();
            },
        });
    }

    return (
        <AppLayout>
            <Head title="Produk" />
            <PageHeader
                eyebrow="Katalog"
                title="Produk"
                description="Kelola barang, jasa, harga, dan stok. Nama serta harga disalin ke setiap transaksi agar riwayat tidak berubah."
                actions={
                    <>
                        <button type="button" className="btn" onClick={() => setImportOpen(true)}>
                            Impor CSV
                        </button>
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                            Produk baru
                        </button>
                    </>
                }
            />

            <div className="stat-strip mb-4 grid grid-cols-3 divide-x divide-line">
                <div className="stat-cell">
                    <p className="stat-label">Total</p>
                    <p className="stat-value text-center sm:text-left">{stats.total}</p>
                </div>
                <div className="stat-cell">
                    <p className="stat-label">Aktif</p>
                    <p className="stat-value text-center sm:text-left">{stats.active}</p>
                </div>
                <div className="stat-cell">
                    <p className="stat-label">Stok menipis</p>
                    <p className={`stat-value text-center sm:text-left ${stats.low > 0 ? 'text-warning' : ''}`}>
                        {stats.low}
                    </p>
                </div>
            </div>

            <form onSubmit={applyFilters} className="mb-4 flex flex-wrap items-end gap-2 border border-line bg-surface p-3">
                <div className="min-w-[200px] flex-1">
                    <label className="label" htmlFor="cari-produk-admin">Cari</label>
                    <input
                        id="cari-produk-admin"
                        className="input"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Nama atau SKU"
                    />
                </div>
                <div className="w-full sm:w-44">
                    <label className="label" htmlFor="filter-kategori">Kategori</label>
                    <select
                        id="filter-kategori"
                        className="input"
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                    >
                        <option value="">Semua kategori</option>
                        {categories.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                </div>
                <div className="w-full sm:w-44">
                    <label className="label" htmlFor="filter-status">Status</label>
                    <select
                        id="filter-status"
                        className="input"
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                    >
                        <option value="">Semua status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                        <option value="low">Stok menipis</option>
                    </select>
                </div>
                <button type="submit" className="btn btn-primary">Terapkan</button>
                <button type="button" className="btn btn-ghost" onClick={resetFilters}>Reset</button>
            </form>

            <div className="panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table-pos min-w-[760px]">
                        <thead>
                            <tr>
                                <th>Produk</th>
                                <th>Kategori</th>
                                <th className="text-right">Harga jual</th>
                                <th className="text-right">Modal</th>
                                <th className="text-right">Stok</th>
                                <th>Status</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.data.length === 0 ? (
                                <tr>
                                    <td colSpan="7">
                                        <EmptyState title="Belum ada produk">
                                            Tambahkan produk pertama atau impor dari CSV.
                                        </EmptyState>
                                    </td>
                                </tr>
                            ) : (
                                products.data.map((product) => (
                                    <tr key={product.id}>
                                        <td>
                                            <div className="font-semibold">{product.name}</div>
                                            <div className="money text-[11px] text-muted">{product.sku}</div>
                                        </td>
                                        <td className="text-muted">{product.category ?? '—'}</td>
                                        <td className="money text-right">
                                            {money(product.price)}
                                            {product.discount_value > 0 &&
                                            ['nominal', 'percent'].includes(product.discount_type) ? (
                                                <div className="text-[10px] text-accent">
                                                    diskon{' '}
                                                    {product.discount_type === 'percent'
                                                        ? `${product.discount_value}%`
                                                        : money(product.discount_value)}
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="money text-right text-muted">
                                            {product.cost_price === null ? '—' : money(product.cost_price)}
                                        </td>
                                        <td className="text-right">
                                            {product.track_stock ? (
                                                <span className={product.low_stock ? 'text-warning' : ''}>
                                                    <span className="money">{product.stock}</span>{' '}
                                                    <span className="text-xs text-muted">{product.unit}</span>
                                                </span>
                                            ) : (
                                                <span className="badge badge-neutral">Tanpa stok</span>
                                            )}
                                            {product.low_stock ? (
                                                <div className="text-[10px] text-warning">
                                                    min. {product.min_stock}
                                                </div>
                                            ) : null}
                                        </td>
                                        <td>
                                            <span className={`badge ${product.is_active ? 'badge-success' : 'badge-neutral'}`}>
                                                {product.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-1">
                                                <button type="button" className="btn btn-sm btn-ghost" onClick={() => openEdit(product)}>
                                                    Ubah
                                                </button>
                                                <button type="button" className="btn btn-sm btn-ghost text-danger" onClick={() => destroy(product)}>
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination paginator={products} />
            </div>

            <Modal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                title={editing ? 'Ubah produk' : 'Produk baru'}
                description={editing ? editing.sku : 'Isi data produk atau jasa.'}
                size="lg"
                footer={
                    <>
                        <button type="button" className="btn" onClick={() => setFormOpen(false)}>Batal</button>
                        <button type="submit" form="form-produk" className="btn btn-primary" disabled={form.processing}>
                            {form.processing ? 'Menyimpan…' : 'Simpan produk'}
                        </button>
                    </>
                }
            >
                <form id="form-produk" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="label" htmlFor="nama-produk">Nama produk</label>
                        <input id="nama-produk" className="input" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                        <FormError message={form.errors.name} />
                    </div>
                    <div>
                        <label className="label" htmlFor="sku-produk">Kode / SKU</label>
                        <input id="sku-produk" className="input money" value={form.data.sku} onChange={(event) => form.setData('sku', event.target.value)} />
                        <FormError message={form.errors.sku} />
                    </div>
                    <div>
                        <label className="label" htmlFor="kategori-produk">Kategori</label>
                        <select id="kategori-produk" className="input" value={form.data.category_id} onChange={(event) => form.setData('category_id', event.target.value)}>
                            <option value="">Tanpa kategori</option>
                            {categories.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                        <FormError message={form.errors.category_id} />
                    </div>
                    <div>
                        <label className="label" htmlFor="harga-produk">Harga jual (Rp)</label>
                        <input id="harga-produk" className="input money" inputMode="numeric" value={form.data.price} onChange={(event) => form.setData('price', event.target.value.replace(/[^0-9]/g, ''))} />
                        <FormError message={form.errors.price} />
                    </div>
                    <div>
                        <label className="label" htmlFor="modal-produk">Harga modal (opsional)</label>
                        <input id="modal-produk" className="input money" inputMode="numeric" value={form.data.cost_price} onChange={(event) => form.setData('cost_price', event.target.value.replace(/[^0-9]/g, ''))} />
                        <FormError message={form.errors.cost_price} />
                    </div>
                    <div className="border-t border-line pt-4 sm:col-span-2">
                        <label className="label" htmlFor="diskon-produk">Diskon default (opsional)</label>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                id="jenis-diskon-produk"
                                className="input w-40"
                                value={form.data.discount_type}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    form.setData((data) => ({
                                        ...data,
                                        discount_type: value,
                                        discount_value: value === 'none' ? '' : data.discount_value,
                                    }));
                                }}
                                aria-label="Jenis diskon default"
                            >
                                <option value="none">Tanpa diskon</option>
                                <option value="nominal">Nominal (Rp)</option>
                                <option value="percent">Persen (%)</option>
                            </select>
                            {form.data.discount_type !== 'none' ? (
                                <input
                                    id="diskon-produk"
                                    className="input money w-40"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={form.data.discount_value}
                                    onChange={(event) =>
                                        form.setData('discount_value', event.target.value.replace(/[^0-9]/g, ''))
                                    }
                                    aria-label="Nilai diskon default"
                                />
                            ) : null}
                            <span className="text-xs text-muted">
                                Otomatis mengisi diskon item saat produk masuk keranjang.
                            </span>
                        </div>
                        <FormError message={form.errors.discount_type} />
                        <FormError message={form.errors.discount_value} />
                    </div>
                    <div>
                        <label className="label" htmlFor="satuan-produk">Satuan</label>
                        <input id="satuan-produk" className="input" value={form.data.unit} onChange={(event) => form.setData('unit', event.target.value)} placeholder="pcs, porsi, botol" />
                        <FormError message={form.errors.unit} />
                    </div>
                    <div className="flex items-end">
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                            <input
                                type="checkbox"
                                className="h-4 w-4 accent-[color:var(--accent)]"
                                checked={form.data.track_stock}
                                onChange={(event) => form.setData('track_stock', event.target.checked)}
                            />
                            Lacak stok produk ini
                        </label>
                    </div>
                    <div>
                        <label className="label" htmlFor="stok-produk">Stok</label>
                        <input
                            id="stok-produk"
                            className="input money"
                            inputMode="numeric"
                            disabled={!form.data.track_stock}
                            value={form.data.track_stock ? form.data.stock : '0'}
                            onChange={(event) => form.setData('stock', event.target.value.replace(/[^0-9]/g, ''))}
                        />
                        <FormError message={form.errors.stock} />
                    </div>
                    <div>
                        <label className="label" htmlFor="min-produk">Batas stok minimum</label>
                        <input
                            id="min-produk"
                            className="input money"
                            inputMode="numeric"
                            disabled={!form.data.track_stock}
                            value={form.data.track_stock ? form.data.min_stock : '0'}
                            onChange={(event) => form.setData('min_stock', event.target.value.replace(/[^0-9]/g, ''))}
                        />
                        <FormError message={form.errors.min_stock} />
                    </div>
                    <div className="flex items-end">
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                            <input
                                type="checkbox"
                                className="h-4 w-4 accent-[color:var(--accent)]"
                                checked={form.data.is_active}
                                onChange={(event) => form.setData('is_active', event.target.checked)}
                            />
                            Produk aktif dan tampil di kasir
                        </label>
                    </div>
                </form>
            </Modal>

            <Modal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                title="Impor produk dari CSV"
                description="Gunakan satu format baku. Baris dengan SKU yang sama akan diperbarui."
                footer={
                    <>
                        <button type="button" className="btn" onClick={() => setImportOpen(false)}>Batal</button>
                        <button type="submit" form="form-impor" className="btn btn-primary" disabled={importer.processing}>
                            {importer.processing ? 'Mengimpor…' : 'Impor sekarang'}
                        </button>
                    </>
                }
            >
                <form id="form-impor" onSubmit={submitImport} className="space-y-4">
                    <div className="wall-note text-xs">
                        Kolom: <span className="money">sku, name, category, price, cost_price, stock, min_stock, unit, track_stock, is_active, discount_type, discount_value</span>.
                        Baris pertama harus berisi nama kolom tersebut. Kolom diskon bersifat opsional
                        (<span className="money">none</span>, <span className="money">nominal</span>, atau <span className="money">percent</span>).
                    </div>
                    <div>
                        <label className="label" htmlFor="file-impor">Berkas CSV</label>
                        <input
                            id="file-impor"
                            type="file"
                            accept=".csv,text/csv"
                            className="input py-2"
                            onChange={(event) => importer.setData('file', event.target.files?.[0] ?? null)}
                        />
                        <FormError message={importer.errors.file} />
                    </div>
                    <a href="/produk/template" className="link-underline text-sm">Unduh template CSV</a>
                </form>
            </Modal>
        </AppLayout>
    );
}
