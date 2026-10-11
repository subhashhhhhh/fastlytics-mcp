import { createHash } from 'node:crypto';
import { getConfig } from './config.js';

/**
 * fl_mcp_ keys used to be let through on their prefix alone, so any made-up
 * "fl_mcp_x" reached every tool the worker doesn't gate. Keys are now checked
 * against the worker before a request is served, and the answer is cached by
 * SHA-256 of the key (never the key itself): 5 minutes for a good key, 1 minute
 * for a bad one. A 401 from the worker during a tool call also marks the key bad.
 */

const VALID_TTL_MS = 5 * 60 * 1000;
const INVALID_TTL_MS = 60 * 1000;
const MAX_ENTRIES = 10_000;

const cache = new Map<string, { valid: boolean; expires: number }>();

function keyHash(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

function remember(hash: string, valid: boolean) {
  if (cache.size >= MAX_ENTRIES) {
    // Map iterates in insertion order, so this drops the oldest entry.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.delete(hash);
  cache.set(hash, { valid, expires: Date.now() + (valid ? VALID_TTL_MS : INVALID_TTL_MS) });
}

export function markApiKeyInvalid(apiKey: string) {
  if (apiKey.startsWith('fl_mcp_')) remember(keyHash(apiKey), false);
}

/**
 * Asks the worker whether the key is good using an unmetered route (the season
 * schedule): the worker answers 401 for an unknown, revoked or expired fl_mcp_
 * key there, and only metered data routes count against the monthly quota.
 * Returns null when the worker can't be reached, so callers can fail closed.
 */
async function askWorker(apiKey: string): Promise<boolean | null> {
  const { FASTLYTICS_API_URL } = getConfig();
  const url = new URL(`/api/schedule/${new Date().getUTCFullYear()}`, FASTLYTICS_API_URL);
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    await resp.body?.cancel();
    if (resp.status === 401 || resp.status === 403) return false;
    if (resp.status >= 500) return null;
    return true;
  } catch {
    return null;
  }
}

/** true = good key, false = rejected, null = could not check right now. */
export async function checkApiKey(apiKey: string): Promise<boolean | null> {
  if (!/^fl_mcp_[A-Za-z0-9_-]{8,200}$/.test(apiKey)) return false;
  const hash = keyHash(apiKey);
  const hit = cache.get(hash);
  if (hit && hit.expires > Date.now()) return hit.valid;

  const valid = await askWorker(apiKey);
  if (valid !== null) remember(hash, valid);
  return valid;
}
