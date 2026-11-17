export function formatMoney(value, currency = {}) {
    const {
        prefix = 'Rp',
        suffix = '',
        decimals = 0,
        thousand_separator: thousand = '.',
        decimal_separator: decimal = ',',
    } = currency || {};

    const number = Number(value) || 0;
    const negative = number < 0;
    const [whole, fraction] = Math.abs(number).toFixed(decimals).split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousand);
    const body = fraction ? `${grouped}${decimal}${fraction}` : grouped;
    const head = `${prefix}${prefix ? ' ' : ''}${body}${suffix ? ` ${suffix}` : ''}`;

    return `${negative ? '-' : ''}${head}`.replace(/\s+/g, ' ').trim();
}

export function formatNumber(value) {
    return new Intl.NumberFormat('id-ID').format(Number(value) || 0);
}

export function parseDigits(value) {
    const digits = String(value ?? '').replace(/[^0-9]/g, '');

    return digits === '' ? 0 : Number(digits);
}

export function applyAppearance(appearance = {}) {
    const root = document.documentElement;

    root.dataset.theme = appearance.theme === 'dark' ? 'dark' : 'light';
    root.dataset.accent = appearance.accent || 'terakota';
    root.dataset.font = appearance.font || 'humanis';

    const meta = document.querySelector('meta[name="theme-color"]');

    if (meta) {
        meta.setAttribute('content', appearance.theme === 'dark' ? '#1C1B19' : '#F6F3EC');
    }
}

export function todayLabel() {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());
}
