import { FASTLYTICS_API_URL, FASTLYTICS_MCP_API_KEY } from './config.js';

export async function callWorkerApi<T>(path: string, params?: Record<string, string>): Promise<{ data: T | null; status: number; error?: string }> {
  const url = new URL(path, FASTLYTICS_API_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  try {
    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${FASTLYTICS_MCP_API_KEY}`,
      },
    });

    if (resp.status === 401) {
      return { data: null, status: 401, error: 'Invalid or expired API key. Check your FASTLYTICS_MCP_API_KEY.' };
    }
    if (resp.status === 403) {
      return { data: null, status: 403, error: 'Access denied. Your tier may not include this endpoint.' };
    }
    if (resp.status === 404) {
      return { data: null, status: 404, error: 'Resource not found.' };
    }
    if (!resp.ok) {
      return { data: null, status: resp.status, error: `API error: ${resp.status}` };
    }

    const data = (await resp.json()) as T;
    return { data, status: resp.status };
  } catch (e) {
    return { data: null, status: 0, error: `Network error: ${e instanceof Error ? e.message : String(e)}` };
  }
}
