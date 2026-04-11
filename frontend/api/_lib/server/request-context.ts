import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  userId: string;
  accessToken: string | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getRequestContext(): RequestContext | null {
  return storage.getStore() ?? null;
}
