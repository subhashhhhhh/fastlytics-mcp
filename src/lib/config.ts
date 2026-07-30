import { getRequestApiKey } from './request-context.js';

export function getApiKey(): string {
  const value = getRequestApiKey() || process.env.FASTLYTICS_MCP_API_KEY;
  if (!value) throw new Error('Missing FASTLYTICS_MCP_API_KEY');
  return value;
}

export function getConfig() {
  return {
    FASTLYTICS_API_URL: process.env.FASTLYTICS_API_URL || 'https://fastlytics-api-proxy-v2.subhashgottumukkala17.workers.dev',
    TRANSPORT: process.env.TRANSPORT || 'stdio',
    HTTP_PORT: parseInt(process.env.HTTP_PORT || '3456', 10),
  };
}
