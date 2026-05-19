function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const FASTLYTICS_MCP_API_KEY = required('FASTLYTICS_MCP_API_KEY');
export const FASTLYTICS_API_URL = process.env.FASTLYTICS_API_URL || 'https://api.fastlytics.app';
export const TRANSPORT = process.env.TRANSPORT || 'stdio';
export const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3456', 10);
