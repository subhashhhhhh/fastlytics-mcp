import { BACKEND_API_URL, BACKEND_API_KEY } from './config.js';

export async function fetchFromBackend<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const url = new URL(path, BACKEND_API_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const headers: Record<string, string> = {};
    if (BACKEND_API_KEY) {
      headers['X-API-Key'] = BACKEND_API_KEY;
    }

    const resp = await fetch(url.toString(), { headers });
    if (!resp.ok) return null;
    return (await resp.json()) as T;
  } catch {
    return null;
  }
}
