import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ReceiptText, Search } from "lucide-react";
import type { InvoiceEmitted } from "../types/portal";

type InvoiceTableProps = {
  invoices: InvoiceEmitted[];
  onExportAll?: () => void;
};

const PAGE_SIZE = 6;

function normalize(value: unknown) {
  return String(value || "").toLowerCase().trim();
}

function getPeriodSortValue(period: string) {
  const monthMap: Record<string, number> = {
    gennaio: 1,
    febbraio: 2,
    marzo: 3,
    aprile: 4,
    maggio: 5,
    giugno: 6,
    luglio: 7,
    agosto: 8,
    settembre: 9,
    ottobre: 10,
    novembre: 11,
    dicembre: 12,
  };

  const value = normalize(period);
  const yearMatch = value.match(/\b(20\d{2}|19\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : 0;

  const monthName = Object.keys(monthMap).find((month) => value.includes(month));
  const month = monthName ? monthMap[monthName] : 0;

  return year * 100 + month;
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openPeriods, setOpenPeriods] = useState<Record<string, boolean>>({});

  const groupedInvoices = useMemo(() => {
    const query = normalize(search);

    const filtered = invoices
      .filter((invoice) => {
        if (!query) return true;

        return (
          normalize(invoice.period).includes(query) ||
          normalize(invoice.id).includes(query) ||
          normalize(invoice.filename).includes(query) ||
          normalize(invoice.createdAt).includes(query) ||
          normalize(invoice.interno).includes(query)
        );
      });

    const groups = new Map<string, typeof invoices>();

    for (const invoice of filtered) {
      const period = invoice.period || "Periodo non disponibile";

      if (!groups.has(period)) {
        groups.set(period, []);
      }

      groups.get(period)!.push(invoice);
    }

    return Array.from(groups.entries())
      .map(([period, items]) => ({
        period,
        items,
        sortValue: getPeriodSortValue(period),
      }))
      .sort((a, b) => b.sortValue - a.sortValue);
  }, [invoices, search]);

  const filteredInvoices = useMemo(() => {
    const query = normalize(search);

    return invoices
      .filter((invoice) => {
        if (!query) return true;

        return (
          normalize(invoice.period).includes(query) ||
          normalize(invoice.id).includes(query) ||
          normalize(invoice.filename).includes(query) ||
          normalize(invoice.createdAt).includes(query)
        );
      })
      .sort((a, b) => getPeriodSortValue(b.period) - getPeriodSortValue(a.period));
  }, [invoices, search]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  console.log("Invoices after filtering and sorting:", filteredInvoices);
  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <section className="panel invoice-panel" id="invoices">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Ripartizioni</p>
          <h2>Bollette disponibili</h2>
        </div>

      </div>

      <div className="invoice-table-toolbar">
        <div className="invoice-search-box">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Cerca per periodo, file o ID..."
          />
        </div>

        <span className="invoice-count-pill">
          {filteredInvoices.length} bollett{filteredInvoices.length === 1 ? "a" : "e"}
        </span>
      </div>

      <div className="invoice-list-modern">
        {groupedInvoices.length === 0 ? (
          <div className="empty-state">Nessuna bolletta disponibile.</div>
        ) : (
          groupedInvoices.map((group) => {
            const isOpen = openPeriods[group.period] ?? true;

            return (
              <section className="invoice-period-group" key={group.period}>
                <button
                  type="button"
                  className="invoice-period-header"
                  onClick={() =>
                    setOpenPeriods((current) => ({
                      ...current,
                      [group.period]: !isOpen,
                    }))
                  }
                >
                  <div>
                    <strong>{group.period}</strong>
                    <span>
                      {group.items.length} bollett{group.items.length === 1 ? "a" : "e"}
                    </span>
                  </div>

                  <span>{isOpen ? "−" : "+"}</span>
                </button>

                {isOpen && (
                  <div className="invoice-period-items">
                    {group.items.map((invoice) => (
                      <article className="invoice-card-row" key={invoice.id}>
                        <div className="invoice-card-icon">
                          <ReceiptText size={22} />
                        </div>

                        <div className="invoice-card-main">
                          <div className="invoice-card-title-row">
                            <div>
                              <strong>
                                Utenza: {invoice.interno || "Non disponibile"}
                              </strong>
                              <span>{invoice.id}</span>
                            </div>

                            <span className="invoice-status-pill available">
                              Disponibile
                            </span>
                          </div>

                          <div className="invoice-card-metrics-row">
                            <div>
                              <span>Periodo lettura</span>
                              <strong>{invoice.period || "Non disponibile"}</strong>
                            </div>

                            <div>
                              <span>Creato il</span>
                              <strong>{invoice.createdAt || "-"}</strong>
                            </div>
                          </div>
                        </div>

                        {invoice.fileUrl ? (
                          <a
                            className="invoice-download-modern"
                            href={invoice.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download size={16} />
                            Scarica PDF
                          </a>
                        ) : (
                          <button
                            className="invoice-download-modern disabled"
                            type="button"
                            disabled
                          >
                            <Download size={16} />
                            Non disponibile
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

      <div className="invoice-pagination">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
        >
          <ChevronLeft size={16} />
          Precedente
        </button>

        <span>
          Pagina {currentPage} di {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
        >
          Successiva
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}
