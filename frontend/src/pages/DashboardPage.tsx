import { useEffect, useMemo, useState } from 'react';
import { Droplets, FileText, Gauge, WalletCards } from 'lucide-react';
import { ConsumptionChart } from '../components/ConsumptionChart';
import { InvoiceTable } from '../components/InvoiceTable';
import { MetricCard } from '../components/MetricCard';
import { ProfilePanel } from '../components/ProfilePanel';
import { getCurrentPortalData } from '../services/api';
import type { PortalData } from '../types/portal';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function DashboardPage() {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');
  const email = window.localStorage.getItem('idromardi_email') || '';

  useEffect(() => {
    void getCurrentPortalData(email)
      .then(setData)
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : 'Dati portale non disponibili.');
      });
  }, [email]);

  const averageUsage = useMemo(() => {
    if (!data) {
      return '0.0';
    }

    const total = data.readings.reduce((sum, reading) => sum + reading.value, 0);
    return (total / data.readings.length).toFixed(1);
  }, [data]);

  if (!data) {
    return (
      <main className="dashboard loading-state">
        {error || 'Caricamento portale...'}
      </main>
    );
  }

  const currentInvoice = data.invoices[0];

  return (
    <main className="dashboard">
      <header className="dashboard-header" id="overview">
        <div>
          <p className="eyebrow">Portale clienti Idromardi</p>
          <h1>Ciao, {data.customer.name.split(' ')[0]}</h1>
          <span>
            Il contatore {data.customer.meterNo} e collegato a {data.customer.tariff}.
          </span>
        </div>
        <button className="primary-button" type="button" id="payments">
          <WalletCards size={18} />
          Paga fattura
        </button>
      </header>

      <section className="metrics-grid" aria-label="Riepilogo utenza">
        <MetricCard
          icon={<FileText size={22} />}
          label="Fattura corrente"
          value={formatCurrency(currentInvoice.amount)}
          detail={`Scadenza ${currentInvoice.due}`}
        />
        <MetricCard
          icon={<Droplets size={22} />}
          label="Ultimo consumo"
          value={`${currentInvoice.consumption} m3`}
          detail={`Periodo ${currentInvoice.period}`}
        />
        <MetricCard
          icon={<Gauge size={22} />}
          label="Media sei mesi"
          value={`${averageUsage} m3`}
          detail="Basata su letture verificate"
        />
      </section>

      <div className="content-grid">
        <div className="main-column">
          <ConsumptionChart readings={data.readings} />
          <InvoiceTable invoices={data.invoices} />
        </div>
        <ProfilePanel
          customer={data.customer}
          serviceNotes={data.serviceNotes}
        />
      </div>
    </main>
  );
}
