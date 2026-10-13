import { db } from "@/lib/db";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
}

// In-memory fallback if database is offline or not yet connected
const memoryFallback = new Map<string, { count: number; expiresAt: number }>();

/**
 * Shared serverless-compatible rate limiter.
 * Persists attempts to Neon PostgreSQL (rate_limits table) across Vercel function instances.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 5,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  // If no DATABASE_URL is set, use local fallback
  if (!process.env.DATABASE_URL) {
    const record = memoryFallback.get(key);
    if (record && record.expiresAt > Date.now()) {
      if (record.count >= limit) {
        return { success: false, remaining: 0, resetAt: new Date(record.expiresAt) };
      }
      record.count += 1;
      return { success: true, remaining: limit - record.count, resetAt: new Date(record.expiresAt) };
    }
    memoryFallback.set(key, { count: 1, expiresAt: resetAt.getTime() });
    return { success: true, remaining: limit - 1, resetAt };
  }

  try {
    const existing = await db.rateLimit.findUnique({ where: { key } });

    if (existing && existing.expiresAt > now) {
      if (existing.count >= limit) {
        return {
          success: false,
          remaining: 0,
          resetAt: existing.expiresAt,
        };
      }

      const updated = await db.rateLimit.update({
        where: { key },
        data: { count: { increment: 1 } },
      });

      return {
        success: true,
        remaining: Math.max(0, limit - updated.count),
        resetAt: existing.expiresAt,
      };
    }

    // Insert or reset expired record
    const record = await db.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, expiresAt: resetAt },
      update: { count: 1, expiresAt: resetAt },
    });

    return {
      success: true,
      remaining: limit - 1,
      resetAt: record.expiresAt,
    };
  } catch (error) {
    console.warn("Rate limit database check failed, falling back to memory:", error);
    // Graceful fallback to memory on transient DB error
    const record = memoryFallback.get(key);
    if (record && record.expiresAt > Date.now()) {
      if (record.count >= limit) {
        return { success: false, remaining: 0, resetAt: new Date(record.expiresAt) };
      }
      record.count += 1;
      return { success: true, remaining: limit - record.count, resetAt: new Date(record.expiresAt) };
    }
    memoryFallback.set(key, { count: 1, expiresAt: resetAt.getTime() });
    return { success: true, remaining: limit - 1, resetAt };
  }
}
