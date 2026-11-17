import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout, { FormError, PageHeader } from '../../Components/Layout';
import Modal from '../../Components/Modal';
import Receipt from '../../Components/Receipt';
import { formatMoney } from '../../lib/format';
import { printReceipt } from '../../lib/print';

export default function SaleShow({ receipt, canVoid, meta, currency }) {
    const money = (value) => formatMoney(value, currency);
    const [voidOpen, setVoidOpen] = useState(false);
    const form = useForm({ reason: '' });

    function submitVoid(event) {
        event.preventDefault();
        form.post(`/penjualan/${receipt.sale.id}/void`, {
            preserveScroll: true,
            onSuccess: () => {
                setVoidOpen(false);
                form.reset();
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
                            {receipt.items.map((item, index) => (
                                <li key={`${item.name}-${index}`} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
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
                                    </span>
                                    <span className="money">{money(item.line_total)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
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
                        <button type="submit" form="form-void" className="btn btn-danger" disabled={form.processing}>
                            {form.processing ? 'Memproses…' : 'Ya, void transaksi'}
                        </button>
                    </>
                }
            >
                <form id="form-void" onSubmit={submitVoid}>
                    <label className="label" htmlFor="alasan-void">Alasan void (wajib)</label>
                    <textarea
                        id="alasan-void"
                        className="input min-h-28"
                        value={form.data.reason}
                        onChange={(event) => form.setData('reason', event.target.value)}
                        placeholder="Contoh: salah input item, pembeli membatalkan pesanan"
                        autoFocus
                    />
                    <FormError message={form.errors.reason} />
                </form>
            </Modal>
        </AppLayout>
    );
}
