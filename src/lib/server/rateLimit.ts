/**
 * Minimal in-memory rate limiter.
 *
 * Good enough to stop one signed-in user hammering the test-email button. It is
 * per-instance, so it is not a real defence across serverless instances — a
 * shared store would be needed for that.
 */
export function createRateLimit(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  return {
    allow(key: string): boolean {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter(
        (time) => now - time < windowMs,
      );

      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }

      recent.push(now);
      hits.set(key, recent);
      return true;
    },
  };
}

export const sendEmailRateLimit = createRateLimit(3, 60_000);
