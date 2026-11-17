import { usePage } from '@inertiajs/react';
import { formatMoney } from '../lib/format';

export default function Receipt({ receipt, className = '' }) {
    const { currency } = usePage().props;
    const { store, sale, items, width } = receipt;
    const money = (value) => formatMoney(value, currency);
    const paper = width === '80' ? 'paper-80' : 'paper-58';

    return (
        <div className={`receipt-paper receipt-print ${paper} ${className}`}>
            <div className="r-head">
                {store.logo ? <img src={store.logo} alt="" className="r-logo" /> : null}
                <div className="r-store">{store.name}</div>
                {store.address ? <div className="r-store-meta">{store.address}</div> : null}
                {store.phone ? <div className="r-store-meta">{store.phone}</div> : null}
            </div>

            <div className="r-title">
                {sale.status === 'draft' ? 'Draft — belum dibayar' : 'Struk Penjualan'}
            </div>

            <hr className="r-dash" />

            <dl className="r-meta">
                <dt>No.</dt>
                <dd>{sale.number}</dd>
                <dt>Waktu</dt>
                <dd>{sale.created_at}</dd>
                <dt>Kasir</dt>
                <dd>{sale.cashier}</dd>
            </dl>

            <hr className="r-dash" />

            <table className="r-items">
                <tbody>
                    {items.map((item, index) => (
                        <tr key={`${item.name}-${index}`}>
                            <td className="r-item-name">
                                {item.name}
                                <div className="r-line-price">
                                    {money(item.price)} × {item.quantity}
                                </div>
                                {item.discount > 0 ? (
                                    <div className="r-line-price">
                                        Diskon −{money(item.discount)}
                                        {item.discount_type === 'percent' ? ` (${item.discount_value}%)` : ''}
                                    </div>
                                ) : null}
                            </td>
                            <td className="r-item-total">{money(item.line_total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <hr className="r-dash" />

            <div className="r-sum">
                <span>Subtotal</span>
                <span>{money(sale.subtotal)}</span>
            </div>
            {sale.item_discount > 0 ? (
                <div className="r-sum">
                    <span>Diskon item</span>
                    <span>-{money(sale.item_discount)}</span>
                </div>
            ) : null}
            {sale.discount > 0 ? (
                <div className="r-sum">
                    <span>
                        Diskon
                        {sale.discount_type === 'percent' ? ` (${sale.discount_value}%)` : ''}
                    </span>
                    <span>-{money(sale.discount)}</span>
                </div>
            ) : null}
            <div className="r-grand">
                <span>TOTAL</span>
                <span>{money(sale.total)}</span>
            </div>
            <div className="r-sum">
                <span>Bayar ({sale.payment_label})</span>
                <span>{money(sale.paid)}</span>
            </div>
            {sale.payment_method === 'cash' ? (
                <div className="r-sum">
                    <span>Kembali</span>
                    <span>{money(sale.change)}</span>
                </div>
            ) : null}

            {sale.status === 'void' ? (
                <div className="r-void">
                    Void
                    {sale.void_reason ? <div style={{ fontWeight: 400, letterSpacing: 0 }}>{sale.void_reason}</div> : null}
                </div>
            ) : null}

            <hr className="r-dash" />

            {store.footer ? <div className="r-foot">{store.footer}</div> : null}
            <div className="r-thanks">Terima kasih</div>
        </div>
    );
}
