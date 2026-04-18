import type { PortalData, PortalProfileUpdate } from '../types/portal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const portalData: PortalData = {
  customer: {
    name: 'Giulia Bianchi',
    firstName: 'Giulia',
    lastName: 'Bianchi',
    email: 'cliente@email.com',
    phone: '+39 02 8844 1180',
    mobile: '+39 347 000 0000',
    fiscalCode: '',
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

export type LoginResponse = {
  token: string;
  email: string;
  mustChangePassword: boolean;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json()) as Partial<LoginResponse> & { message?: string };

  if (!response.ok || !data.token || !data.email) {
    throw new Error(data.message || 'Accesso non riuscito.');
  }

  return {
    token: data.token,
    email: data.email,
    mustChangePassword: Boolean(data.mustChangePassword),
  };
}

export async function changeTemporaryPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/change-temporary-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, currentPassword, newPassword }),
  });

  const data = (await response.json()) as Partial<LoginResponse> & { message?: string };

  if (!response.ok || !data.token || !data.email) {
    throw new Error(data.message || 'Cambio password non riuscito.');
  }

  return {
    token: data.token,
    email: data.email,
    mustChangePassword: Boolean(data.mustChangePassword),
  };
}

export async function getPortalData(): Promise<PortalData> {
  return portalData;
}

export async function getCurrentPortalData(email: string): Promise<PortalData> {
  const response = await fetch(`${API_BASE_URL}/portal/me?email=${encodeURIComponent(email)}`);
  const data = (await response.json()) as PortalData & { message?: string };

  if (!response.ok) {
    throw new Error(data.message || 'Dati portale non disponibili.');
  }

  return data;
}

export async function updatePortalProfile(
  email: string,
  profile: PortalProfileUpdate,
): Promise<PortalData> {
  const response = await fetch(`${API_BASE_URL}/portal/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, ...profile }),
  });
  const data = (await response.json()) as PortalData & { message?: string };

  if (!response.ok) {
    throw new Error(data.message || 'Aggiornamento profilo non riuscito.');
  }

  return data;
}

export type RegistrationRequest = {
  numeroUtenza: string;
  nome: string;
  cognome: string;
  email: string;
};

export async function requestRegistration(payload: RegistrationRequest): Promise<{ message: string }> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);

  try {
     
    const response = await fetch(`${API_BASE_URL}/registration/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = (await response.json()) as { message?: string };

    if (!response.ok) {
      throw new Error(data.message || 'Registrazione non riuscita.');
    }

    return { message: data.message || 'Richiesta inviata correttamente.' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Il server non ha risposto in tempo. Controlla che il backend sia avviato.');
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
