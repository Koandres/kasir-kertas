import { Head, useForm } from '@inertiajs/react';
import AppLayout, { EmptyState, FormError, PageHeader } from '../../Components/Layout';
import Pagination from '../../Components/Pagination';
import { formatMoney, parseDigits } from '../../lib/format';

export default function ShiftsIndex({ current, history, currency, auth }) {
    const money = (value) => formatMoney(value, currency);
    const openForm = useForm({ opening_cash: '' });
    const closeForm = useForm({ closing_cash: '' });
    const closing = parseDigits(closeForm.data.closing_cash);
    const difference = current ? closing - current.expected_cash : 0;

    function submitOpen(event) {
        event.preventDefault();
        openForm.post('/shift/buka', { preserveScroll: true, onSuccess: () => openForm.reset() });
    }

    function submitClose(event) {
        event.preventDefault();
        closeForm.post('/shift/tutup', { preserveScroll: true, onSuccess: () => closeForm.reset() });
    }

    return (
        <AppLayout>
            <Head title="Shift" />
            <PageHeader
                eyebrow="Operasional"
                title="Shift kasir"
                description="Buka shift dengan modal awal, lalu tutup dengan menghitung kas fisik."
            />

            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <section className="panel p-5">
                    {current ? (
                        <>
                            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                                <div>
                                    <p className="section-label">Shift berjalan</p>
                                    <p className="mt-1 text-xl font-semibold">{current.opened_at}</p>
                                    <p className="text-sm text-muted">{auth.user.name} · {current.sales_count} transaksi lunas</p>
                                </div>
                                <span className="badge badge-success">Terbuka</span>
                            </div>

                            <dl className="stat-strip mt-4 grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                                <div className="stat-cell">
                                    <dt className="stat-label">Kas awal</dt>
                                    <dd className="stat-value">{money(current.opening_cash)}</dd>
                                </div>
                                <div className="stat-cell">
                                    <dt className="stat-label">Penjualan tunai</dt>
                                    <dd className="stat-value">{money(current.cash_sales)}</dd>
                                </div>
                                <div className="stat-cell">
                                    <dt className="stat-label">Kas diharapkan</dt>
                                    <dd className="stat-value text-accent">{money(current.expected_cash)}</dd>
                                </div>
                            </dl>

                            <form onSubmit={submitClose} className="mt-5 border-t border-line pt-4">
                                <h2 className="mb-2 text-base font-semibold">Tutup shift</h2>
                                <p className="mb-3 text-sm text-muted">
                                    Hitung uang fisik di laci, lalu masukkan jumlahnya. Selisih akan ditampilkan
                                    terhadap kas yang diharapkan.
                                </p>
                                <div className="max-w-xs">
                                    <label className="label" htmlFor="kas-fisik">Kas fisik (Rp)</label>
                                    <input
                                        id="kas-fisik"
                                        className="input money"
                                        inputMode="numeric"
                                        value={closeForm.data.closing_cash}
                                        onChange={(event) => closeForm.setData('closing_cash', event.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="0"
                                    />
                                    <FormError message={closeForm.errors.closing_cash} />
                                </div>
                                <div className="mt-3 flex flex-wrap items-baseline gap-3 text-sm">
                                    <span className="text-muted">Selisih:</span>
                                    <span className={`money text-lg font-semibold ${difference === 0 ? '' : difference > 0 ? 'text-success' : 'text-danger'}`}>
                                        {money(difference)}
                                    </span>
                                    <span className="text-xs text-muted">
                                        {difference === 0 ? 'pas' : difference > 0 ? 'lebih dari perkiraan' : 'kurang dari perkiraan'}
                                    </span>
                                </div>
                                <button type="submit" className="btn btn-primary mt-4" disabled={closeForm.processing}>
                                    {closeForm.processing ? 'Menutup…' : 'Tutup shift'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <form onSubmit={submitOpen}>
                            <p className="section-label">Mulai kerja</p>
                            <h2 className="mt-1 text-xl font-semibold">Buka shift baru</h2>
                            <p className="mt-1 mb-4 text-sm text-muted">
                                Masukkan modal awal kas di laci. Penjualan tunai selama shift akan
                                ditambahkan ke angka ini saat penutupan.
                            </p>
                            <div className="max-w-xs">
                                <label className="label" htmlFor="modal-awal">Modal awal kas (Rp)</label>
                                <input
                                    id="modal-awal"
                                    className="input money"
                                    inputMode="numeric"
                                    value={openForm.data.opening_cash}
                                    onChange={(event) => openForm.setData('opening_cash', event.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="0"
                                />
                                <FormError message={openForm.errors.opening_cash} />
                            </div>
                            <button type="submit" className="btn btn-primary mt-4" disabled={openForm.processing}>
                                {openForm.processing ? 'Membuka…' : 'Buka shift'}
                            </button>
                        </form>
                    )}
                </section>

                <section className="panel p-5">
                    <h2 className="text-lg font-semibold">Cara kerja</h2>
                    <ol className="mt-3 space-y-3 text-sm text-muted">
                        <li>
                            <span className="font-semibold text-ink">1. Buka shift.</span> Catat modal awal
                            agar selisih kas bisa dihitung.
                        </li>
                        <li>
                            <span className="font-semibold text-ink">2. Jualan seperti biasa.</span> Transaksi
                            tunai otomatis masuk ke kas yang diharapkan.
                        </li>
                        <li>
                            <span className="font-semibold text-ink">3. Tutup shift.</span> Masukkan kas fisik.
                            Selisih ditampilkan, bukan disembunyikan.
                        </li>
                    </ol>
                    <div className="mt-4 border-t border-line pt-3 text-xs text-muted">
                        Transaksi non-tunai tetap tercatat di riwayat, tetapi tidak menambah kas fisik.
                    </div>
                </section>
            </div>

            <section className="panel mt-4 overflow-hidden">
                <div className="border-b border-line px-4 py-3">
                    <h2 className="text-lg font-semibold">Riwayat shift</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="table-pos min-w-[820px]">
                        <thead>
                            <tr>
                                <th>Kasir</th>
                                <th>Dibuka</th>
                                <th>Ditutup</th>
                                <th className="text-right">Kas awal</th>
                                <th className="text-right">Diharapkan</th>
                                <th className="text-right">Kas fisik</th>
                                <th className="text-right">Selisih</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.data.length === 0 ? (
                                <tr>
                                    <td colSpan="7">
                                        <EmptyState title="Belum ada shift">
                                            Shift pertama akan muncul setelah dibuka.
                                        </EmptyState>
                                    </td>
                                </tr>
                            ) : (
                                history.data.map((shift) => (
                                    <tr key={shift.id}>
                                        <td className="font-semibold">{shift.cashier}</td>
                                        <td className="money whitespace-nowrap text-muted">{shift.opened_at}</td>
                                        <td className="money whitespace-nowrap text-muted">{shift.closed_at ?? '—'}</td>
                                        <td className="money text-right">{money(shift.opening_cash)}</td>
                                        <td className="money text-right">{shift.expected_cash === null ? '—' : money(shift.expected_cash)}</td>
                                        <td className="money text-right">{shift.closing_cash === null ? '—' : money(shift.closing_cash)}</td>
                                        <td className="text-right">
                                            {shift.is_open ? (
                                                <span className="badge badge-success">Berjalan</span>
                                            ) : shift.difference === 0 ? (
                                                <span className="badge badge-neutral">Pas</span>
                                            ) : (
                                                <span className={`money font-semibold ${shift.difference > 0 ? 'text-success' : 'text-danger'}`}>
                                                    {money(shift.difference)}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination paginator={history} />
            </section>
        </AppLayout>
    );
}
