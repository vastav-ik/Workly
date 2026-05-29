import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const DEFAULT_MAX = 60;
const DEFAULT_WINDOW_MS = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 30_000);

export function rateLimiter(maxRequests = DEFAULT_MAX, windowMs = DEFAULT_WINDOW_MS) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Remaining", String(maxRequests - 1));
      next();
      return;
    }

    entry.count++;

    if (entry.count > maxRequests) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    res.setHeader("X-RateLimit-Remaining", String(maxRequests - entry.count));
    next();
  };
}

export function sanitizeInput(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}
