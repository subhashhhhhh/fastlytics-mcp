import { getApiKey, getConfig } from './config.js';

async function readErrorDetail(resp: Response): Promise<string> {
  try {
    const body = await resp.text();
    if (!body) return '';
    const parsed = JSON.parse(body);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed.detail || parsed.error || parsed.message || '';
    }
    return '';
  } catch {
    return '';
  }
}

export async function callWorkerApi<T>(path: string, params?: Record<string, string>): Promise<{ data: T | null; status: number; error?: string }> {
  const { FASTLYTICS_API_URL } = getConfig();
  const apiKey = getApiKey();
  const url = new URL(path, FASTLYTICS_API_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  try {
    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (resp.status === 401) {
      const detail = await readErrorDetail(resp);
      return { data: null, status: 401, error: `Invalid or expired API key. Check your FASTLYTICS_MCP_API_KEY.${detail ? ` ${detail}` : ''}` };
    }
    if (resp.status === 403) {
      const detail = await readErrorDetail(resp);
      return { data: null, status: 403, error: `Access denied. Your tier may not include this endpoint.${detail ? ` ${detail}` : ''}` };
    }
    if (resp.status === 404) {
      const detail = await readErrorDetail(resp);
      return { data: null, status: 404, error: detail || 'Resource not found.' };
    }
    if (!resp.ok) {
      const detail = await readErrorDetail(resp);
      return { data: null, status: resp.status, error: detail || `API error: ${resp.status}` };
    }

    const data = (await resp.json()) as T;
    return { data, status: resp.status };
  } catch (e) {
    return { data: null, status: 0, error: `Network error: ${e instanceof Error ? e.message : String(e)}` };
  }
}
