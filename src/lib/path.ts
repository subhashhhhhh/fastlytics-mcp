/**
 * Tool arguments come from the model, which can be prompt-injected. Anything spliced
 * into a worker URL path goes through these helpers so an argument like
 * "../mcp/keys?" cannot walk to another worker route with the caller's credentials.
 */

const SLUG_RE = /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,80}$/u;
const PLACE_RE = /^[\p{L}\p{N}][\p{L}\p{N} '.,-]{0,80}$/u;

export class InvalidArgumentError extends Error {}

/** A slug-like path segment (driver/team ref, event slug), URL-encoded. */
export function slugSegment(value: string, name: string): string {
  if (!SLUG_RE.test(value)) {
    throw new InvalidArgumentError(
      `Invalid ${name}: use letters, digits, "_" or "-" (e.g. "max_verstappen").`,
    );
  }
  return encodeURIComponent(value);
}

/** A free-text place name segment (weather location), URL-encoded. */
export function placeSegment(value: string, name: string): string {
  const trimmed = value.trim();
  if (!PLACE_RE.test(trimmed) || trimmed.includes('..')) {
    throw new InvalidArgumentError(`Invalid ${name}.`);
  }
  return encodeURIComponent(trimmed);
}

/** One value from a fixed list, e.g. a leaderboard stat. */
export function choiceSegment<T extends string>(value: string, allowed: readonly T[], name: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new InvalidArgumentError(`Invalid ${name}. Use one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

/**
 * Last line of defence in callWorkerApi: the final path must stay a plain /api/ path
 * with no dot segments, query, fragment or backslash smuggled in through a segment.
 */
export function assertSafeApiPath(path: string): void {
  if (
    !path.startsWith('/api/') ||
    /[?#\\]/.test(path) ||
    path.split('/').some(segment => segment === '.' || segment === '..') ||
    /%2e|%2f|%5c/i.test(path)
  ) {
    throw new InvalidArgumentError('Invalid request path.');
  }
}
