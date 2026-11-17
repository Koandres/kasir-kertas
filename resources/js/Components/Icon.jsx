const paths = {
    receipt: (
        <>
            <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z" />
            <path d="M9 7.5h6M9 11h6M9 14.5h3.5" />
        </>
    ),
    history: (
        <>
            <path d="M3.2 12a8.8 8.8 0 1 0 2.6-6.3L3 8.5" />
            <path d="M3 3.5v5h5" />
            <path d="M12 7.5V12l3 1.8" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 1.8" />
        </>
    ),
    box: (
        <>
            <path d="m12 3 8 4.4v9.2L12 21l-8-4.4V7.4L12 3Z" />
            <path d="m4 7.4 8 4.4 8-4.4M12 11.8V21" />
        </>
    ),
    tag: (
        <>
            <path d="M3 3h8.2l9.3 9.3-8.2 8.2L3 11.2V3Z" />
            <circle cx="7.4" cy="7.4" r="1.4" />
        </>
    ),
    layers: (
        <>
            <path d="m12 3 9 5-9 5-9-5 9-5Z" />
            <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
        </>
    ),
    chart: (
        <>
            <path d="M3.5 20.5V4" />
            <path d="M3.5 20.5H21" />
            <path d="M8 20.5v-6M12.8 20.5V8.5M17.6 20.5v-9" />
        </>
    ),
    sliders: (
        <>
            <path d="M4 6.5h9M19 6.5h1M4 12h4.5M14.5 12h5.5M4 17.5h10.5M20.5 17.5h0" />
            <circle cx="16" cy="6.5" r="2.1" />
            <circle cx="11.5" cy="12" r="2.1" />
            <circle cx="17.5" cy="17.5" r="2.1" />
        </>
    ),
    logout: (
        <>
            <path d="M10 4H5.5v16H10" />
            <path d="m15 8 4 4-4 4M19 12H9" />
        </>
    ),
    search: (
        <>
            <circle cx="10.8" cy="10.8" r="6.6" />
            <path d="m15.8 15.8 4.4 4.4" />
        </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    trash: (
        <>
            <path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 13h9.4l.8-13" />
            <path d="M10 11v5M14 11v5" />
        </>
    ),
    print: (
        <>
            <path d="M7 9V3.5h10V9" />
            <path d="M7 17H4.5V9.5h15V17H17" />
            <path d="M7 14h10v6.5H7V14Z" />
        </>
    ),
    check: <path d="m5 12.5 4.2 4.2L19 6.5" />,
    alert: (
        <>
            <path d="M12 3.5 21 20H3L12 3.5Z" />
            <path d="M12 9v5M12 17h.01" />
        </>
    ),
    arrowRight: <path d="M4 12h15M14 7l5 5-5 5" />,
    store: (
        <>
            <path d="M4 9.5V20h16V9.5" />
            <path d="M3 9.5 5.5 4h13L21 9.5a3 3 0 0 1-4.5 2.6 3 3 0 0 1-4.5 0 3 3 0 0 1-4.5 0A3 3 0 0 1 3 9.5Z" />
            <path d="M9.5 20v-5h5v5" />
        </>
    ),
    user: (
        <>
            <circle cx="12" cy="8" r="3.6" />
            <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
        </>
    ),
    lock: (
        <>
            <rect x="5" y="10" width="14" height="10.5" rx="1.5" />
            <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
            <path d="M12 14.5v2" />
        </>
    ),
    mail: (
        <>
            <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
            <path d="m4 7 8 6 8-6" />
        </>
    ),
    eye: (
        <>
            <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="3" />
        </>
    ),
    eyeOff: (
        <>
            <path d="M4 4.5 20 20M9.7 9.8A3 3 0 0 0 14.2 14" />
            <path d="M6.4 6.7C4 8.4 2.5 12 2.5 12s3.5 6.2 9.5 6.2c1.7 0 3.2-.5 4.5-1.2M10.2 5.9A10 10 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3 3.6" />
        </>
    ),
    wallet: (
        <>
            <path d="M4 6.5h14.5A1.5 1.5 0 0 1 20 8v10.5H5.5A1.5 1.5 0 0 1 4 17V6.5Z" />
            <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H17" />
            <path d="M15.5 11.5h4.5v4h-4.5a2 2 0 0 1 0-4Z" />
        </>
    ),
    card: (
        <>
            <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
            <path d="M3 9.5h18M6.5 14.5h4" />
        </>
    ),
    chevronRight: <path d="m9 5 7 7-7 7" />,
    arrowUp: <path d="M12 20V4M6 10l6-6 6 6" />,
    arrowDown: <path d="M12 4v16M6 14l6 6 6-6" />,
    spark: (
        <>
            <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.9L12 18.5l-1.8-5.8L4.5 10.8 10.2 9 12 3.5Z" />
        </>
    ),
};

export default function Icon({ name, size = 18, strokeWidth = 1.6, className = '' }) {
    const content = paths[name];

    if (!content) {
        return null;
    }

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            {content}
        </svg>
    );
}
