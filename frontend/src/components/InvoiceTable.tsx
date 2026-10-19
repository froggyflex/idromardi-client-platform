import { useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, ReceiptText, Search } from 'lucide-react';
import type { InvoiceEmitted } from '../types/portal';
type InvoiceTableProps = { invoices: InvoiceEmitted[]; onExportAll?: () => void };
const PAGE_SIZE = 6;
const normalize = (value: unknown) => String(value ?? '').toLocaleLowerCase('it-IT').trim();
function periodOrder(period: string) {
  const months = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  return Number(period.match(/\b(20\d{2}|19\d{2})\b/)?.[1] || 0) * 100 + months.findIndex(month => normalize(period).includes(month)) + 1;
}
export function InvoiceTable({ invoices = [] }: InvoiceTableProps) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(1), [openPeriods, setOpenPeriods] = useState<Record<string, boolean>>({});
  const prefix = useId();
  useEffect(() => { if (window.location.hash === '#invoices') document.getElementById('invoices')?.scrollIntoView({ block: 'start' }); }, []);
  const filtered = useMemo(() => invoices.filter(invoice => !search.trim() || [invoice.period, invoice.id, invoice.filename, invoice.createdAt, invoice.interno].some(value => normalize(value).includes(normalize(search)))), [invoices, search]);
  const groups = useMemo(() => {
    const byPeriod = new Map<string, InvoiceEmitted[]>();
    for (const invoice of filtered) { const period = invoice.period || 'Periodo non disponibile'; byPeriod.set(period, [...(byPeriod.get(period) || []), invoice]); }
    return [...byPeriod.entries()].map(([period, items]) => ({ period, items })).sort((a, b) => periodOrder(b.period) - periodOrder(a.period));
  }, [filtered]);
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE)), currentPage = Math.min(page, totalPages);
  return <section className="panel invoice-panel" id="invoices" aria-labelledby={`${prefix}-title`}>
    <div className="panel-heading"><div><p className="eyebrow">I tuoi documenti</p><h2 id={`${prefix}-title`}>Bollette</h2></div><span className="invoice-count-pill">{filtered.length} bollett{filtered.length === 1 ? 'a' : 'e'}</span></div>
    <div className="invoice-table-toolbar"><label className="invoice-search-box"><Search size={18} /><span className="visually-hidden">Cerca una bolletta</span><input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Cerca periodo o interno" /></label></div>
    <div className="invoice-list-modern">{groups.length === 0 ? <div className="empty-state">{search ? 'Nessuna bolletta corrisponde alla ricerca.' : 'Le tue bollette saranno disponibili qui.'}</div> : groups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((group, index) => {
      const isOpen = openPeriods[group.period] ?? true, id = `${prefix}-period-${index}`;
      return <section className="invoice-period-group" key={group.period}>
        <button className="invoice-period-header" type="button" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpenPeriods(previous => ({ ...previous, [group.period]: !isOpen }))}><div><strong>{group.period}</strong><span>{group.items.length} document{group.items.length === 1 ? 'o' : 'i'}</span></div><ChevronDown size={19} className={isOpen ? 'is-open' : ''} /></button>
        {isOpen && <div className="invoice-period-items" id={id}>{group.items.map(invoice => <article className="invoice-card-row" key={invoice.id}>
          <div className="invoice-card-icon"><ReceiptText size={22} /></div>
          <div className="invoice-card-main"><div className="invoice-card-title-row"><div><strong>Interno {invoice.interno || 'non indicato'}</strong><span>{invoice.filename || 'Bolletta Idromardi'}</span></div></div><div className="invoice-created-date">{invoice.createdAt ? `Pubblicata il ${invoice.createdAt}` : 'Documento del periodo'}</div></div>
          {invoice.fileUrl ? <a className="invoice-download-modern" href={invoice.fileUrl} target="_blank" rel="noreferrer" aria-label={`Scarica PDF, ${group.period}, interno ${invoice.interno || 'non indicato'}`}><Download size={17} />Scarica PDF</a> : <button className="invoice-download-modern disabled" disabled type="button">PDF non disponibile</button>}
        </article>)}</div>}
      </section>;
    })}</div>
    {totalPages > 1 && <nav className="invoice-pagination" aria-label="Pagine delle bollette"><button type="button" disabled={currentPage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft size={16} />Precedente</button><span aria-live="polite">{currentPage} di {totalPages}</span><button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>Successiva<ChevronRight size={16} /></button></nav>}
  </section>;
}
