import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout, { FormError, PageHeader } from '../../Components/Layout';
import Icon from '../../Components/Icon';
import Modal from '../../Components/Modal';
import { formatMoney, applyAppearance } from '../../lib/format';

const tabs = [
    { key: 'profil', label: 'Profil toko' },
    { key: 'tampilan', label: 'Tampilan & uang' },
    { key: 'pengguna', label: 'Pengguna' },
    { key: 'backup', label: 'Backup & restore' },
];

const roleLabel = { admin: 'Admin', kasir: 'Kasir' };

export default function SettingsIndex({
    store,
    appearance,
    currency,
    receiptWidth,
    accents,
    fonts,
    receiptWidths,
    users,
    backup,
    auth,
}) {
    const initialTab = new URLSearchParams(window.location.search).get('tab');
    const [tab, setTab] = useState(tabs.some((item) => item.key === initialTab) ? initialTab : 'profil');
    const [userOpen, setUserOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const profile = useForm({
        name: store.name,
        address: store.address ?? '',
        phone: store.phone ?? '',
        footer: store.footer ?? '',
        receipt_width: receiptWidth,
        logo: null,
    });

    const appearanceForm = useForm({
        theme: appearance.theme,
        accent: appearance.accent,
        font: appearance.font,
        currency_prefix: currency.prefix,
        currency_suffix: currency.suffix ?? '',
        currency_decimals: String(currency.decimals),
        currency_thousand_separator: currency.thousand_separator,
        currency_decimal_separator: currency.decimal_separator,
    });

    const userForm = useForm({
        name: '',
        email: '',
        role: 'kasir',
        password: '',
        password_confirmation: '',
        is_active: true,
    });

    const restoreForm = useForm({ file: null });

    function switchTab(key) {
        setTab(key);
        window.history.replaceState(null, '', `/pengaturan?tab=${key}`);

        if (tab === 'tampilan' && key !== 'tampilan') {
            revertAppearance();
        }
    }

    function previewAppearance(key, value) {
        appearanceForm.setData(key, value);
        applyAppearance({ ...appearanceForm.data, [key]: value });
    }

    function revertAppearance() {
        appearanceForm.setData({
            theme: appearance.theme,
            accent: appearance.accent,
            font: appearance.font,
            currency_prefix: currency.prefix,
            currency_suffix: currency.suffix ?? '',
            currency_decimals: String(currency.decimals),
            currency_thousand_separator: currency.thousand_separator,
            currency_decimal_separator: currency.decimal_separator,
        });
        applyAppearance(appearance);
    }

    function submitProfile(event) {
        event.preventDefault();
        profile.post('/pengaturan/toko', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => profile.setData('logo', null),
        });
    }

    function submitAppearance(event) {
        event.preventDefault();
        appearanceForm.post('/pengaturan/tampilan', {
            preserveScroll: true,
            onSuccess: () => applyAppearance(appearanceForm.data),
        });
    }

    function openCreateUser() {
        setEditingUser(null);
        userForm.setData({
            name: '',
            email: '',
            role: 'kasir',
            password: '',
            password_confirmation: '',
            is_active: true,
        });
        userForm.clearErrors();
        setUserOpen(true);
    }

    function openEditUser(user) {
        setEditingUser(user);
        userForm.setData({
            name: user.name,
            email: user.email,
            role: user.role,
            password: '',
            password_confirmation: '',
            is_active: user.is_active,
        });
        userForm.clearErrors();
        setUserOpen(true);
    }

    function submitUser(event) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setUserOpen(false);
                userForm.reset();
            },
        };

        if (editingUser) {
            userForm.put(`/pengaturan/pengguna/${editingUser.id}`, options);
        } else {
            userForm.post('/pengaturan/pengguna', options);
        }
    }

    function submitRestore(event) {
        event.preventDefault();

        if (!window.confirm('Restore akan mengganti seluruh database saat ini. Lanjutkan?')) {
            return;
        }

        restoreForm.post('/pengaturan/restore', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => restoreForm.reset(),
        });
    }

    const currencyPreview = {
        prefix: appearanceForm.data.currency_prefix,
        suffix: appearanceForm.data.currency_suffix,
        decimals: Number(appearanceForm.data.currency_decimals),
        thousand_separator: appearanceForm.data.currency_thousand_separator || '.',
        decimal_separator: appearanceForm.data.currency_decimal_separator || ',',
    };

    return (
        <AppLayout>
            <Head title="Pengaturan" />
            <PageHeader
                eyebrow="Admin"
                title="Pengaturan"
                description="Profil toko, tampilan, akun pengguna, dan cadangan data. Perubahan tampilan berlaku untuk semua pengguna."
            />

            <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label="Bagian pengaturan">
                {tabs.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === item.key}
                        onClick={() => switchTab(item.key)}
                        className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                            tab === item.key
                                ? 'border-accent bg-accent-wash text-ink'
                                : 'border-transparent text-muted hover:bg-surface2 hover:text-ink'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === 'profil' ? (
                <form onSubmit={submitProfile} className="grid gap-4 lg:grid-cols-[1fr_340px]">
                    <section className="panel p-5">
                        <h2 className="text-lg font-semibold">Identitas toko</h2>
                        <p className="mb-4 text-sm text-muted">Tampil di kepala struk dan halaman kasir.</p>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="label" htmlFor="nama-toko">Nama toko</label>
                                <input id="nama-toko" className="input" value={profile.data.name} onChange={(event) => profile.setData('name', event.target.value)} />
                                <FormError message={profile.errors.name} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="label" htmlFor="alamat-toko">Alamat</label>
                                <input id="alamat-toko" className="input" value={profile.data.address} onChange={(event) => profile.setData('address', event.target.value)} />
                                <FormError message={profile.errors.address} />
                            </div>
                            <div>
                                <label className="label" htmlFor="telepon-toko">Telepon</label>
                                <input id="telepon-toko" className="input" value={profile.data.phone} onChange={(event) => profile.setData('phone', event.target.value)} />
                                <FormError message={profile.errors.phone} />
                            </div>
                            <div>
                                <label className="label" htmlFor="lebar-struk">Ukuran kertas struk</label>
                                <select id="lebar-struk" className="input" value={profile.data.receipt_width} onChange={(event) => profile.setData('receipt_width', event.target.value)}>
                                    {receiptWidths.map((width) => (
                                        <option key={width} value={width}>{width} mm</option>
                                    ))}
                                </select>
                                <FormError message={profile.errors.receipt_width} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="label" htmlFor="footer-struk">Catatan kaki struk</label>
                                <textarea id="footer-struk" className="input min-h-24" value={profile.data.footer} onChange={(event) => profile.setData('footer', event.target.value)} />
                                <FormError message={profile.errors.footer} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="label" htmlFor="logo-toko">Logo toko (PNG/JPG/WebP, maks. 2 MB)</label>
                                <input
                                    id="logo-toko"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="input py-2"
                                    onChange={(event) => profile.setData('logo', event.target.files?.[0] ?? null)}
                                />
                                <FormError message={profile.errors.logo} />
                                {profile.data.logo ? (
                                    <p className="mt-1 text-xs text-muted">Dipilih: {profile.data.logo.name}</p>
                                ) : store.logo ? (
                                    <p className="mt-1 text-xs text-muted">Logo tersimpan. Unggah berkas baru untuk mengganti.</p>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end">
                            <button type="submit" className="btn btn-primary" disabled={profile.processing}>
                                {profile.processing ? 'Menyimpan…' : 'Simpan profil'}
                            </button>
                        </div>
                    </section>

                    <aside className="panel p-5">
                        <p className="section-label">Pratinjau</p>
                        <div className="mt-3 border border-line p-4 text-center">
                            {store.logo ? <img src={store.logo} alt="" className="mx-auto mb-2 max-h-12 object-contain" /> : null}
                            <p className="text-base font-bold">{profile.data.name || store.name}</p>
                            <p className="mt-1 text-[11px] text-muted">{profile.data.address || 'Alamat toko'}</p>
                            <p className="text-[11px] text-muted">{profile.data.phone || 'Telepon'}</p>
                            <hr className="my-3 border-dashed" />
                            <p className="text-[11px]">Contoh item · 1 × Rp 10.000</p>
                            <div className="mt-3 flex justify-between border-t border-ink pt-2 text-sm font-semibold">
                                <span>TOTAL</span>
                                <span className="money">Rp 10.000</span>
                            </div>
                            <p className="mt-3 text-[10px] text-muted">{profile.data.footer || 'Catatan kaki struk'}</p>
                        </div>
                        <p className="mt-3 text-xs text-muted">
                            Lebar struk berlaku untuk pratinjau dan cetak. Pilih ukuran kertas di printer saat mencetak.
                        </p>
                    </aside>
                </form>
            ) : null}

            {tab === 'tampilan' ? (
                <form onSubmit={submitAppearance} className="grid gap-4 lg:grid-cols-2">
                    <section className="panel p-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <h2 className="text-lg font-semibold">Tema</h2>
                                <p className="text-sm text-muted">
                                    Klik untuk pratinjau langsung, lalu simpan.
                                </p>
                            </div>
                            <span className="badge badge-neutral">Pratinjau langsung</span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            {['light', 'dark'].map((theme) => {
                                const selected = appearanceForm.data.theme === theme;

                                return (
                                    <button
                                        key={theme}
                                        type="button"
                                        data-theme={theme}
                                        aria-pressed={selected}
                                        onClick={() => previewAppearance('theme', theme)}
                                        className={`relative border p-3 text-left transition-all ${
                                            selected
                                                ? 'border-accent ring-2 ring-accent-soft'
                                                : 'border-line hover:border-line-strong'
                                        }`}
                                        style={{ background: 'var(--bg)', color: 'var(--ink)' }}
                                    >
                                        <span className="section-label flex items-center justify-between text-[10px]">
                                            {theme === 'light' ? 'Terang' : 'Gelap'}
                                            {selected ? (
                                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-ink">
                                                    <Icon name="check" size={10} strokeWidth={2.4} />
                                                </span>
                                            ) : null}
                                        </span>
                                        <span className="mt-2 block text-sm font-semibold">
                                            Kasir Kertas
                                        </span>
                                        <span
                                            className="mt-1 block text-[11px]"
                                            style={{ color: 'var(--muted)' }}
                                        >
                                            Permukaan panel dan teks
                                        </span>
                                        <span
                                            className="mt-2 block h-1 w-10"
                                            style={{ background: 'var(--accent)' }}
                                        />
                                    </button>
                                );
                            })}
                        </div>

                        <h3 className="mt-5 mb-2 text-sm font-semibold">Warna aksen</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(accents).map(([key, label]) => {
                                const selected = appearanceForm.data.accent === key;

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        data-accent={key}
                                        aria-pressed={selected}
                                        onClick={() => previewAppearance('accent', key)}
                                        className={`flex min-h-11 items-center gap-2 border px-3 text-sm transition-colors ${
                                            selected
                                                ? 'border-accent bg-accent-soft font-semibold'
                                                : 'border-line hover:border-line-strong'
                                        }`}
                                    >
                                        <span
                                            className="h-4 w-4 rounded-full"
                                            style={{ background: 'var(--accent)' }}
                                        />
                                        {label}
                                        {selected ? <Icon name="check" size={13} /> : null}
                                    </button>
                                );
                            })}
                        </div>

                        <h3 className="mt-5 mb-2 text-sm font-semibold">Font antarmuka</h3>
                        <div className="grid gap-2">
                            {Object.entries(fonts).map(([key, label]) => {
                                const selected = appearanceForm.data.font === key;

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        data-font={key}
                                        aria-pressed={selected}
                                        onClick={() => previewAppearance('font', key)}
                                        style={{ fontFamily: 'var(--font-ui)' }}
                                        className={`flex min-h-11 items-center justify-between border px-3 text-left transition-colors ${
                                            selected
                                                ? 'border-accent bg-accent-soft'
                                                : 'border-line hover:border-line-strong'
                                        }`}
                                    >
                                        <span className="text-sm font-semibold">{label}</span>
                                        <span className="text-xs text-muted">Contoh angka 1.234</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-3 text-xs text-muted">
                            Font angka memakai IBM Plex Mono di semua pilihan. Ubah permanen lewat token di
                            <span className="money"> resources/js/styles/tokens.css</span>.
                        </p>
                    </section>

                    <section className="panel p-5">
                        <h2 className="text-lg font-semibold">Format mata uang</h2>
                        <p className="mb-4 text-sm text-muted">
                            Nominal disimpan sebagai bilangan bulat rupiah. Format hanya mengubah tampilan.
                        </p>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="label" htmlFor="prefix">Awalan</label>
                                <input id="prefix" className="input" value={appearanceForm.data.currency_prefix} onChange={(event) => appearanceForm.setData('currency_prefix', event.target.value)} />
                            </div>
                            <div>
                                <label className="label" htmlFor="suffix">Akhiran</label>
                                <input id="suffix" className="input" value={appearanceForm.data.currency_suffix} onChange={(event) => appearanceForm.setData('currency_suffix', event.target.value)} placeholder="opsional" />
                            </div>
                            <div>
                                <label className="label" htmlFor="desimal">Jumlah desimal</label>
                                <select id="desimal" className="input" value={appearanceForm.data.currency_decimals} onChange={(event) => appearanceForm.setData('currency_decimals', event.target.value)}>
                                    <option value="0">0 (rupiah utuh)</option>
                                    <option value="2">2</option>
                                </select>
                            </div>
                            <div>
                                <label className="label" htmlFor="pemisah-ribuan">Pemisah ribuan</label>
                                <input id="pemisah-ribuan" className="input money" maxLength={1} value={appearanceForm.data.currency_thousand_separator} onChange={(event) => appearanceForm.setData('currency_thousand_separator', event.target.value)} />
                            </div>
                            <div>
                                <label className="label" htmlFor="pemisah-desimal">Pemisah desimal</label>
                                <input id="pemisah-desimal" className="input money" maxLength={1} value={appearanceForm.data.currency_decimal_separator} onChange={(event) => appearanceForm.setData('currency_decimal_separator', event.target.value)} />
                            </div>
                            <div>
                                <p className="label">Pratinjau</p>
                                <p className="money border border-line bg-surface px-3 py-3 text-lg font-semibold">
                                    {formatMoney(1234567, currencyPreview)}
                                </p>
                            </div>
                        </div>

                        <FormError message={appearanceForm.errors.currency_prefix} />
                        <FormError message={appearanceForm.errors.currency_decimals} />
                    </section>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 lg:col-span-2">
                        <p className="text-xs text-muted">
                            Pratinjau berlaku di layar ini. Tekan <strong>Simpan tampilan</strong> agar
                            berlaku untuk semua pengguna.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn" onClick={revertAppearance}>
                                Kembalikan
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={appearanceForm.processing}
                            >
                                {appearanceForm.processing ? 'Menyimpan…' : 'Simpan tampilan'}
                            </button>
                        </div>
                    </div>
                </form>
            ) : null}

            {tab === 'pengguna' ? (
                <section className="panel overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
                        <div>
                            <h2 className="text-lg font-semibold">Pengguna dan peran</h2>
                            <p className="text-xs text-muted">Admin mengelola semuanya; kasir menjalankan transaksi dan melihat riwayatnya sendiri.</p>
                        </div>
                        <button type="button" className="btn btn-primary" onClick={openCreateUser}>
                            Pengguna baru
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table-pos min-w-[700px]">
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Email</th>
                                    <th>Peran</th>
                                    <th className="text-right">Transaksi</th>
                                    <th>Status</th>
                                    <th className="text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="font-semibold">{user.name}</td>
                                        <td className="money text-muted">{user.email}</td>
                                        <td>
                                            <span className="badge badge-neutral">{roleLabel[user.role]}</span>
                                        </td>
                                        <td className="money text-right">{user.sales_count}</td>
                                        <td>
                                            <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                                                {user.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex justify-end">
                                                <button type="button" className="btn btn-sm btn-ghost" onClick={() => openEditUser(user)}>
                                                    Ubah
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}

            {tab === 'backup' ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    <section className="panel p-5">
                        <h2 className="text-lg font-semibold">Unduh backup</h2>
                        <p className="mt-1 mb-4 text-sm text-muted">
                            Backup berisi seluruh database SQLite: produk, transaksi, shift, pengguna, dan pengaturan.
                            Simpan di tempat aman.
                        </p>
                        <dl className="divide-y divide-line border-y border-line text-sm">
                            <div className="flex justify-between gap-3 py-2">
                                <dt className="text-muted">Berkas</dt>
                                <dd className="money">{backup.file}</dd>
                            </div>
                            <div className="flex justify-between gap-3 py-2">
                                <dt className="text-muted">Ukuran</dt>
                                <dd className="money">{backup.size}</dd>
                            </div>
                            <div className="flex justify-between gap-3 py-2">
                                <dt className="text-muted">Terakhir diubah</dt>
                                <dd className="money">{backup.modified}</dd>
                            </div>
                        </dl>
                        <a href="/pengaturan/backup" className="btn btn-primary mt-4">
                            Unduh file SQLite
                        </a>
                        <p className="mt-3 text-xs text-muted">
                            Backup manual: salin berkas <span className="money">database/database.sqlite</span> saat
                            aplikasi tidak sedang dipakai.
                        </p>
                    </section>

                    <section className="panel p-5">
                        <h2 className="text-lg font-semibold">Restore dari backup</h2>
                        <p className="mt-1 mb-3 text-sm text-muted">
                            Pilih berkas <span className="money">.sqlite</span> hasil unduhan. Database saat ini
                            dicadangkan otomatis ke folder <span className="money">storage/app</span> sebelum diganti.
                        </p>
                        <div className="wall-note mb-4 text-xs">
                            Setelah restore, semua sesi diakhiri dan Anda perlu masuk kembali memakai akun dari
                            database yang dipulihkan.
                        </div>
                        <form onSubmit={submitRestore} className="space-y-3">
                            <div>
                                <label className="label" htmlFor="file-restore">Berkas backup</label>
                                <input
                                    id="file-restore"
                                    type="file"
                                    accept=".sqlite,.db,.sqlite3"
                                    className="input py-2"
                                    onChange={(event) => restoreForm.setData('file', event.target.files?.[0] ?? null)}
                                />
                                <FormError message={restoreForm.errors.file} />
                            </div>
                            <button type="submit" className="btn btn-danger" disabled={restoreForm.processing}>
                                {restoreForm.processing ? 'Memulihkan…' : 'Restore sekarang'}
                            </button>
                        </form>
                    </section>
                </div>
            ) : null}

            <Modal
                open={userOpen}
                onClose={() => setUserOpen(false)}
                title={editingUser ? 'Ubah pengguna' : 'Pengguna baru'}
                description={editingUser ? editingUser.email : 'Buat akun kasir atau admin baru.'}
                footer={
                    <>
                        <button type="button" className="btn" onClick={() => setUserOpen(false)}>Batal</button>
                        <button type="submit" form="form-pengguna" className="btn btn-primary" disabled={userForm.processing}>
                            {userForm.processing ? 'Menyimpan…' : 'Simpan pengguna'}
                        </button>
                    </>
                }
            >
                <form id="form-pengguna" onSubmit={submitUser} className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="label" htmlFor="nama-pengguna">Nama</label>
                        <input id="nama-pengguna" className="input" value={userForm.data.name} onChange={(event) => userForm.setData('name', event.target.value)} />
                        <FormError message={userForm.errors.name} />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="label" htmlFor="email-pengguna">Email</label>
                        <input id="email-pengguna" type="email" className="input" value={userForm.data.email} onChange={(event) => userForm.setData('email', event.target.value)} />
                        <FormError message={userForm.errors.email} />
                    </div>
                    <div>
                        <label className="label" htmlFor="peran-pengguna">Peran</label>
                        <select id="peran-pengguna" className="input" value={userForm.data.role} onChange={(event) => userForm.setData('role', event.target.value)}>
                            <option value="kasir">Kasir</option>
                            <option value="admin">Admin</option>
                        </select>
                        <FormError message={userForm.errors.role} />
                    </div>
                    <div className="flex items-end">
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                            <input
                                type="checkbox"
                                className="h-4 w-4 accent-[color:var(--accent)]"
                                checked={userForm.data.is_active}
                                onChange={(event) => userForm.setData('is_active', event.target.checked)}
                            />
                            Akun aktif
                        </label>
                    </div>
                    <div>
                        <label className="label" htmlFor="sandi-pengguna">
                            Kata sandi {editingUser ? '(kosongkan jika tetap)' : ''}
                        </label>
                        <input id="sandi-pengguna" type="password" className="input" value={userForm.data.password} onChange={(event) => userForm.setData('password', event.target.value)} autoComplete="new-password" />
                        <FormError message={userForm.errors.password} />
                    </div>
                    <div>
                        <label className="label" htmlFor="sandi-ulang">Ulangi kata sandi</label>
                        <input id="sandi-ulang" type="password" className="input" value={userForm.data.password_confirmation} onChange={(event) => userForm.setData('password_confirmation', event.target.value)} autoComplete="new-password" />
                    </div>
                    {editingUser?.id === auth.user.id ? (
                        <p className="text-xs text-muted sm:col-span-2">
                            Ini akun yang sedang Anda pakai. Peran dan status aktif tidak dapat diubah dari sini.
                        </p>
                    ) : null}
                </form>
            </Modal>
        </AppLayout>
    );
}
