import { Request, Response, NextFunction } from 'express';

/**
 * In-memory rate limiter middleware.
 *
 * Enabled via RATE_LIMIT_ENABLED=true env var.
 * Default limits are defined in config defaults below.
 *
 * Returns HTTP 429 when the request count exceeds the window limit.
 */

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX ?? '60', 10);

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

/** Clears the in-memory store — intended for use in tests only. */
export function resetStore(): void {
  store.clear();
}

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  if (process.env.RATE_LIMIT_ENABLED !== 'true') {
    next();
    return;
  }

  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({ success: false, error: 'Too many requests, please try again later.' });
    return;
  }

  next();
}
