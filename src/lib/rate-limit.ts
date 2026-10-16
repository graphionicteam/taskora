import { db } from "@/lib/db";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
}

// In-memory fallback tracking for resilient rate limiting across environments
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

/**
 * Shared serverless-compatible and mobile-app-ready rate limiter.
 * Protects endpoints from brute-force while ensuring legitimate users
 * and mobile applications are never locked out due to transient DB issues.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 15,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const resetAt = new Date(Date.now() + windowSeconds * 1000);

  // If no DATABASE_URL is configured, use in-memory rate limiting
  if (!process.env.DATABASE_URL) {
    return checkMemoryLimit(key, limit, resetAt);
  }

  try {
    // Clean, standard Prisma query that works reliably across all databases and serverless runtimes
    const now = new Date();
    const existing = await db.rateLimit.findUnique({
      where: { key },
    });

    if (!existing || existing.expiresAt <= now) {
      // First attempt or window expired: reset counter
      await db.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, expiresAt: resetAt },
        update: { count: 1, expiresAt: resetAt },
      });
      return { success: true, remaining: limit - 1, resetAt };
    }

    // Inside active window: check if exceeded
    if (existing.count >= limit) {
      return {
        success: false,
        remaining: 0,
        resetAt: existing.expiresAt,
      };
    }

    // Increment count
    const updated = await db.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return {
      success: true,
      remaining: Math.max(0, limit - updated.count),
      resetAt: existing.expiresAt,
    };
  } catch (error) {
    // Graceful degradation: transient DB/network issues do not block legitimate logins
    console.warn("Rate limit DB check warning (falling back to memory):", error);
    return checkMemoryLimit(key, limit, resetAt);
  }
}

/**
 * Resets rate limit for a specific key upon successful authentication.
 * Ensures verified users start with a clean slate across web and future mobile apps.
 */
export async function resetRateLimit(key: string): Promise<void> {
  memoryStore.delete(key);
  if (!process.env.DATABASE_URL) return;

  try {
    await db.rateLimit.deleteMany({
      where: { key },
    });
  } catch {
    // Silently ignore deletion error if key was already cleaned up
  }
}

function checkMemoryLimit(
  key: string,
  limit: number,
  resetAt: Date
): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (record && record.expiresAt > now) {
    if (record.count >= limit) {
      return { success: false, remaining: 0, resetAt: new Date(record.expiresAt) };
    }
    record.count += 1;
    return {
      success: true,
      remaining: Math.max(0, limit - record.count),
      resetAt: new Date(record.expiresAt),
    };
  }

  memoryStore.set(key, { count: 1, expiresAt: resetAt.getTime() });
  return { success: true, remaining: limit - 1, resetAt };
}
