/**
 * In-memory login rate limiter: blocks a key (e.g. an email address) after
 * too many failed attempts within a window.
 *
 * This is per-process state — it resets on restart and does not coordinate
 * across multiple instances. Fine for a single Railway replica; swap for a
 * shared store (e.g. Redis) before scaling horizontally.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_KEYS = 10_000;

type Entry = { count: number; windowStart: number };

const attempts = new Map<string, Entry>();

function sweepExpired(now: number) {
  for (const [key, entry] of attempts) {
    if (now - entry.windowStart > WINDOW_MS) attempts.delete(key);
  }
}

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry) return true;
  if (now - entry.windowStart > WINDOW_MS) {
    attempts.delete(key);
    return true;
  }
  return entry.count < MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  if (attempts.size > MAX_TRACKED_KEYS) sweepExpired(now);

  const entry = attempts.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

export function clearRateLimit(key: string): void {
  attempts.delete(key);
}
