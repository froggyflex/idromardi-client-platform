const BASE_URL = 'http://127.0.0.1:4003';

interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

export async function apiGet<T = unknown>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`);
  const body = await res.json();
  return { status: res.status, body };
}

export async function apiPost<T = unknown>(path: string, data: Record<string, unknown>): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  return { status: res.status, body };
}

export async function apiPut<T = unknown>(path: string, data: Record<string, unknown>): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  return { status: res.status, body };
}