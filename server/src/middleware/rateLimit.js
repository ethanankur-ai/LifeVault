// Caps how often one logged-in user can call an endpoint (used on the AI routes, which cost money per call).
// ponytail: counts live in this server instance's memory, so on Vercel each warm instance counts separately.
// Good enough to stop a script hammering Gemini; use a shared store (Upstash/Redis) if you need exact limits.
export function rateLimit(max, windowMs = 60_000) {
  const hits = new Map(); // user id → timestamps of recent calls
  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.user.id) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      res.set('Retry-After', String(Math.ceil((recent[0] + windowMs - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
    }
    recent.push(now);
    hits.set(req.user.id, recent);
    if (hits.size > 10_000) hits.clear(); // cheap guard against unbounded growth
    next();
  };
}
