import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../Components/Layout';
import Icon from '../Components/Icon';
import Modal from '../Components/Modal';
import Receipt from '../Components/Receipt';
import { formatMoney, parseDigits, todayLabel } from '../lib/format';
import { printReceipt } from '../lib/print';
import { bindShortcuts } from '../lib/shortcuts';

function readStored(key) {
    try {
        const raw = window.localStorage.getItem(key);

        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function lineDiscount(item) {
    const bruto = item.price * item.quantity;
    const value = Math.max(0, Number(item.discount_value) || 0);

    if (item.discount_type === 'percent') {
        return Math.min(bruto, Math.floor((bruto * Math.min(100, value)) / 100));
    }

    return Math.min(bruto, value);
}

function defaultItemDiscount(product) {
    if (product.discount_value > 0 && ['nominal', 'percent'].includes(product.discount_type)) {
        return {
            discount_type: product.discount_type,
            discount_value: product.discount_type === 'percent'
                ? Math.min(100, product.discount_value)
                : Math.min(product.price, product.discount_value),
        };
    }

    return { discount_type: 'nominal', discount_value: 0 };
}

function normalizeItem(item) {
    return {
        ...item,
        discount_type: item.discount_type === 'percent' ? 'percent' : 'nominal',
        discount_value: Math.max(0, Number(item.discount_value) || 0),
    };
}

export default function Cashier({ categories, products, drafts, shift, paymentMethods, auth, store }) {
    const { props } = usePage();
    const currency = props.currency;
    const money = (value) => formatMoney(value, currency);
    const user = auth.user;
    const storageKey = `kasir-kertas:keranjang:${user.id}`;
    const stored = useMemo(() => readStored(storageKey), [storageKey]);

    const [cart, setCart] = useState(() =>
        Array.isArray(stored?.cart)
            ? stored.cart.filter((item) => item && item.product_id).map(normalizeItem)
            : [],
    );
    const [discount, setDiscount] = useState(() =>
        stored?.discount?.type ? stored.discount : { type: 'nominal', value: '' },
    );
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [searching, setSearching] = useState(false);
    const [category, setCategory] = useState(null);
    const [notice, setNotice] = useState(null);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [draftsOpen, setDraftsOpen] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [method, setMethod] = useState('cash');
    const [paid, setPaid] = useState('');
    const [payError, setPayError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [lineEditor, setLineEditor] = useState(null);
    const [lineDraft, setLineDraft] = useState({ type: 'nominal', value: '' });
    const searchRef = useRef(null);

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemDiscount = cart.reduce((sum, item) => sum + lineDiscount(item), 0);
    const netSubtotal = Math.max(0, subtotal - itemDiscount);
    const discountValue = parseDigits(discount.value);
    const discountAmount =
        discount.type === 'percent'
            ? Math.floor((netSubtotal * Math.min(100, discountValue)) / 100)
            : Math.min(netSubtotal, discountValue);
    const total = Math.max(0, netSubtotal - discountAmount);
    const activeMethod = paymentMethods.find((item) => item.key === method) ?? paymentMethods[0];
    const paidNumber = parseDigits(paid);
    const change = Math.max(0, paidNumber - total);

    useEffect(() => {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify({ cart, discount }));
        } catch {
            // Penyimpanan browser penuh atau diblokir; keranjang tetap jalan di memori.
        }
    }, [cart, discount, storageKey]);

    useEffect(() => {
        const term = query.trim();

        if (term === '') {
            setResults(null);
            setSearching(false);

            return;
        }

        const controller = new AbortController();
        setSearching(true);

        const timer = window.setTimeout(async () => {
            try {
                const response = await fetch(`/kasir/cari?q=${encodeURIComponent(term)}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });

                if (response.ok) {
                    const data = await response.json();
                    setResults(data.products ?? []);
                }
            } catch {
                // Permintaan dibatalkan atau jaringan lambat.
            } finally {
                setSearching(false);
            }
        }, 150);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    useEffect(() => {
        if (!notice) {
            return;
        }

        const timer = window.setTimeout(() => setNotice(null), 3200);

        return () => window.clearTimeout(timer);
    }, [notice]);

    function currentQuantity(productId) {
        return cart.find((item) => item.product_id === productId)?.quantity ?? 0;
    }

    function addProduct(product) {
        if (product.track_stock && currentQuantity(product.id) >= product.stock) {
            setNotice(`Stok ${product.name} tinggal ${product.stock} ${product.unit}.`);

            return;
        }

        setCart((items) => {
            const existing = items.find((item) => item.product_id === product.id);

            if (existing) {
                return items.map((item) =>
                    item.product_id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                );
            }

            return [
                ...items,
                {
                    product_id: product.id,
                    name: product.name,
                    sku: product.sku,
                    price: product.price,
                    quantity: 1,
                    stock: product.stock,
                    track_stock: product.track_stock,
                    unit: product.unit,
                    ...defaultItemDiscount(product),
                },
            ];
        });
    }

    function setQuantity(productId, value) {
        const item = cart.find((line) => line.product_id === productId);

        if (!item) {
            return;
        }

        const maximum = item.track_stock ? Math.max(1, item.stock) : 9999;
        const quantity = Math.min(maximum, Math.max(1, Number(value) || 1));

        if (item.track_stock && quantity > item.stock) {
            setNotice(`Stok ${item.name} hanya ${item.stock} ${item.unit}.`);

            return;
        }

        setCart((items) =>
            items.map((line) =>
                line.product_id === productId ? { ...line, quantity } : line,
            ),
        );
    }

    function stepQuantity(productId, delta) {
        const item = cart.find((line) => line.product_id === productId);

        if (item) {
            setQuantity(productId, item.quantity + delta);
        }
    }

    function removeItem(productId) {
        setCart((items) => items.filter((item) => item.product_id !== productId));

        if (lineEditor === productId) {
            setLineEditor(null);
        }
    }

    function resetCart() {
        setCart([]);
        setDiscount({ type: 'nominal', value: '' });
        setQuery('');
        setResults(null);
        setCategory(null);
        setLineEditor(null);
    }

    function openLineDiscount(item) {
        if (lineEditor === item.product_id) {
            setLineEditor(null);

            return;
        }

        setLineEditor(item.product_id);
        setLineDraft({
            type: item.discount_type === 'percent' ? 'percent' : 'nominal',
            value: item.discount_value > 0 ? String(item.discount_value) : '',
        });
    }

    function applyLineDiscount(item) {
        const bruto = item.price * item.quantity;
        const value = parseDigits(lineDraft.value);
        const discountValue = lineDraft.type === 'percent'
            ? Math.min(100, value)
            : Math.min(bruto, value);

        setCart((items) =>
            items.map((line) =>
                line.product_id === item.product_id
                    ? {
                          ...line,
                          discount_type: lineDraft.type === 'percent' ? 'percent' : 'nominal',
                          discount_value: discountValue,
                      }
                    : line,
            ),
        );
        setLineEditor(null);
    }

    function clearLineDiscount(productId) {
        setCart((items) =>
            items.map((line) =>
                line.product_id === productId
                    ? { ...line, discount_type: 'nominal', discount_value: 0 }
                    : line,
            ),
        );
        setLineEditor(null);
    }

    function cartPayload() {
        return cart.map((item) => {
            const bruto = item.price * item.quantity;
            const type = item.discount_type === 'percent' ? 'percent' : 'nominal';
            const value = parseDigits(item.discount_value);

            return {
                product_id: item.product_id,
                quantity: item.quantity,
                discount_type: type,
                discount_value: type === 'percent' ? Math.min(100, value) : Math.min(bruto, value),
            };
        });
    }

    function openPayment() {
        if (cart.length === 0 || receipt) {
            return;
        }

        setPayError(null);
        setMethod(paymentMethods[0]?.key ?? 'cash');
        setPaid('');
        setPaymentOpen(true);
    }

    function closePayment() {
        setPaymentOpen(false);
        setPayError(null);
    }

    function submitPayment(event) {
        event?.preventDefault();

        if (cart.length === 0 || busy) {
            return;
        }

        const cash = (paymentMethods.find((item) => item.key === method)?.cash ?? false);

        if (cash && paidNumber < total) {
            setPayError('Uang yang dibayar masih kurang dari total.');

            return;
        }

        setBusy(true);
        setPayError(null);

        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;

        fetch('/kasir/bayar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrf,
            },
            body: JSON.stringify({
                items: cartPayload(),
                discount_type: discount.type,
                discount_value: discountValue,
                payment_method: method,
                paid: cash ? paidNumber : total,
            }),
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const firstError = data.errors ? Object.values(data.errors).flat()[0] : null;
                    throw new Error(firstError || data.message || 'Pembayaran gagal diproses.');
                }

                setPaymentOpen(false);
                setReceipt(data.sale);
                resetCart();
                router.reload({
                    only: ['products', 'drafts', 'openShift', 'lowStockCount'],
                    preserveScroll: true,
                });
            })
            .catch((error) => setPayError(error.message))
            .finally(() => setBusy(false));
    }

    function holdCart() {
        if (cart.length === 0 || busy) {
            return;
        }

        setBusy(true);
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;

        fetch('/kasir/tahan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrf,
            },
            body: JSON.stringify({
                items: cartPayload(),
                discount_type: discount.type,
                discount_value: discountValue,
            }),
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const firstError = data.errors ? Object.values(data.errors).flat()[0] : null;
                    throw new Error(firstError || data.message || 'Gagal menahan transaksi.');
                }

                resetCart();
                router.reload({ only: ['drafts'], preserveScroll: true });
                setNotice('Transaksi ditahan. Buka daftar draft untuk melanjutkan.');
            })
            .catch((error) => setNotice(error.message))
            .finally(() => setBusy(false));
    }

    async function resumeDraft(draft) {
        if (cart.length > 0 && !window.confirm('Keranjang saat ini akan diganti dengan draft. Lanjutkan?')) {
            return;
        }

        try {
            const response = await fetch(`/kasir/draft/${draft.id}`, {
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Draft tidak dapat dibuka.');
            }

            const data = await response.json();
            const items = data.draft.items ?? [];

            setCart(
                items
                    .filter((item) => item.product_id)
                    .map((item) =>
                        normalizeItem({
                            product_id: item.product_id,
                            name: item.name,
                            sku: item.sku,
                            price: item.price,
                            quantity: item.quantity,
                            stock: item.stock,
                            track_stock: item.track_stock,
                            unit: item.unit,
                            discount_type: item.discount_type,
                            discount_value: item.discount_value,
                        }),
                    ),
            );
            setDiscount({
                type: data.draft.discount_type || 'nominal',
                value: String(data.draft.discount_value || ''),
            });
            setDraftsOpen(false);

            const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
            await fetch(`/kasir/draft/${draft.id}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf },
            });

            router.reload({ only: ['drafts'], preserveScroll: true });
        } catch (error) {
            setNotice(error.message);
        }
    }

    async function deleteDraft(draft) {
        if (!window.confirm(`Hapus draft ${draft.number}?`)) {
            return;
        }

        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;

        await fetch(`/kasir/draft/${draft.id}`, {
            method: 'DELETE',
            headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf },
        });

        router.reload({ only: ['drafts'], preserveScroll: true });
    }

    useEffect(() => {
        return bindShortcuts([
            {
                key: 'f9',
                allowInInput: true,
                handler: openPayment,
            },
            {
                key: 'escape',
                allowInInput: true,
                handler: () => {
                    if (receipt) {
                        setReceipt(null);
                    } else if (paymentOpen) {
                        closePayment();
                    } else if (draftsOpen) {
                        setDraftsOpen(false);
                    } else if (lineEditor !== null) {
                        setLineEditor(null);
                    } else if (query !== '') {
                        setQuery('');
                        setResults(null);
                    } else if (cart.length > 0) {
                        resetCart();
                    }
                },
            },
            {
                key: '/',
                handler: () => searchRef.current?.focus(),
            },
        ]);
    }, [cart, discount, paymentOpen, draftsOpen, lineEditor, receipt, query, paid, method, total, busy]);

    const shown = results ?? products;
    const filtered = category ? shown.filter((product) => product.category_id === category) : shown;
    const quickAmounts = [...new Set([
        total,
        Math.ceil(total / 5000) * 5000,
        Math.ceil(total / 10000) * 10000,
        Math.ceil(total / 50000) * 50000,
    ])]
        .filter((amount) => amount >= total && amount > 0)
        .slice(0, 4);

    return (
        <AppLayout flush>
            <Head title="Kasir" />
            <div className="pos-shell">
                <div className="pos-topbar">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="pos-mark">
                            <Icon name="receipt" size={19} strokeWidth={1.5} />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-base leading-tight font-bold tracking-tight">
                                {store.name}
                            </p>
                            <p className="text-[11px] text-muted">
                                {todayLabel()} · {user.name}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {shift ? (
                            <span className="badge badge-success">
                                Shift · {shift.opened_at}
                            </span>
                        ) : (
                            <Link href="/shift" className="badge badge-warning">
                                Shift belum dibuka
                            </Link>
                        )}
                        <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setDraftsOpen(true)}
                        >
                            <Icon name="layers" size={14} />
                            Draft
                            {drafts.length > 0 ? (
                                <span className="money text-accent">{drafts.length}</span>
                            ) : null}
                        </button>
                        <span className="hidden items-center gap-1.5 text-[11px] text-muted xl:inline-flex">
                            <span className="kbd">/</span> cari
                            <span className="kbd ml-1.5">F9</span> bayar
                            <span className="kbd ml-1.5">Esc</span> batal
                        </span>
                    </div>
                </div>

                <div className="pos-grid">
                    <section className="pos-catalog" aria-label="Katalog produk">
                        <div className="pos-search-wrap">
                            <label htmlFor="cari-produk" className="sr-only">
                                Cari produk
                            </label>
                            <div className="field search-field">
                                <span className="field-icon">
                                    <Icon name="search" size={17} />
                                </span>
                                <input
                                    id="cari-produk"
                                    ref={searchRef}
                                    className="input"
                                    placeholder="Cari nama, kode, atau barcode…"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && filtered.length > 0) {
                                            event.preventDefault();
                                            addProduct(filtered[0]);
                                            setQuery('');
                                        }
                                    }}
                                    autoComplete="off"
                                />
                                <span className="field-hint">
                                    <span className="kbd">/</span>
                                </span>
                            </div>
                            {notice ? (
                                <p className="notice-danger mt-2" role="status">
                                    {notice}
                                </p>
                            ) : null}
                        </div>

                        <div className="pos-tabs" role="tablist" aria-label="Kategori">
                            <button
                                type="button"
                                className="pos-tab"
                                data-active={category === null}
                                onClick={() => setCategory(null)}
                            >
                                Semua
                            </button>
                            {categories
                                .filter((item) => item.products_count > 0)
                                .map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className="pos-tab"
                                        data-active={category === item.id}
                                        onClick={() => setCategory(item.id)}
                                    >
                                        {item.name}
                                    </button>
                                ))}
                        </div>

                        <div className="pos-list" role="list">
                            {searching && results === null ? (
                                <p className="px-2 py-4 text-xs text-muted">Mencari…</p>
                            ) : null}

                            {filtered.length === 0 ? (
                                <div className="flex flex-col items-center px-3 py-10 text-center">
                                    <span className="mb-3 flex h-10 w-10 items-center justify-center border border-dashed border-line-strong text-muted">
                                        <Icon name={query ? 'search' : 'box'} size={18} />
                                    </span>
                                    <p className="text-sm font-semibold">
                                        {query ? 'Produk tidak ditemukan.' : 'Belum ada produk aktif.'}
                                    </p>
                                    <p className="mt-1 max-w-xs text-xs text-muted">
                                        {query
                                            ? 'Coba kata kunci lain atau periksa kode produk.'
                                            : 'Admin dapat menambahkan produk lewat menu Produk.'}
                                    </p>
                                </div>
                            ) : (
                                filtered.map((product) => {
                                    const inCart = currentQuantity(product.id);
                                    const soldOut = product.track_stock && product.stock <= 0;

                                    return (
                                        <button
                                            key={product.id}
                                            type="button"
                                            className="pos-product"
                                            onClick={() => addProduct(product)}
                                            disabled={soldOut}
                                            role="listitem"
                                        >
                                            <span className="min-w-0">
                                                <span className="pos-product-name flex items-center gap-2">
                                                    <span className="truncate">{product.name}</span>
                                                    {inCart > 0 ? (
                                                        <span className="pos-qty shrink-0">{inCart}</span>
                                                    ) : null}
                                                </span>
                                                <span className="pos-product-meta block">
                                                    {product.sku}
                                                    {product.track_stock
                                                        ? ` · stok ${product.stock} ${product.unit}`
                                                        : ' · tanpa stok'}
                                                    {product.discount_value > 0 &&
                                                    ['nominal', 'percent'].includes(product.discount_type)
                                                        ? ` · diskon ${
                                                              product.discount_type === 'percent'
                                                                  ? `${product.discount_value}%`
                                                                  : money(product.discount_value)
                                                          }`
                                                        : ''}
                                                </span>
                                            </span>
                                            <span className="pos-product-price">
                                                {soldOut ? 'Habis' : money(product.price)}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <aside className="pos-cart" aria-label="Keranjang">
                        <div className="receipt-sheet">
                            <div className="receipt-brand">{store.name}</div>
                            <div className="receipt-sub">Struk Sementara</div>
                            <hr className="receipt-dashed" />

                            <div className="receipt-items">
                                {cart.length === 0 ? (
                                    <div className="receipt-empty">
                                        <span className="receipt-empty-mark">
                                            <Icon name="receipt" size={20} />
                                        </span>
                                        <p className="receipt-empty-title">Keranjang masih kosong</p>
                                        <p className="max-w-[240px] text-xs">
                                            Tekan <span className="kbd">/</span> untuk mencari, lalu{' '}
                                            <span className="kbd">Enter</span> untuk menambah item pertama.
                                        </p>
                                    </div>
                                ) : (
                                    cart.map((item) => (
                                        <div key={item.product_id} className="receipt-line">
                                            <div className="receipt-line-top">
                                                <span className="receipt-line-name">{item.name}</span>
                                                <span className="receipt-line-total">
                                                    {money(item.price * item.quantity - lineDiscount(item))}
                                                </span>
                                            </div>
                                            <div className="receipt-line-bottom">
                                                <span className="receipt-line-price">
                                                    @ {money(item.price)}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <div className="qty-group">
                                                        <button
                                                            type="button"
                                                            className="qty-btn"
                                                            onClick={() => stepQuantity(item.product_id, -1)}
                                                            aria-label={`Kurangi ${item.name}`}
                                                        >
                                                            <Icon name="minus" size={13} />
                                                        </button>
                                                        <input
                                                            className="qty-input"
                                                            inputMode="numeric"
                                                            value={item.quantity}
                                                            onChange={(event) =>
                                                                setQuantity(item.product_id, event.target.value)
                                                            }
                                                            aria-label={`Jumlah ${item.name}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="qty-btn"
                                                            onClick={() => stepQuantity(item.product_id, 1)}
                                                            aria-label={`Tambah ${item.name}`}
                                                        >
                                                            <Icon name="plus" size={13} />
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-danger"
                                                        onClick={() => removeItem(item.product_id)}
                                                        aria-label={`Hapus ${item.name}`}
                                                    >
                                                        <Icon name="trash" size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="receipt-line-discount">
                                                <button
                                                    type="button"
                                                    className="receipt-discount-btn"
                                                    data-active={lineDiscount(item) > 0}
                                                    aria-expanded={lineEditor === item.product_id}
                                                    onClick={() => openLineDiscount(item)}
                                                >
                                                    {lineDiscount(item) > 0
                                                        ? `Diskon −${money(lineDiscount(item))}`
                                                        : 'Diskon item'}
                                                    {item.discount_type === 'percent' &&
                                                    item.discount_value > 0
                                                        ? ` (${item.discount_value}%)`
                                                        : ''}
                                                </button>
                                            </div>

                                            {lineEditor === item.product_id ? (
                                                <div className="receipt-discount-editor">
                                                    <select
                                                        className="input"
                                                        value={lineDraft.type}
                                                        onChange={(event) =>
                                                            setLineDraft((current) => ({
                                                                ...current,
                                                                type: event.target.value,
                                                            }))
                                                        }
                                                        aria-label={`Jenis diskon ${item.name}`}
                                                    >
                                                        <option value="nominal">Rp</option>
                                                        <option value="percent">%</option>
                                                    </select>
                                                    <input
                                                        className="input"
                                                        inputMode="numeric"
                                                        placeholder="0"
                                                        autoFocus
                                                        value={lineDraft.value}
                                                        onChange={(event) =>
                                                            setLineDraft((current) => ({
                                                                ...current,
                                                                value: event.target.value.replace(/[^0-9]/g, ''),
                                                            }))
                                                        }
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Enter') {
                                                                event.preventDefault();
                                                                applyLineDiscount(item);
                                                            }
                                                        }}
                                                        aria-label={`Nilai diskon ${item.name}`}
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => applyLineDiscount(item)}
                                                        >
                                                            OK
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-ghost"
                                                            onClick={() => clearLineDiscount(item.product_id)}
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 border-t border-line pt-3">
                                <span className="text-xs font-semibold text-muted">Diskon nota</span>
                                <div className="flex items-center gap-1">
                                    <select
                                        className="input min-h-9 w-[86px] px-1 text-xs"
                                        value={discount.type}
                                        onChange={(event) =>
                                            setDiscount((current) => ({
                                                ...current,
                                                type: event.target.value,
                                            }))
                                        }
                                        aria-label="Jenis diskon"
                                    >
                                        <option value="nominal">Rp</option>
                                        <option value="percent">%</option>
                                    </select>
                                    <input
                                        className="input min-h-9 px-2 text-right"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={discount.value}
                                        onChange={(event) =>
                                            setDiscount((current) => ({
                                                ...current,
                                                value: event.target.value.replace(/[^0-9]/g, ''),
                                            }))
                                        }
                                        aria-label="Nilai diskon"
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="min-h-9 text-xs text-muted underline-offset-4 hover:text-ink hover:underline"
                                    onClick={() => setDiscount({ type: 'nominal', value: '' })}
                                >
                                    Reset
                                </button>
                            </div>

                            <div className="receipt-totals">
                                <div className="receipt-total-row">
                                    <span className="text-muted">Subtotal</span>
                                    <span className="money">{money(subtotal)}</span>
                                </div>
                                {itemDiscount > 0 ? (
                                    <div className="receipt-total-row">
                                        <span className="text-muted">Diskon item</span>
                                        <span className="money">-{money(itemDiscount)}</span>
                                    </div>
                                ) : null}
                                {discountAmount > 0 ? (
                                    <div className="receipt-total-row">
                                        <span className="text-muted">Diskon nota</span>
                                        <span className="money">-{money(discountAmount)}</span>
                                    </div>
                                ) : null}
                                <div className="receipt-grand">
                                    <span className="receipt-grand-label">Total</span>
                                    <span className="receipt-grand-value">{money(total)}</span>
                                </div>
                            </div>

                            <div className="receipt-actions">
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={holdCart}
                                    disabled={cart.length === 0 || busy}
                                >
                                    <Icon name="clock" size={15} />
                                    Tahan
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={openPayment}
                                    disabled={cart.length === 0}
                                >
                                    <Icon name="wallet" size={16} />
                                    Bayar
                                    <span className="kbd ml-1">F9</span>
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <Modal
                open={paymentOpen}
                onClose={closePayment}
                title="Pembayaran"
                description="Pilih metode, lalu selesaikan. Kembalian dihitung otomatis untuk tunai."
                footer={
                    <>
                        <button type="button" className="btn" onClick={closePayment}>
                            Batal
                        </button>
                        <button
                            type="submit"
                            form="form-bayar"
                            className="btn btn-primary"
                            disabled={busy}
                        >
                            {busy ? 'Memproses…' : `Bayar ${money(total)}`}
                        </button>
                    </>
                }
            >
                <form id="form-bayar" onSubmit={submitPayment} className="pay-grid">
                    <div className="pay-total">
                        <div className="flex items-baseline justify-between gap-3">
                            <div>
                                <p className="section-label">Total tagihan</p>
                                <p className="money mt-1 text-[34px] leading-none font-semibold tracking-[-0.03em]">
                                    {money(total)}
                                </p>
                            </div>
                            <p className="text-right text-[11px] leading-snug text-muted">
                                {cart.reduce((sum, item) => sum + item.quantity, 0)} item
                                <br />
                                {cart.length} baris
                            </p>
                        </div>
                    </div>

                    <div>
                        <p className="label">Metode pembayaran</p>
                        <div className="pay-methods">
                            {paymentMethods.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    className="pay-method"
                                    data-active={method === item.key}
                                    onClick={() => {
                                        setMethod(item.key);
                                        setPaid(item.cash ? '' : String(total));
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeMethod?.cash ? (
                        <>
                            <div>
                                <label className="label" htmlFor="uang-diterima">
                                    Uang diterima
                                </label>
                                <input
                                    id="uang-diterima"
                                    className="pay-amount"
                                    inputMode="numeric"
                                    autoFocus
                                    placeholder="0"
                                    value={paid}
                                    onChange={(event) => setPaid(event.target.value.replace(/[^0-9]/g, ''))}
                                />
                                <div className="pay-quick mt-3">
                                    {quickAmounts.map((amount) => (
                                        <button
                                            key={amount}
                                            type="button"
                                            onClick={() => setPaid(String(amount))}
                                        >
                                            {money(amount)}
                                        </button>
                                    ))}
                                    {paid ? (
                                        <button type="button" onClick={() => setPaid('')}>
                                            Hapus
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            <div className="flex items-baseline justify-between border-t border-line pt-3">
                                <span className="text-sm text-muted">Kembalian</span>
                                <span className="money text-2xl font-semibold">{money(change)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="wall-note">
                            Pembayaran non-tunai hanya dicatat. Pastikan dana sudah diterima sebelum
                            menekan tombol bayar.
                        </div>
                    )}

                    {payError ? <p className="text-sm text-danger">{payError}</p> : null}
                </form>
            </Modal>

            <Modal
                open={Boolean(receipt)}
                onClose={() => setReceipt(null)}
                title="Pembayaran selesai"
                description={receipt ? `${receipt.sale.number} · ${receipt.sale.payment_label}` : ''}
                footer={
                    <>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => receipt && printReceipt(receipt.width)}
                        >
                            Cetak struk
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => setReceipt(null)}>
                            Transaksi baru
                        </button>
                    </>
                }
            >
                {receipt ? (
                    <div>
                        <div className="success-banner mb-4">
                            <span className="success-icon">
                                <Icon name="check" size={18} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold">Transaksi tersimpan</p>
                                <p className="text-xs text-muted">
                                    {receipt.sale.created_at} · {receipt.sale.cashier}
                                </p>
                            </div>
                        </div>
                        {receipt.sale.payment_method === 'cash' ? (
                            <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
                                <span className="text-sm text-muted">Kembalian</span>
                                <span className="money text-2xl font-semibold">
                                    {money(receipt.sale.change)}
                                </span>
                            </div>
                        ) : null}
                        <Receipt receipt={receipt} />
                    </div>
                ) : null}
            </Modal>

            <Modal
                open={draftsOpen}
                onClose={() => setDraftsOpen(false)}
                title="Transaksi ditahan"
                description="Lanjutkan draft untuk memuat isinya ke keranjang."
                size="lg"
            >
                {drafts.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                        <span className="mb-3 flex h-10 w-10 items-center justify-center border border-dashed border-line-strong text-muted">
                            <Icon name="layers" size={18} />
                        </span>
                        <p className="text-sm font-semibold">Belum ada draft</p>
                        <p className="mt-1 max-w-xs text-xs text-muted">
                            Keranjang yang ditahan akan muncul di sini dan bisa dilanjutkan kapan saja.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-line rounded-[var(--radius)] border border-line">
                        {drafts.map((draft) => (
                            <div
                                key={draft.id}
                                className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-surface2"
                            >
                                <div className="min-w-0">
                                    <p className="money text-sm font-semibold">{draft.number}</p>
                                    <p className="text-xs text-muted">
                                        {draft.created_at} · {draft.item_count} item · {money(draft.total)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-ghost text-danger"
                                        onClick={() => deleteDraft(draft)}
                                    >
                                        <Icon name="trash" size={13} />
                                        Hapus
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-primary"
                                        onClick={() => resumeDraft(draft)}
                                    >
                                        Lanjutkan
                                        <Icon name="arrowRight" size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </AppLayout>
    );
}
