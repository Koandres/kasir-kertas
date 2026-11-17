export function printReceipt(width = '58') {
    const style = document.createElement('style');
    style.setAttribute('data-receipt-page', '');
    style.textContent = `@media print { @page { size: ${width === '80' ? '80mm' : '58mm'} auto; margin: 3mm; } }`;

    document.head.appendChild(style);
    window.print();
    window.setTimeout(() => style.remove(), 2000);
}
