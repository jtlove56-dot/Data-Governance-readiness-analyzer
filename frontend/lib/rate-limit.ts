import "server-only";

export const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_AUTH_LIMIT = 10;

// Request times per key, ordered by each key's latest request so idle keys sit at the front.
const hits = new Map<string, number[]>();

/**
 * Sliding-window limiter held in this server instance's memory. It slows bursts from one visitor;
 * Supabase Auth enforces its own project-wide limits behind it.
 */
export function allowRequest(key: string, limit: number, now = Date.now()) {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (hits.get(key) ?? []).filter((time) => time > cutoff);
  const allowed = recent.length < limit;
  if (allowed) recent.push(now);
  hits.delete(key);
  if (recent.length) hits.set(key, recent);
  for (const [idleKey, times] of hits) {
    if (times[times.length - 1] > cutoff) break;
    hits.delete(idleKey);
  }
  return allowed;
}

export function resetRateLimits() {
  hits.clear();
}

/** Attempts allowed per visitor, per account route, per minute. */
export function authRateLimit() {
  const configured = Number.parseInt(process.env.AUTH_RATE_LIMIT_PER_MINUTE ?? "", 10);
  return configured > 0 ? configured : DEFAULT_AUTH_LIMIT;
}

/** The visitor's address. The hosting platform sets the first X-Forwarded-For entry. */
export function clientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
