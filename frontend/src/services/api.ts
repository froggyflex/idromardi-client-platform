import type { PortalData, PortalProfileUpdate } from '../types/portal';

//const API_BASE_URL = '/api'; //import.meta.env.VITE_API_BASE_URL || 
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
  
 export async function askPortalAssistant(
  token: string,
  message: string
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/portal/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  const data = (await response.json()) as { answer?: string; message?: string };

  if (!response.ok || !data.answer) {
    throw new Error(data.message || "Risposta assistente non disponibile.");
  }

  return data.answer;
}

export type LoginResponse = {
  token: string;
  accessIdentifier: string;
  phone: string;
  email?: string;
  mustChangePassword: boolean;
};

export async function login(numeroUtenza: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ numeroUtenza, password }),
  });

  const data = (await response.json()) as Partial<LoginResponse> & { message?: string };

  if (!response.ok || !data.token || !data.accessIdentifier) {
    throw new Error(data.message || 'Accesso non riuscito.');
  }

  return {
    token: data.token,
    accessIdentifier: data.accessIdentifier,
    phone: data.phone || '',
    email: data.email,
    mustChangePassword: Boolean(data.mustChangePassword),
  };
}

export type PasswordResetRequest = {
  numeroUtenza: string;
  cognome: string;
  fiscalCode: string;
  interno?: string;
  meterSerial?: string;
  mobile?: string;
};

export type PasswordResetVerification = {
  message: string;
  resetToken: string;
  accessIdentifier: string;
};

export async function verifyPasswordResetIdentity(payload: PasswordResetRequest): Promise<PasswordResetVerification> {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as Partial<PasswordResetVerification> & { message?: string };

  if (!response.ok || !data.resetToken || !data.accessIdentifier) {
    throw new Error(data.message || 'Verifica dati non riuscita.');
  }

  return {
    message: data.message || 'Identita verificata.',
    resetToken: data.resetToken,
    accessIdentifier: data.accessIdentifier,
  };
}

export async function completePasswordReset(resetToken: string, password: string): Promise<LoginResponse & { message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resetToken, password }),
  });

  const data = (await response.json().catch(() => ({}))) as Partial<LoginResponse> & { message?: string };

  if (!response.ok || !data.token || !data.accessIdentifier) {
    throw new Error(data.message || 'Salvataggio password non riuscito.');
  }

  return {
    token: data.token,
    accessIdentifier: data.accessIdentifier,
    phone: data.phone || '',
    email: data.email,
    mustChangePassword: Boolean(data.mustChangePassword),
    message: data.message || 'Password aggiornata correttamente.',
  };
}

export async function exportInvoices(token: string) {
  const response = await fetch(`${API_BASE_URL}/portal/invoices/export`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Errore esportazione.");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "fatture.xlsx";
  a.click();

  window.URL.revokeObjectURL(url);
}

export async function changeTemporaryPassword(
  numeroUtenza: string,
  currentPassword: string,
  newPassword: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/change-temporary-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ numeroUtenza, currentPassword, newPassword }),
  });

  const data = (await response.json()) as Partial<LoginResponse> & { message?: string };

  if (!response.ok || !data.token || !data.accessIdentifier) {
    throw new Error(data.message || 'Cambio password non riuscito.');
  }

  return {
    token: data.token,
    accessIdentifier: data.accessIdentifier,
    phone: data.phone || '',
    email: data.email,
    mustChangePassword: Boolean(data.mustChangePassword),
  };
}

 

export async function getCurrentPortalUser(token: string) {
  const response = await fetch(`${API_BASE_URL}/portal/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  console.log("Dati ricevuti dal backend:", data);

  if (!response.ok) {
    throw new Error(data.message || "Sessione non valida.");
  }

  return data;
}

export async function updatePortalProfile(
  token: string,
  profile: PortalProfileUpdate
): Promise<PortalData> {
  const response = await fetch(`${API_BASE_URL}/portal/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profile),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Aggiornamento non riuscito.");
  }

  return data as PortalData;
}

export type RegistrationRequest = {
  numeroUtenza: string;
  nome: string;
  cognome: string;
  fiscalCode: string;
  interno?: string;
  meterSerial?: string;
  mobile?: string;
  password: string;
};

export async function requestRegistration(payload: RegistrationRequest): Promise<{ message: string; accessIdentifier: string }> {
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

    const data = (await response.json()) as { message?: string; accessIdentifier?: string };

    if (!response.ok) {
      throw new Error(data.message || 'Registrazione non riuscita.');
    }

    return {
      message: data.message || 'Richiesta inviata correttamente.',
      accessIdentifier: data.accessIdentifier || '',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Il server non ha risposto in tempo. Controlla che il backend sia avviato.');
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
