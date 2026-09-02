import { NextRequest } from "next/server";

/**
 * Minimal in-process fixed-window rate limiter.
 *
 * Good enough for a single long-running host or low-traffic serverless.
 * For horizontally-scaled production, swap the Map for a shared store
 * (Upstash Redis, etc.) — the call sites stay the same.
 */

type Entry = { count: number; reset: number };
const buckets = new Map<string, Entry>();

// Keep the map from growing unbounded on a long-lived process.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
}

export interface RateResult {
  ok: boolean;
  retryAfter: number; // seconds
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateResult {
  const now = Date.now();
  sweep(now);
  const entry = buckets.get(key);

  if (!entry || now > entry.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP for keying limits. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
