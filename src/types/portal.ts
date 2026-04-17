import type { ReactNode } from 'react';

export type Customer = {
  name: string;
  email: string;
  phone: string;
  accountNo: string;
  meterNo: string;
  address: string;
  tariff: string;
  status: string;
};

export type InvoiceStatus = 'In scadenza' | 'Pagata';

export type Invoice = {
  id: string;
  period: string;
  issued: string;
  due: string;
  consumption: number;
  amount: number;
  status: InvoiceStatus;
};

export type Reading = {
  month: string;
  value: number;
};

export type PortalData = {
  customer: Customer;
  invoices: Invoice[];
  readings: Reading[];
  serviceNotes: string[];
};

export type Metric = {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
};
