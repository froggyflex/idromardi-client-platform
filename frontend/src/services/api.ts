import type { PortalData, PortalProfileUpdate } from '../types/portal';

const API_BASE_URL = '/api'; //import.meta.env.VITE_API_BASE_URL || 

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
  email: string;
};

export async function requestRegistration(
  payload: RegistrationRequest,
): Promise<{ message: string; requestId: string; expiresAt: string }> {
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

    const data = (await response.json()) as { message?: string; requestId?: string; expiresAt?: string };

    if (!response.ok) {
      throw new Error(data.message || 'Registrazione non riuscita.');
    }

    return {
      message: data.message || 'Richiesta inviata correttamente.',
      requestId: data.requestId || '',
      expiresAt: data.expiresAt || '',
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

export async function resendConfirmationCode(requestId: string): Promise<{ message: string; expiresAt: string }> {
  const response = await fetch(`${API_BASE_URL}/registration/resend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requestId }),
  });

  const data = (await response.json()) as { message?: string; expiresAt?: string };

  if (!response.ok) {
    throw new Error(data.message || 'Invio codice non riuscito.');
  }

  return { message: data.message || 'Nuovo codice inviato.', expiresAt: data.expiresAt || '' };
}
