import { useEffect, useMemo, useState } from 'react';
import { Droplets, FileText, Gauge, WalletCards } from 'lucide-react';
import { ConsumptionChart } from '../components/ConsumptionChart';
import { ChatWidget } from "../components/ChatWidget";
import { InvoiceTable } from '../components/InvoiceTable';
import { MetricCard } from '../components/MetricCard';
import { ProfilePanel } from '../components/ProfilePanel';
import { getCurrentPortalUser } from '../services/api';
import type { PortalData } from '../types/portal';

import { exportInvoices } from "../services/api";



const mockInvoices = [
  {
    id: "FT-2025-001",
    period: "gennaio 2025",
    issued: "02 gen 2025",
    due: "24 gen 2025",
    consumption: 96,
    amount: 114.1,
    status: "Calcolata",
    readingPrevious: 7780,
    readingCurrent: 7876,
  },
  {
    id: "FT-2024-012",
    period: "dicembre 2024",
    issued: "03 dic 2024",
    due: "23 dic 2024",
    consumption: 72,
    amount: 89.5,
    status: "Pagata",
    readingPrevious: 7708,
    readingCurrent: 7780,
  },
  {
    id: "FT-2024-011",
    period: "novembre 2024",
    issued: "02 nov 2024",
    due: "22 nov 2024",
    consumption: 58,
    amount: 70.2,
    status: "Pagata",
    readingPrevious: 7650,
    readingCurrent: 7708,
  },
  {
    id: "FT-2024-010",
    period: "ottobre 2024",
    issued: "02 ott 2024",
    due: "22 ott 2024",
    consumption: 110,
    amount: 130.8,
    status: "Calcolata",
    readingPrevious: 7540,
    readingCurrent: 7650,
  },
  {
    id: "FT-2024-009",
    period: "settembre 2024",
    issued: "02 set 2024",
    due: "22 set 2024",
    consumption: 0, // edge case
    amount: 25.0,
    status: "Pagata",
    readingPrevious: 7540,
    readingCurrent: 7540,
  },
  {
    id: "FT-2024-008",
    period: "agosto 2024",
    issued: "02 ago 2024",
    due: null, // edge case
    consumption: 45,
    amount: 60.3,
    status: "Annullata",
    readingPrevious: 7495,
    readingCurrent: 7540,
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function DashboardPage() {
  const [data, setData] = useState<PortalData | null>(null);
 
  
  const [error, setError] = useState('');
  const token = window.localStorage.getItem('portalToken') || '';

  useEffect(() => {
    void getCurrentPortalUser(token)
      .then(setData)
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : 'Dati portale non disponibili.');
      });
  }, [token]);

  const currentInvoice = data?.latestInvoice;

  const summarizedInvoices = useMemo(() => {
  if (!data?.invoices?.length) return [];

  const groups = new Map<string, typeof data.invoices>();

  for (const invoice of data.invoices) {
    const key = `${invoice.id}-${invoice.period}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)!.push(invoice);
  }

  return Array.from(groups.values()).map((group) => {
    const mainInvoice =
      group.find(
        (invoice) =>
          Number(invoice.amount || 0) > 0 ||
          Number(invoice.consumption || 0) > 0
      ) || group[0];

    return {
      ...mainInvoice,
      amount: group.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
      consumption: group.reduce(
        (sum, invoice) => sum + Number(invoice.consumption || 0),
        0
      ),
    };
  });
}, [data]);

const averageUsage = useMemo(() => {
  if (!summarizedInvoices.length) return "0.0";

  const validInvoices = summarizedInvoices.filter(
    (invoice) => Number(invoice.consumption || 0) > 0
  );

  if (!validInvoices.length) return "0.0";

  const total = validInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.consumption || 0),
    0
  );

  return (total / validInvoices.length).toFixed(1);
}, [summarizedInvoices]);
                                    
 

  if (!data) {
    return (
      <main className="dashboard loading-state">
        {error || 'Caricamento portale...'}
      </main>
    );
  }
  
 const latestInvoicedPeriod = data.latestInvoice || summarizedInvoices[0] || null;

  
  const handleExportAll = async () => {
  try {
    await exportInvoices(token);
  } catch (e) {
    console.error(e);
  }
};
  return (
    <main className="dashboard">
      <header className="dashboard-header" id="overview">
        <div>
          <p className="eyebrow">Portale clienti Idromardi</p>
          <h1>Ciao, {data.customer.name.split(' ')[0]}</h1>
          <span>  
            Il contatore {data.customer.meterNo === "0000" ? "" : data.customer.meterNo} risulta collegato come {data.customer.tariff}.
          </span>
        </div>
        {/* <button className="primary-button" type="button" id="payments">
          <WalletCards size={18} />
          Paga fattura
        </button> */}
      </header>

      <section className="metrics-grid" aria-label="Riepilogo utenza">
        <MetricCard
          icon={<FileText size={22} />}
          label="Ultima bolletta"
          value={formatCurrency(latestInvoicedPeriod?.amount ?? 0)}
          detail={`Totale bolletta per ${currentInvoice?.period ?? 'n.d.'}`}
        />
        <MetricCard
          icon={<Droplets size={22} />}
          label="Ultimo consumo"
          value={`${latestInvoicedPeriod?.consumption ?? 0} mc`}
          detail={(`Consumo totale per ${latestInvoicedPeriod?.period ?? 'n.d.'}`)}
        />
        <MetricCard
          icon={<Gauge size={22} />}
          label="Media sei mesi"
          value={`${averageUsage} mc`}
          detail="Basata su letture verificate"
        />
      </section>

      <div className="content-grid">
        <div className="main-column">
          {/* <ConsumptionChart invoices={mockInvoices} /> */}
          <InvoiceTable invoices={data?.billDocumentRows} onExportAll={handleExportAll} />
        </div>
        <ProfilePanel
          customer={data?.customer}
          serviceNotes={data?.serviceNotes}
        />

   
        
      </div>
           <ChatWidget />
    </main>
  );
}
