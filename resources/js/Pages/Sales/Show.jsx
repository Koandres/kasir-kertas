import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout, { FormError, PageHeader } from '../../Components/Layout';
import Modal from '../../Components/Modal';
import Receipt from '../../Components/Receipt';
import { formatMoney } from '../../lib/format';
import { printReceipt } from '../../lib/print';

export default function SaleShow({ receipt, canVoid, canReturn, meta, currency, paymentMethods }) {
    const money = (value) => formatMoney(value, currency);
    const [voidOpen, setVoidOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    const [returnQty, setReturnQty] = useState({});

    const voidForm = useForm({ reason: '' });
    const returnForm = useForm({ reason: '', refund_method: 'cash', items: [] });

    const remaining = (item) => item.remaining_quantity ?? (item.quantity - (item.returned_quantity ?? 0));
    const netBase = receipt.sale.subtotal - receipt.sale.item_discount;
    const returnCount = Object.values(returnQty).reduce((total, qty) => total + qty, 0);
    const refundable = receipt.items.some((item) => remaining(item) > 0);

    function refundEstimate(item) {
        const qty = returnQty[item.id] ?? 0;

        if (qty <= 0 || netBase <= 0) {
            return 0;
        }

        const after = (item.returned_quantity ?? 0) + qty;
        const allocated = Math.floor(
            (item.line_total * after * receipt.sale.total) / (item.quantity * netBase),
        );

        return Math.max(0, allocated - (item.returned_amount ?? 0));
    }

    const refundTotal = receipt.items.reduce((total, item) => total + refundEstimate(item), 0);

    function submitVoid(event) {
        event.preventDefault();
        voidForm.post(`/penjualan/${receipt.sale.id}/void`, {
            preserveScroll: true,
            onSuccess: () => {
                setVoidOpen(false);
                voidForm.reset();
            },
        });
    }

    function openReturn() {
        setReturnQty({});
        returnForm.setData({ reason: '', refund_method: 'cash', items: [] });
        returnForm.clearErrors();
        setReturnOpen(true);
    }

    function updateReturnQty(item, value) {
        const quantity = Math.max(0, Math.min(remaining(item), Number.parseInt(value, 10) || 0));
        const next = { ...returnQty, [item.id]: quantity };

        setReturnQty(next);
        returnForm.setData(
            'items',
            receipt.items
                .filter((row) => (next[row.id] ?? 0) > 0)
                .map((row) => ({ sale_item_id: row.id, quantity: next[row.id] })),
        );
        returnForm.clearErrors('items');
    }

    function submitReturn(event) {
        event.preventDefault();

        if (returnCount === 0) {
            return;
        }

        returnForm.post(`/penjualan/${receipt.sale.id}/retur`, {
            preserveScroll: true,
            onSuccess: () => {
                setReturnOpen(false);
                setReturnQty({});
                returnForm.reset();
            },
        });
    }

    return (
        <AppLayout>
            <Head title={receipt.sale.number} />
            <PageHeader
                eyebrow="Riwayat transaksi"
                title={receipt.sale.number}
                description={`${receipt.sale.created_at} · ${receipt.sale.cashier} · ${receipt.sale.payment_label}`}
                actions={
                    <>
                        <Link href="/penjualan" className="btn btn-ghost">Kembali</Link>
                        <button type="button" className="btn" onClick={() => printReceipt(receipt.width)}>
                            Cetak struk
                        </button>
                        {canReturn && refundable ? (
                            <button type="button" className="btn" onClick={openReturn}>
                                Retur item
                            </button>
                        ) : null}
                        {canVoid ? (
                            <button type="button" className="btn btn-danger" onClick={() => setVoidOpen(true)}>
                                Batalkan (void)
                            </button>
                        ) : null}
                    </>
                }
            />

            {receipt.sale.status === 'void' ? (
                <div className="wall-note mb-4 text-danger">
                    <strong>Transaksi dibatalkan.</strong> {meta.void_reason}
                    {meta.voided_at ? ` · ${meta.voided_at} oleh ${meta.voided_by}` : ''}
                </div>
            ) : null}

            {meta.has_returns ? (
                <div className="wall-note mb-4">
                    <strong>Sudah ada retur.</strong> Pendapatan transaksi ini dicatat neto dan void tidak lagi tersedia.
                </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
                <div className="border border-line bg-surface p-5">
                    <Receipt receipt={receipt} />
                </div>

                <div className="space-y-4">
                    <section className="panel">
                        <div className="border-b border-line px-4 py-3">
                            <h2 className="text-lg font-semibold">Ringkasan</h2>
                        </div>
                        <dl className="divide-y divide-line text-sm">
                            <div className="flex justify-between gap-4 px-4 py-3">
                                <dt className="text-muted">Status</dt>
                                <dd className="font-semibold">
                                    {receipt.sale.status === 'paid' ? 'Lunas' : receipt.sale.status === 'void' ? 'Void' : 'Draft'}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 px-4 py-3">
                                <dt className="text-muted">Subtotal</dt>
                                <dd className="money">{money(receipt.sale.subtotal)}</dd>
                            </div>
                            {receipt.sale.item_discount > 0 ? (
                                <div className="flex justify-between gap-4 px-4 py-3">
                                    <dt className="text-muted">Diskon item</dt>
                                    <dd className="money">-{money(receipt.sale.item_discount)}</dd>
                                </div>
                            ) : null}
                            <div className="flex justify-between gap-4 px-4 py-3">
                                <dt className="text-muted">Diskon</dt>
                                <dd className="money">-{money(receipt.sale.discount)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 px-4 py-3">
                                <dt className="text-muted">Total</dt>
                                <dd className="money text-lg font-semibold">{money(receipt.sale.total)}</dd>
                            </div>
                            {receipt.sale.returned_total > 0 ? (
                                <>
                                    <div className="flex justify-between gap-4 px-4 py-3">
                                        <dt className="text-muted">Retur</dt>
                                        <dd className="money text-danger">-{money(receipt.sale.returned_total)}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4 px-4 py-3">
                                        <dt className="text-muted">Neto</dt>
                                        <dd className="money text-lg font-semibold">{money(receipt.sale.net_total)}</dd>
                                    </div>
                                </>
                            ) : null}
                            <div className="flex justify-between gap-4 px-4 py-3">
                                <dt className="text-muted">Dibayar</dt>
                                <dd className="money">{money(receipt.sale.paid)}</dd>
                            </div>
                            {receipt.sale.payment_method === 'cash' ? (
                                <div className="flex justify-between gap-4 px-4 py-3">
                                    <dt className="text-muted">Kembalian</dt>
                                    <dd className="money">{money(receipt.sale.change)}</dd>
                                </div>
                            ) : null}
                            <div className="flex justify-between gap-4 px-4 py-3">
                                <dt className="text-muted">Metode</dt>
                                <dd>{receipt.sale.payment_label}</dd>
                            </div>
                            <div className="flex justify-between gap-4 px-4 py-3">
                                <dt className="text-muted">Shift dibuka</dt>
                                <dd>{meta.shift_opened_at ?? 'Transaksi tanpa shift'}</dd>
                            </div>
                        </dl>
                    </section>

                    <section className="panel">
                        <div className="border-b border-line px-4 py-3">
                            <h2 className="text-lg font-semibold">Item</h2>
                        </div>
                        <ul className="divide-y divide-line text-sm">
                            {receipt.items.map((item) => (
                                <li key={item.id} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                                    <span>
                                        <span className="font-semibold">{item.name}</span>
                                        <span className="ml-2 text-xs text-muted">
                                            {item.quantity} × {money(item.price)}
                                        </span>
                                        {item.discount > 0 ? (
                                            <span className="ml-2 text-xs text-accent">
                                                −{money(item.discount)}
                                                {item.discount_type === 'percent'
                                                    ? ` (${item.discount_value}%)`
                                                    : ''}
                                            </span>
                                        ) : null}
                                        {item.returned_quantity > 0 ? (
                                            <span className="ml-2 text-xs text-danger">
                                                retur {item.returned_quantity} · {money(item.returned_amount)}
                                            </span>
                                        ) : null}
                                    </span>
                                    <span className="money">{money(item.line_total - item.returned_amount)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {receipt.returns.length > 0 ? (
                        <section className="panel">
                            <div className="flex items-center justify-between border-b border-line px-4 py-3">
                                <h2 className="text-lg font-semibold">Riwayat retur</h2>
                                <span className="badge badge-neutral">{receipt.returns.length} retur</span>
                            </div>
                            <ul className="divide-y divide-line text-sm">
                                {receipt.returns.map((item) => (
                                    <li key={item.id} className="px-4 py-3">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <span className="font-semibold">{money(item.total)}</span>
                                            <span className="text-xs text-muted">
                                                {item.created_at} · {item.refund_label} · {item.cashier}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-muted">{item.reason}</p>
                                        <ul className="mt-2 space-y-1 text-xs text-muted">
                                            {item.items.map((line, index) => (
                                                <li key={`${item.id}-${index}`} className="flex justify-between gap-3">
                                                    <span>{line.name} × {line.quantity}</span>
                                                    <span className="money">{money(line.refund_amount)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}
                </div>
            </div>

            <Modal
                open={voidOpen}
                onClose={() => setVoidOpen(false)}
                title="Batalkan transaksi"
                description="Stok akan dikembalikan otomatis. Tindakan ini tercatat dan tidak dapat diurungkan."
                footer={
                    <>
                        <button type="button" className="btn" onClick={() => setVoidOpen(false)}>Batal</button>
                        <button type="submit" form="form-void" className="btn btn-danger" disabled={voidForm.processing}>
                            {voidForm.processing ? 'Memproses…' : 'Ya, void transaksi'}
                        </button>
                    </>
                }
            >
                <form id="form-void" onSubmit={submitVoid}>
                    <label className="label" htmlFor="alasan-void">Alasan void (wajib)</label>
                    <textarea
                        id="alasan-void"
                        className="input min-h-28"
                        value={voidForm.data.reason}
                        onChange={(event) => voidForm.setData('reason', event.target.value)}
                        placeholder="Contoh: salah input item, pembeli membatalkan pesanan"
                        autoFocus
                    />
                    <FormError message={voidForm.errors.reason} />
                </form>
            </Modal>

            <Modal
                open={returnOpen}
                onClose={() => setReturnOpen(false)}
                title="Retur sebagian"
                description="Pilih item yang dikembalikan. Stok kembali otomatis dan refund dihitung setelah diskon."
                footer={
                    <>
                        <button type="button" className="btn" onClick={() => setReturnOpen(false)}>Batal</button>
                        <button
                            type="submit"
                            form="form-retur"
                            className="btn btn-primary"
                            disabled={returnForm.processing || returnCount === 0}
                        >
                            {returnForm.processing ? 'Memproses…' : `Retur & refund ${money(refundTotal)}`}
                        </button>
                    </>
                }
            >
                <form id="form-retur" onSubmit={submitReturn} className="space-y-4">
                    <div className="divide-y divide-line border-y border-line">
                        {receipt.items.map((item) => {
                            const max = remaining(item);

                            return (
                                <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                                    <div>
                                        <p className="text-sm font-semibold">{item.name}</p>
                                        <p className="text-xs text-muted">
                                            {item.quantity} terjual · sisa {max}
                                            {item.returned_quantity > 0 ? ` · sudah retur ${item.returned_quantity}` : ''}
                                        </p>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        max={max}
                                        step="1"
                                        className="input money w-24 text-right"
                                        aria-label={`Jumlah retur ${item.name}`}
                                        value={returnQty[item.id] ?? 0}
                                        onChange={(event) => updateReturnQty(item, event.target.value)}
                                        disabled={max === 0}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div>
                        <label className="label" htmlFor="metode-refund">Metode pengembalian dana</label>
                        <select
                            id="metode-refund"
                            className="input"
                            value={returnForm.data.refund_method}
                            onChange={(event) => returnForm.setData('refund_method', event.target.value)}
                        >
                            {paymentMethods.map((method) => (
                                <option key={method.key} value={method.key}>{method.label}</option>
                            ))}
                        </select>
                        <FormError message={returnForm.errors.refund_method} />
                    </div>

                    <div>
                        <label className="label" htmlFor="alasan-retur">Alasan retur (wajib)</label>
                        <textarea
                            id="alasan-retur"
                            className="input min-h-24"
                            value={returnForm.data.reason}
                            onChange={(event) => returnForm.setData('reason', event.target.value)}
                            placeholder="Contoh: produk rusak, pesanan salah, pembeli mengembalikan sebagian"
                        />
                        <FormError message={returnForm.errors.reason} />
                    </div>

                    <FormError message={returnForm.errors.items} />

                    <div className="flex items-center justify-between border-t border-line pt-3">
                        <span className="text-sm text-muted">Perkiraan refund</span>
                        <span className="money text-lg font-semibold">{money(refundTotal)}</span>
                    </div>
                    <p className="text-xs text-muted">
                        Nominal final dihitung server setelah diskon item dan diskon nota, lalu dicatat pada riwayat retur.
                    </p>
                </form>
            </Modal>
        </AppLayout>
    );
}
