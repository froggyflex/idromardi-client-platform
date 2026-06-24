import type { ReactNode } from 'react';

export type Customer = {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  fiscalCode: string;
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
  due?: string | null;
  consumption: number;
  amount: number;
  status: string;
  readingPrevious?: number | null;
  readingCurrent?: number | null;
  fileUrl?: string | null;
};

export type InvoiceEmitted = {
  id: string | number;

  period: string;
  periodKey?: string | null;

  issued?: string | null;
  createdAt?: string | null;

  filename?: string | null;
  filepath?: string | null;
  fileUrl?: string | null;

  status: "available" | "missing" | string;
  interno: string | null;
  idUtenza?: string | null;
  condominioId?: string | number | null;
};

export type Reading = {
  month: string;
  value: number;
};

export type PortalData = {
  customer: Customer;

  latestInvoice: Invoice | null;   
  invoices: Invoice[];             
  billDocumentRows: InvoiceEmitted[];
  readings: Reading[];
  serviceNotes: string[];
};

export type PortalProfileUpdate = {
  phone: string;
  mobile: string;
  fiscalCode: string;
};

export type Metric = {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
};
