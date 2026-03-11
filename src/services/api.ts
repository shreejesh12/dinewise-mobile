const RAW_API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '').trim();

function inferMobileDevBase() {
  if (typeof window === 'undefined') return '';

  const host = window.location.hostname;
  const isCapacitorLocalhost = host === 'localhost' || host === '127.0.0.1';

  if (!isCapacitorLocalhost) return '';

  // Android emulator -> host machine
  return 'http://10.0.2.2:3000';
}

const API_BASE = RAW_API_BASE || inferMobileDevBase();

export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const response = await fetch(apiUrl(path), init);
  return response;
}

export async function parseJsonResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.slice(0, 120).replace(/\s+/g, ' ').trim();
    throw new Error(
      `Server returned non-JSON response. Check backend URL/server. Response starts with: ${preview || '[empty response]'}`,
    );
  }
}

export { API_BASE };
