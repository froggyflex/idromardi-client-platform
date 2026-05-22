import { useMemo } from "react";
import type { Invoice } from "../types/portal";

type ConsumptionChartProps = {
  invoices: Invoice[];
};

export function ConsumptionChart({ invoices }: ConsumptionChartProps) {
  const items = useMemo(() => {
    return invoices
      .filter(
        (invoice) =>
          invoice.consumption !== null && invoice.consumption !== undefined
      )
      .map((invoice) => ({
        id: String(invoice.id),
        period: invoice.period,
        amount: Number(invoice.amount || 0),
        status: invoice.status,
        consumption: Number(invoice.consumption || 0),
        previous: invoice.readingPrevious,
        current: invoice.readingCurrent,
      }));
  }, [invoices]);

  const maxValue = Math.max(...items.map((item) => item.consumption), 1);

  if (!items.length) {
    return (
      <section className="panel consumption-panel" id="consumption">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Riepilogo consumi</p>
            <h2>Consumi fatturati</h2>
          </div>
        </div>

        <div className="empty-state">
          Nessuna bolletta disponibile per questo profilo.
        </div>
      </section>
    );
  }

  return (
    <section className="panel consumption-panel" id="consumption">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Riepilogo consumi</p>
          <h2>Consumi fatturati</h2>
        </div>
        <span className="status-pill">
          {items.length} bollett{items.length === 1 ? "a" : "e"}
        </span>
      </div>

      <div
        className="invoice-scroll-shell"
        onWheel={(event) => {
          const row = event.currentTarget.querySelector(".invoice-scroll-row");

          if (!(row instanceof HTMLDivElement)) return;

          row.scrollBy({
            left: event.deltaY * 3,
            behavior: "auto",
          });
        }}
      >
        <div className="invoice-scroll-row">
          {items.map((item) => {
            const percentage = Math.max(
              8,
              (item.consumption / maxValue) * 100
            );

            return (
              <article className="invoice-summary-card" key={item.id}>
                <div className="invoice-summary-top">
                  <div>
                    <p className="invoice-period">{item.period}</p>
                    <span className="invoice-id">{item.id}</span>
                  </div>

                  <span className="invoice-status">{item.status}</span>
                </div>

                <div className="invoice-main-metric">
                  <div>
                    <span>Consumo</span>
                    <strong>{item.consumption} m³</strong>
                  </div>

                  <div>
                    <span>Importo</span>
                    <strong>{item.amount.toFixed(2)} €</strong>
                  </div>
                </div>

                <div className="consumption-progress">
                  <span style={{ width: `${percentage}%` }} />
                </div>

                <div className="invoice-readings-line">
                  <span>Precedente</span>
                  <strong>{item.previous ?? "-"}</strong>
                  <span>→</span>
                  <strong>{item.current ?? "-"}</strong>
                  <span>Attuale</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}