// fetch with one retry for network blips, timeouts and temporary server errors (429, 5xx).

const RETRY_AFTER_MS = 2_000;

function worthRetrying(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchWithRetry(url: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (attempt === 1 && worthRetrying(res.status)) {
        await new Promise((r) => setTimeout(r, RETRY_AFTER_MS));
        continue;
      }
      return res;
    } catch (e) {
      if (attempt > 1) throw e;
      await new Promise((r) => setTimeout(r, RETRY_AFTER_MS));
    }
  }
}
