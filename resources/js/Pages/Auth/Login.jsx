import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '../../Components/Icon';

const demoAccounts = [
    { role: 'Admin', email: 'admin@kasirkertas.test', note: 'Semua menu' },
    { role: 'Kasir', email: 'kasir@kasirkertas.test', note: 'Transaksi & riwayat sendiri' },
];

export default function Login({ status, restored }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });
    const [showPassword, setShowPassword] = useState(false);

    function submit(event) {
        event.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    }

    function fillDemo(email) {
        setData({ email, password: 'password', remember: false });
    }

    return (
        <>
            <Head title="Masuk" />
            <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[1.08fr_1fr]">
                <section className="login-brand flex flex-col gap-10 border-b border-line px-6 py-8 sm:px-10 lg:min-h-dvh lg:justify-between lg:border-r lg:border-b-0 lg:px-12 lg:py-10">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center border border-accent-line bg-surface text-accent">
                                <Icon name="receipt" size={22} strokeWidth={1.5} />
                            </span>
                            <span>
                                <span className="section-label block text-[9px]">Point of Sale</span>
                                <span className="block text-lg leading-tight font-bold tracking-tight">
                                    Kasir <span className="font-normal">Kertas</span>
                                </span>
                            </span>
                        </div>
                        <span className="hidden border border-line bg-surface px-2.5 py-1 text-[10px] tracking-widest text-muted uppercase sm:inline">
                            Hemat tempat
                        </span>
                    </div>

                    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_270px]">
                        <div>
                            <p className="section-label flex items-center gap-2">
                                <span className="h-px w-6 bg-accent" />
                                Kertas &amp; Tinta
                            </p>
                            <h1 className="mt-4 text-[46px] leading-[0.92] font-bold tracking-[-0.035em] sm:text-[58px]">
                                Kasir
                                <br />
                                <span className="font-normal">Kertas</span>
                            </h1>
                            <p className="mt-5 max-w-sm text-base leading-relaxed text-muted sm:text-lg">
                                Alat kasir yang ringan untuk warung, kafe, dan toko kecil.
                                Satu layar, satu struk, tanpa ribet.
                            </p>
                        </div>

                        <div className="hidden lg:block">
                            <div className="paper-slip -rotate-1">
                                <p className="text-center text-[13px] font-bold tracking-tight">Kasir Kertas</p>
                                <p className="mt-0.5 text-center text-[9px] tracking-[0.18em] text-muted uppercase">
                                    Struk contoh
                                </p>
                                <hr className="my-3 border-0 border-t border-dashed border-line-strong" />
                                <div className="space-y-2 text-[11px]">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <span>Kopi Susu Gula Aren</span>
                                        <span className="money">18.000</span>
                                    </div>
                                    <div className="flex items-baseline justify-between gap-3">
                                        <span>Roti Bakar Cokelat</span>
                                        <span className="money">15.000</span>
                                    </div>
                                </div>
                                <hr className="my-3 border-0 border-t border-dashed border-line-strong" />
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">Total</span>
                                    <span className="money text-lg font-semibold">33.000</span>
                                </div>
                                <div className="mt-1 flex items-baseline justify-between text-[10px] text-muted">
                                    <span>Tunai</span>
                                    <span className="money">50.000</span>
                                </div>
                                <div className="flex items-baseline justify-between text-[10px] text-muted">
                                    <span>Kembali</span>
                                    <span className="money">17.000</span>
                                </div>
                                <hr className="my-3 border-0 border-t border-dashed border-line-strong" />
                                <div className="flex items-end justify-between gap-3">
                                    <p className="max-w-[140px] text-[9px] leading-snug text-muted">
                                        Terima kasih. Barang yang sudah dibeli tidak dapat ditukar.
                                    </p>
                                    <span className="stamp">Lunas</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <dl className="grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
                            {[
                                { icon: 'store', label: 'Satu layar', note: 'Transaksi tanpa pindah halaman' },
                                { icon: 'print', label: '58 & 80 mm', note: 'Struk kertas asli' },
                                { icon: 'layers', label: 'SQLite', note: 'Satu berkas, tanpa server' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-start gap-2.5">
                                    <span className="mt-0.5 text-accent">
                                        <Icon name={item.icon} size={17} />
                                    </span>
                                    <div>
                                        <dt className="text-xs font-semibold">{item.label}</dt>
                                        <dd className="text-[11px] leading-snug text-muted">{item.note}</dd>
                                    </div>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-6 text-[10px] tracking-widest text-muted uppercase">
                            Kertas &amp; Tinta · Hemat tempat
                        </p>
                    </div>
                </section>

                <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
                    <div className="page-rise w-full max-w-[370px]">
                        <p className="section-label">Masuk ke aplikasi</p>
                        <h2 className="mt-1.5 text-[28px] leading-tight font-semibold tracking-tight">
                            Selamat bekerja.
                        </h2>
                        <p className="mt-1.5 text-sm text-muted">
                            Gunakan akun yang diberikan admin toko.
                        </p>

                        {restored ? <div className="wall-note mt-5">{restored}</div> : null}
                        {status ? <div className="wall-note mt-5">{status}</div> : null}

                        <form onSubmit={submit} className="mt-6 space-y-4">
                            <div>
                                <label className="label" htmlFor="email">
                                    Email
                                </label>
                                <div className="field">
                                    <span className="field-icon">
                                        <Icon name="mail" size={16} />
                                    </span>
                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="username"
                                        autoFocus
                                        className="input"
                                        value={data.email}
                                        onChange={(event) => setData('email', event.target.value)}
                                        placeholder="nama@toko.test"
                                    />
                                </div>
                                {errors.email ? (
                                    <p className="mt-1 text-xs text-danger">{errors.email}</p>
                                ) : null}
                            </div>

                            <div>
                                <label className="label" htmlFor="password">
                                    Kata sandi
                                </label>
                                <div className="field">
                                    <span className="field-icon">
                                        <Icon name="lock" size={16} />
                                    </span>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        className="input has-action"
                                        value={data.password}
                                        onChange={(event) => setData('password', event.target.value)}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        className="field-action"
                                        onClick={() => setShowPassword((current) => !current)}
                                        aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                                        aria-pressed={showPassword}
                                    >
                                        <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                                    </button>
                                </div>
                                {errors.password ? (
                                    <p className="mt-1 text-xs text-danger">{errors.password}</p>
                                ) : null}
                            </div>

                            <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-muted">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(event) => setData('remember', event.target.checked)}
                                    className="h-4 w-4 accent-[color:var(--accent)]"
                                />
                                Ingat saya di perangkat ini
                            </label>

                            <button type="submit" className="btn btn-primary w-full" disabled={processing}>
                                {processing ? 'Memeriksa…' : 'Masuk'}
                                {processing ? null : <Icon name="arrowRight" size={16} />}
                            </button>
                        </form>

                        <div className="mt-7 flex items-center gap-3">
                            <span className="h-px flex-1 bg-line" />
                            <span className="text-[10px] tracking-[0.16em] text-muted uppercase">
                                Akun demo
                            </span>
                            <span className="h-px flex-1 bg-line" />
                        </div>

                        <div className="mt-3 grid gap-2">
                            {demoAccounts.map((account) => (
                                <button
                                    key={account.email}
                                    type="button"
                                    onClick={() => fillDemo(account.email)}
                                    className="group flex min-h-11 items-center gap-3 border border-line bg-surface px-3 text-left transition-colors hover:border-line-strong hover:bg-surface2"
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-line bg-surface2 text-muted group-hover:border-accent group-hover:text-accent">
                                        <Icon name="user" size={14} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-xs font-semibold">
                                            {account.role} · <span className="money font-normal">{account.email}</span>
                                        </span>
                                        <span className="block text-[10px] text-muted">{account.note}</span>
                                    </span>
                                    <span className="shrink-0 text-[10px] font-semibold tracking-wide text-muted uppercase group-hover:text-accent">
                                        Isi
                                    </span>
                                </button>
                            ))}
                        </div>

                        <p className="mt-3 text-[11px] leading-snug text-muted">
                            Kata sandi akun demo adalah <span className="money text-ink">password</span>.
                            Ganti segera setelah pertama kali masuk.
                        </p>

                        <p className="mt-8 border-t border-line pt-4 text-[11px] text-muted">
                            Butuh bantuan? Hubungi admin toko untuk akun baru atau reset kata sandi.
                        </p>
                    </div>
                </section>
            </div>
        </>
    );
}
