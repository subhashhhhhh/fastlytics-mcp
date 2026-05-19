function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const R2_ACCOUNT_ID = required('R2_ACCOUNT_ID');
export const R2_ACCESS_KEY_ID = required('R2_ACCESS_KEY_ID');
export const R2_SECRET_ACCESS_KEY = required('R2_SECRET_ACCESS_KEY');
export const R2_BUCKET_NAME = required('R2_BUCKET_NAME');
export const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const SUPABASE_URL = required('SUPABASE_URL');
export const SUPABASE_SERVICE_ROLE_KEY = required('SUPABASE_SERVICE_ROLE_KEY');

export const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://api-dev.fastlytics.app';
export const BACKEND_API_KEY = process.env.BACKEND_API_KEY || '';

export const TRANSPORT = process.env.TRANSPORT || 'stdio';
export const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3456', 10);
