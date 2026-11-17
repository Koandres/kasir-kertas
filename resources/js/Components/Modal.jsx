import { useEffect } from 'react';
import Icon from './Icon';

const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
};

export default function Modal({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
}) {
    useEffect(() => {
        if (!open) {
            return;
        }

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose();
            }
        };

        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previous;
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <button
                type="button"
                aria-label="Tutup"
                className="modal-backdrop fixed inset-0 cursor-default"
                onClick={onClose}
                tabIndex={-1}
            />
            <div
                className={`modal-card relative z-10 my-auto w-full rounded-[var(--radius)] ${sizes[size]}`}
            >
                <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="text-lg leading-tight font-semibold tracking-tight">
                            {title}
                        </h2>
                        {description ? (
                            <p className="mt-0.5 text-sm text-muted">{description}</p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="-mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-muted transition-colors hover:bg-surface2 hover:text-ink"
                        aria-label="Tutup"
                    >
                        <Icon name="close" size={16} />
                    </button>
                </div>

                <div className="scroll-slim max-h-[calc(100dvh-12rem)] overflow-y-auto px-5 py-4">
                    {children}
                </div>

                {footer ? (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface2/40 px-5 py-3">
                        {footer}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
