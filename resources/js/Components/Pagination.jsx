import { Link } from '@inertiajs/react';

function labelFor(link) {
    return link.label
        .replace('&laquo; Previous', '‹ Sebelumnya')
        .replace('Previous', '‹ Sebelumnya')
        .replace('Next &raquo;', 'Berikutnya ›')
        .replace('Next', 'Berikutnya ›');
}

export default function Pagination({ paginator }) {
    if (!paginator || paginator.last_page <= 1) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
            <span>
                {paginator.from ?? 0}–{paginator.to ?? 0} dari {paginator.total}
            </span>
            <div className="flex flex-wrap items-center gap-1">
                {paginator.links.map((link, index) =>
                    link.url ? (
                        <Link
                            key={index}
                            href={link.url}
                            preserveScroll
                            className={`flex min-h-9 min-w-9 items-center justify-center border px-2 transition-colors ${
                                link.active
                                    ? 'border-accent bg-accent text-accent-ink'
                                    : 'border-line bg-surface hover:bg-surface2'
                            }`}
                            dangerouslySetInnerHTML={{ __html: labelFor(link) }}
                        />
                    ) : (
                        <span
                            key={index}
                            className="flex min-h-9 min-w-9 items-center justify-center border border-line px-2 opacity-45"
                            dangerouslySetInnerHTML={{ __html: labelFor(link) }}
                        />
                    ),
                )}
            </div>
        </div>
    );
}
