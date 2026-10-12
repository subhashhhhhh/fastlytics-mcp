import { createRequire } from 'node:module';

type SentryModule = typeof import('@sentry/node');

let sentry: SentryModule | null = null;

/**
 * Error reporting for the hosted server only. The package is also run locally by
 * people over stdio; those installs have no SENTRY_DSN and never load the SDK,
 * so nothing leaves their machine. @sentry/node is an optional dependency for
 * the same reason.
 */
export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || process.env.TRANSPORT !== 'http') return;
  try {
    sentry = await import('@sentry/node');
  } catch {
    return;
  }
  sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || 'production',
    release: `fastlytics-mcp@${(createRequire(import.meta.url)('../../package.json') as { version: string }).version}`,
    dataCollection: { userInfo: false },
    tracesSampleRate: 0,
  });
}

export function reportError(error: unknown, context?: Record<string, string | number>): void {
  if (!sentry) return;
  sentry.captureException(error, { tags: context });
}

export async function flushSentry(): Promise<void> {
  if (sentry) await sentry.flush(2000);
}
