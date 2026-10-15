const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
export async function supportApi<T = unknown>(path: string, body?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${base}/portal/support/${path}`, {
    method: body ? 'POST' : 'GET', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${localStorage.getItem('portalToken') || ''}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Assistenza non disponibile. Riprova.');
  if (body && path.endsWith('/read')) window.dispatchEvent(new Event('customer-support-read'));
  return data as T;
}
