import { db } from "@/lib/db";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
}

// In-memory fallback ONLY for local development when DATABASE_URL is not configured
const devMemoryFallback = new Map<string, { count: number; expiresAt: number }>();

/**
 * Shared serverless-compatible rate limiter.
 * Persists attempts to Neon PostgreSQL (rate_limits table) atomically across Vercel function instances.
 * Production must not fall back to process-memory-only rate limiting.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 5,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const isProduction = process.env.NODE_ENV === "production";
  const resetAt = new Date(Date.now() + windowSeconds * 1000);

  // If no DATABASE_URL is set:
  if (!process.env.DATABASE_URL) {
    if (isProduction) {
      // In production, missing database configuration fails closed safely
      console.error("CRITICAL: Rate limiter invoked in production without DATABASE_URL.");
      return { success: false, remaining: 0, resetAt };
    }
    // Development-only local memory fallback
    const record = devMemoryFallback.get(key);
    if (record && record.expiresAt > Date.now()) {
      if (record.count >= limit) {
        return { success: false, remaining: 0, resetAt: new Date(record.expiresAt) };
      }
      record.count += 1;
      return { success: true, remaining: limit - record.count, resetAt: new Date(record.expiresAt) };
    }
    devMemoryFallback.set(key, { count: 1, expiresAt: resetAt.getTime() });
    return { success: true, remaining: limit - 1, resetAt };
  }

  try {
    // Atomic PostgreSQL upsert and increment
    const rows = await db.$queryRaw<Array<{ count: number; expires_at: Date }>>`
      INSERT INTO rate_limits (key, count, expires_at)
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT (key) DO UPDATE
      SET 
        count = CASE 
          WHEN rate_limits.expires_at > NOW() THEN rate_limits.count + 1 
          ELSE 1 
        END,
        expires_at = CASE 
          WHEN rate_limits.expires_at > NOW() THEN rate_limits.expires_at 
          ELSE ${resetAt} 
        END
      RETURNING count, expires_at;
    `;

    const row = rows[0];
    const currentCount = row ? row.count : limit;
    const expiresAt = row ? new Date(row.expires_at) : resetAt;

    if (currentCount > limit) {
      return {
        success: false,
        remaining: 0,
        resetAt: expiresAt,
      };
    }

    return {
      success: true,
      remaining: Math.max(0, limit - currentCount),
      resetAt: expiresAt,
    };
  } catch (error) {
    console.error("Rate limit database check error:", error);

    if (isProduction) {
      // In production, do not silently fallback to process memory. Fail closed safely.
      return {
        success: false,
        remaining: 0,
        resetAt,
      };
    }

    // Development fallback on transient database error
    const record = devMemoryFallback.get(key);
    if (record && record.expiresAt > Date.now()) {
      if (record.count >= limit) {
        return { success: false, remaining: 0, resetAt: new Date(record.expiresAt) };
      }
      record.count += 1;
      return { success: true, remaining: limit - record.count, resetAt: new Date(record.expiresAt) };
    }
    devMemoryFallback.set(key, { count: 1, expiresAt: resetAt.getTime() });
    return { success: true, remaining: limit - 1, resetAt };
  }
}
