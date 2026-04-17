import type { Reading } from '../types/portal';

type ConsumptionChartProps = {
  readings: Reading[];
};

export function ConsumptionChart({ readings }: ConsumptionChartProps) {
  const maxValue = Math.max(...readings.map((reading) => reading.value));

  return (
    <section className="panel consumption-panel" id="consumption">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Letture contatore</p>
          <h2>Consumi idrici</h2>
        </div>
        <span className="status-pill">m3 al mese</span>
      </div>
      <div className="bar-chart" aria-label="Grafico consumi idrici mensili">
        {readings.map((reading) => (
          <div className="bar-item" key={reading.month}>
            <div className="bar-track">
              <span
                className="bar-fill"
                style={{ height: `${(reading.value / maxValue) * 100}%` }}
              />
            </div>
            <strong>{reading.value}</strong>
            <span>{reading.month}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
