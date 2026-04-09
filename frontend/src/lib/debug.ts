const DEBUG_PREFIX = "[snaplet-debug]";

function now(): string {
  return new Date().toISOString();
}

export function logDebug(scope: string, message: string, data?: unknown): void {
  if (data === undefined) {
    // eslint-disable-next-line no-console
    console.log(`${DEBUG_PREFIX} ${now()} [${scope}] ${message}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`${DEBUG_PREFIX} ${now()} [${scope}] ${message}`, data);
}

export function logError(scope: string, message: string, error?: unknown): void {
  if (error === undefined) {
    // eslint-disable-next-line no-console
    console.error(`${DEBUG_PREFIX} ${now()} [${scope}] ${message}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.error(`${DEBUG_PREFIX} ${now()} [${scope}] ${message}`, error);
}
