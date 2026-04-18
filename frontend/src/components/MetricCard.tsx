import type { Metric } from '../types/portal';

export function MetricCard({ icon, label, value, detail }: Metric) {
  return (
    <article className="metric-card">
      <span className="metric-icon">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}
