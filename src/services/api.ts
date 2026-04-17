import type { PortalData } from '../types/portal';

const portalData: PortalData = {
  customer: {
    name: 'Giulia Bianchi',
    email: 'cliente@email.com',
    phone: '+39 02 8844 1180',
    accountNo: 'IDR-2026-1847',
    meterNo: 'CONT-59A-0421',
    address: 'Via San Marco 18, 20121 Milano',
    tariff: 'Utenza domestica con ripartizione consumi',
    status: 'Attivo',
  },
  invoices: [
    {
      id: 'FT-2026-004',
      period: 'Marzo 2026',
      issued: '2 Apr 2026',
      due: '24 Apr 2026',
      consumption: 18.6,
      amount: 42.8,
      status: 'In scadenza',
    },
    {
      id: 'FT-2026-003',
      period: 'Febbraio 2026',
      issued: '2 Mar 2026',
      due: '24 Mar 2026',
      consumption: 16.9,
      amount: 38.4,
      status: 'Pagata',
    },
    {
      id: 'FT-2026-002',
      period: 'Gennaio 2026',
      issued: '2 Feb 2026',
      due: '24 Feb 2026',
      consumption: 15.2,
      amount: 34.7,
      status: 'Pagata',
    },
  ],
  readings: [
    { month: 'Ott', value: 13.8 },
    { month: 'Nov', value: 14.6 },
    { month: 'Dic', value: 17.4 },
    { month: 'Gen', value: 15.2 },
    { month: 'Feb', value: 16.9 },
    { month: 'Mar', value: 18.6 },
  ],
  serviceNotes: [
    'Lettura contatore programmata per il 28 Apr 2026',
    'Verifica pressione zona Milano Centro il 21 Apr, 02:00-05:00',
    'Metodo di pagamento e dati contratto verificati',
  ],
};

export async function login(email: string, password: string): Promise<{ token: string }> {
  if (!email || !password) {
    throw new Error('Email e password sono obbligatorie.');
  }

  return { token: 'mock-idromardi-client-token' };
}

export async function getPortalData(): Promise<PortalData> {
  return portalData;
}
