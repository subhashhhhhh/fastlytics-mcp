import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  apiKey: string;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

export function runWithApiKey<T>(apiKey: string, callback: () => T): T {
  return requestContext.run({ apiKey }, callback);
}

export function getRequestApiKey(): string | undefined {
  return requestContext.getStore()?.apiKey;
}
