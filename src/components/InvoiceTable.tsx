import { FileText } from 'lucide-react';
import type { Invoice } from '../types/portal';

type InvoiceTableProps = {
  invoices: Invoice[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  return (
    <section className="panel invoice-panel" id="invoices">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Contabilita</p>
          <h2>Fatture recenti</h2>
        </div>
        <button className="secondary-button" type="button">
          <FileText size={17} />
          Esporta
        </button>
      </div>
      <div className="invoice-list">
        {invoices.map((invoice) => (
          <article className="invoice-row" key={invoice.id}>
            <div>
              <strong>{invoice.id}</strong>
              <span>{invoice.period}</span>
            </div>
            <div>
              <span>Consumo</span>
              <strong>{invoice.consumption} m3</strong>
            </div>
            <div>
              <span>Scadenza</span>
              <strong>{invoice.due}</strong>
            </div>
            <div>
              <span>Importo</span>
              <strong>{formatCurrency(invoice.amount)}</strong>
            </div>
            <span className={`invoice-status ${invoice.status === 'Pagata' ? 'paid' : 'due'}`}>
              {invoice.status}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
