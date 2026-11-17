import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { applyAppearance, todayLabel } from '../lib/format';
import Icon from './Icon';

const mainNav = [
    { href: '/kasir', label: 'Kasir', icon: 'receipt', badge: 'draftCount' },
    { href: '/penjualan', label: 'Riwayat', icon: 'history' },
    { href: '/shift', label: 'Shift', icon: 'clock' },
];

const adminNav = [
    { href: '/produk', label: 'Produk', icon: 'box', badge: 'lowStockCount' },
    { href: '/kategori', label: 'Kategori', icon: 'tag' },
    { href: '/stok', label: 'Stok', icon: 'layers' },
    { href: '/laporan', label: 'Laporan', icon: 'chart' },
    { href: '/pengaturan', label: 'Pengaturan', icon: 'sliders' },
];

function isActive(url, href) {
    return url === href || url.startsWith(`${href}/`) || url.startsWith(`${href}?`);
}

function NavLink({ item, url, badges, mobile = false }) {
    const active = isActive(url, item.href);
    const badge = item.badge ? badges[item.badge] : 0;

    if (mobile) {
        return (
            <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                    active
                        ? 'border-accent bg-accent-wash text-ink'
                        : 'border-transparent text-muted hover:bg-surface2 hover:text-ink'
                }`}
            >
                <Icon name={item.icon} size={15} className={active ? 'text-accent' : ''} />
                {item.label}
                {badge > 0 ? (
                    <span className="money text-[10px] text-accent">{badge}</span>
                ) : null}
            </Link>
        );
    }

    return (
        <Link
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`group flex min-h-11 items-center gap-3 border-l-2 px-4 text-sm transition-colors ${
                active
                    ? 'border-accent bg-accent-wash font-semibold text-ink'
                    : 'border-transparent text-muted hover:bg-surface2 hover:text-ink'
            }`}
        >
            <Icon
                name={item.icon}
                size={17}
                className={`shrink-0 transition-colors ${
                    active ? 'text-accent' : 'text-muted group-hover:text-ink'
                }`}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {badge > 0 ? (
                <span
                    className={`money inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] ${
                        active ? 'bg-surface text-accent' : 'bg-surface2 text-muted'
                    }`}
                >
                    {badge}
                </span>
            ) : null}
        </Link>
    );
}

function Flash({ flash }) {
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (!flash?.success && !flash?.error) {
            return;
        }

        setMessage({
            type: flash.success ? 'success' : 'error',
            text: flash.success || flash.error,
        });

        const timer = window.setTimeout(() => setMessage(null), 6000);

        return () => window.clearTimeout(timer);
    }, [flash?.success, flash?.error]);

    if (!message) {
        return null;
    }

    const success = message.type === 'success';

    return (
        <div
            role="status"
            className="page-rise fixed top-4 right-4 z-[70] flex max-w-md items-start gap-3 border border-line bg-surface px-4 py-3 text-sm"
            style={{
                borderLeft: `3px solid var(--${success ? 'success' : 'danger'})`,
                boxShadow: 'var(--shadow-pop)',
            }}
        >
            <span
                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center ${
                    success ? 'text-success' : 'text-danger'
                }`}
            >
                <Icon name={success ? 'check' : 'alert'} size={17} />
            </span>
            <span className="flex-1">{message.text}</span>
            <button
                type="button"
                onClick={() => setMessage(null)}
                className="-mr-1 flex h-6 w-6 items-center justify-center text-muted transition-colors hover:text-ink"
                aria-label="Tutup pesan"
            >
                <Icon name="close" size={14} />
            </button>
        </div>
    );
}

function initials(name = '') {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

export default function AppLayout({ children, flush = false }) {
    const page = usePage();
    const { auth, store, appearance, flash, draftCount = 0, lowStockCount = 0 } = page.props;
    const user = auth?.user;
    const url = page.url || '/';
    const badges = { draftCount, lowStockCount };

    useEffect(() => {
        applyAppearance(appearance);
    }, [appearance?.theme, appearance?.accent, appearance?.font]);

    return (
        <div className="min-h-dvh bg-bg text-ink lg:flex">
            <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
                <div className="border-b border-line px-4 py-4">
                    <Link href="/kasir" className="group flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-accent-line bg-accent-soft text-accent transition-colors group-hover:border-accent">
                            <Icon name="receipt" size={20} strokeWidth={1.5} />
                        </span>
                        <span className="min-w-0">
                            <span className="section-label block text-[9px]">Point of Sale</span>
                            <span className="mt-0.5 block text-[20px] leading-none font-bold tracking-tight">
                                Kasir <span className="font-normal">Kertas</span>
                            </span>
                        </span>
                    </Link>
                    <p className="mt-3 border-t border-line pt-2.5 text-[11px] text-muted">
                        {todayLabel()}
                    </p>
                </div>

                <nav className="scroll-slim flex-1 overflow-y-auto py-4">
                    <p className="section-label flex items-center gap-2 px-4 pb-2 text-[10px]">
                        <span>Operasional</span>
                        <span className="h-px flex-1 bg-line" />
                    </p>
                    {mainNav.map((item) => (
                        <NavLink key={item.href} item={item} url={url} badges={badges} />
                    ))}

                    {user?.role === 'admin' ? (
                        <>
                            <p className="section-label flex items-center gap-2 px-4 pt-6 pb-2 text-[10px]">
                                <span>Kelola</span>
                                <span className="h-px flex-1 bg-line" />
                            </p>
                            {adminNav.map((item) => (
                                <NavLink key={item.href} item={item} url={url} badges={badges} />
                            ))}
                        </>
                    ) : null}
                </nav>

                <div className="border-t border-line p-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-surface2 text-[11px] font-semibold tracking-wide">
                            {initials(user?.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{user?.name}</p>
                            <p className="text-[10px] tracking-widest text-muted uppercase">
                                {user?.role === 'admin' ? 'Admin' : 'Kasir'}
                            </p>
                        </div>
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            aria-label="Keluar"
                            title="Keluar"
                            className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-muted transition-colors hover:border-line-strong hover:bg-surface2 hover:text-ink"
                        >
                            <Icon name="logout" size={15} />
                        </Link>
                    </div>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-40 border-b border-line bg-surface lg:hidden">
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <Link href="/kasir" className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center border border-line bg-accent-soft text-accent">
                                <Icon name="receipt" size={16} />
                            </span>
                            <span className="text-lg leading-none font-bold tracking-tight">
                                Kasir <span className="font-normal">Kertas</span>
                            </span>
                        </Link>
                        <div className="min-w-0 text-right">
                            <p className="truncate text-[11px] font-semibold">{user?.name}</p>
                            <p className="text-[9px] tracking-widest text-muted uppercase">
                                {user?.role === 'admin' ? 'Admin' : 'Kasir'}
                            </p>
                        </div>
                    </div>
                    <nav className="scroll-slim flex overflow-x-auto border-t border-line px-1">
                        {mainNav.map((item) => (
                            <NavLink key={item.href} item={item} url={url} badges={badges} mobile />
                        ))}
                        {user?.role === 'admin'
                            ? adminNav.map((item) => (
                                  <NavLink
                                      key={item.href}
                                      item={item}
                                      url={url}
                                      badges={badges}
                                      mobile
                                  />
                              ))
                            : null}
                    </nav>
                </header>

                {flush ? (
                    children
                ) : (
                    <main className="page-rise mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                        {children}
                    </main>
                )}

                {!flush ? (
                    <footer className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 pb-6 text-[11px] text-muted sm:px-6 lg:px-8">
                        <span>{store?.name} · {todayLabel()}</span>
                        <span>Kasir Kertas — kertas, tinta, dan angka yang rapi.</span>
                    </footer>
                ) : null}
            </div>

            <Flash flash={flash} />
        </div>
    );
}

export function PageHeader({ eyebrow, title, description, actions }) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div className="min-w-0">
                {eyebrow ? (
                    <p className="section-label mb-2 flex items-center gap-2">
                        <span className="h-px w-6 bg-accent" />
                        {eyebrow}
                    </p>
                ) : null}
                <h1 className="text-[27px] leading-[1.05] font-semibold tracking-[-0.02em] sm:text-[32px]">
                    {title}
                </h1>
                {description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
                ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}

export function EmptyState({ title, children }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <span className="mb-1 flex h-10 w-10 items-center justify-center border border-dashed border-line text-muted">
                <Icon name="receipt" size={19} />
            </span>
            <p className="text-sm font-semibold">{title}</p>
            {children ? <p className="max-w-sm text-sm text-muted">{children}</p> : null}
        </div>
    );
}

export function FormError({ message }) {
    if (!message) {
        return null;
    }

    return <p className="mt-1 text-xs text-danger">{message}</p>;
}
