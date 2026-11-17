function isTypingTarget(element) {
    if (!element) {
        return false;
    }

    return (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) ||
        element.isContentEditable
    );
}

/**
 * Daftarkan pintasan keyboard. Setiap binding:
 * { key: '/', handler: fn, allowInInput?: boolean }
 * Kembalikan fungsi untuk melepas listener.
 */
export function bindShortcuts(bindings, target = window) {
    const onKeyDown = (event) => {
        const typing = isTypingTarget(document.activeElement);

        for (const binding of bindings) {
            if (event.key.toLowerCase() !== binding.key.toLowerCase()) {
                continue;
            }

            if (typing && !binding.allowInInput) {
                continue;
            }

            event.preventDefault();
            binding.handler(event);

            return;
        }
    };

    target.addEventListener('keydown', onKeyDown);

    return () => target.removeEventListener('keydown', onKeyDown);
}
