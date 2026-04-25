/**
 * Tiny in-memory throttle + cache for /api/translate calls.
 *
 * Why we need it: each MessageItem in a busy channel kicks off its own
 * `/api/translate` fetch from the auto-translate effect. With the agent
 * backend (5–15 s per call) that fan-out can saturate the browser's
 * 6-connection-per-origin pool — every other request (including the
 * user's own message-send) waits behind 30+ pending translates.
 *
 * Two guards:
 *   1. Concurrency limit (default 2 in-flight). Codex on the desktop
 *      runs three commands in parallel, but the bottleneck for the
 *      user is "can my next click also reach the API?" — so we keep
 *      most of the pool free for non-translate traffic.
 *   2. Cache by `text + targetLang`. Re-rendering the same message
 *      list (scroll, focus shift) won't re-translate the same string.
 */

type Translator = <T>(path: string, options: { method: string; body: unknown }) => Promise<T>;

interface TranslateRequest {
  text: string;
  targetLang: string;
}

interface TranslateResult {
  translatedText: string | null;
  runtime: {
    status: 'available' | 'mock' | 'disabled' | 'unavailable';
    issue?: string;
  };
}

const cache = new Map<string, Promise<TranslateResult>>();

const MAX_IN_FLIGHT = 2;
let inFlight = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      inFlight += 1;
      resolve();
    });
  });
}

function release(): void {
  inFlight -= 1;
  const next = waiters.shift();
  if (next) next();
}

function key(req: TranslateRequest): string {
  return `${req.targetLang}|${req.text}`;
}

/**
 * Run a translate request through the shared throttle + cache. Pass a
 * thin `apiCall` so the helper stays free of import cycles with the
 * `api` helper in `lib/api.ts`.
 */
export function throttledTranslate(
  req: TranslateRequest,
  apiCall: Translator,
): Promise<TranslateResult> {
  const k = key(req);
  const cached = cache.get(k);
  if (cached) return cached;

  const promise = (async () => {
    await acquire();
    try {
      return await apiCall<TranslateResult>('/api/translate', {
        method: 'POST',
        body: { text: req.text, targetLang: req.targetLang },
      });
    } finally {
      release();
    }
  })();

  cache.set(k, promise);
  // If the request fails, drop it from the cache so a retry can run.
  promise.catch(() => {
    if (cache.get(k) === promise) cache.delete(k);
  });
  return promise;
}
