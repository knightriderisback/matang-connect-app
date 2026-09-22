import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { writeAuditLog } from "../audit";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const IP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_REQUESTS_PER_IP = 30; // Max 30 requests per 15 min per IP

// Pre-hashed dummy bcrypt string for constant-time comparison against non-existent accounts.
// Hash of "0000" with 10 salt rounds ($2a$10$...)
const DUMMY_BCRYPT_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

// In-memory sliding window IP rate limiter
interface IpEntry {
  timestamps: number[];
}
const ipAttempts = new Map<string, IpEntry>();

// In-memory lockout and attempt tracking fallback (cross-protection against DB delays / thin schemas)
interface MemoryLockoutEntry {
  lockedUntil: number; // timestamp in ms
  attempts: number;
  lastAttempt: number;
}
const memoryTrackers = new Map<string, MemoryLockoutEntry>();

// Concurrency mutex: In-process serialization per account identifier (phone number)
const accountMutexes = new Map<string, Promise<unknown>>();

/**
 * Prunes expired entries from in-memory caches to prevent unbounded memory growth.
 */
function pruneCaches() {
  const now = Date.now();
  if (ipAttempts.size > 2000) {
    ipAttempts.forEach((entry, ip) => {
      entry.timestamps = entry.timestamps.filter((ts: number) => now - ts < IP_RATE_LIMIT_WINDOW_MS);
      if (entry.timestamps.length === 0) {
        ipAttempts.delete(ip);
      }
    });
  }
  if (memoryTrackers.size > 2000) {
    memoryTrackers.forEach((entry, key) => {
      if (entry.lockedUntil < now && now - entry.lastAttempt > IP_RATE_LIMIT_WINDOW_MS) {
        memoryTrackers.delete(key);
      }
    });
  }
}

/**
 * Extracts client IP address from standard reverse-proxy headers or socket address.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Checks sliding-window IP rate limiting to mitigate distributed brute-force / password spraying.
 */
export function checkIpRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  pruneCaches();
  const now = Date.now();
  let entry = ipAttempts.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    ipAttempts.set(ip, entry);
  }

  // Filter timestamps within the current sliding window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < IP_RATE_LIMIT_WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS_PER_IP) {
    const oldest = entry.timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + IP_RATE_LIMIT_WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  entry.timestamps.push(now);
  return { allowed: true };
}

/**
 * Serializes execution of async operations for a given identifier within the current process.
 * Prevents TOCTOU race conditions where multiple concurrent requests from the same user read
 * identical attempt counters before any write commits.
 */
export async function withAccountLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const current = accountMutexes.get(key) || Promise.resolve();
  let release: () => void = () => {};
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  accountMutexes.set(
    key,
    current.then(
      () => next,
      () => next
    )
  );

  try {
    await current;
    return await fn();
  } finally {
    release();
    if (accountMutexes.get(key) === next) {
      accountMutexes.delete(key);
    }
  }
}

/**
 * Evaluates whether an account is currently locked, checking both database fields and in-memory fallback.
 */
export function checkAccountLockout(
  user: { failed_mpin_attempts?: number | null; mpin_locked_until?: string | null } | null,
  identifier?: string
): { isLocked: boolean; remainingMinutes?: number; lockedUntil?: string } {
  const now = Date.now();
  let lockExpiryMs = 0;

  // 1. Check persistent database column
  if (user?.mpin_locked_until) {
    const dbLockTime = new Date(user.mpin_locked_until).getTime();
    if (!isNaN(dbLockTime) && dbLockTime > now) {
      lockExpiryMs = Math.max(lockExpiryMs, dbLockTime);
    }
  }

  // 2. Check in-memory fallback tracker
  if (identifier) {
    const mem = memoryTrackers.get(identifier);
    if (mem && mem.lockedUntil > now) {
      lockExpiryMs = Math.max(lockExpiryMs, mem.lockedUntil);
    }
  }

  if (lockExpiryMs > now) {
    const remainingMinutes = Math.max(1, Math.ceil((lockExpiryMs - now) / 60000));
    return {
      isLocked: true,
      remainingMinutes,
      lockedUntil: new Date(lockExpiryMs).toISOString(),
    };
  }

  return { isLocked: false };
}

/**
 * Performs a dummy bcrypt comparison so request timing is identical for existing vs non-existent accounts.
 */
export async function performDummyHashComparison(inputMpin: string): Promise<void> {
  try {
    await bcrypt.compare(String(inputMpin), DUMMY_BCRYPT_HASH);
  } catch {
    // Ignore dummy check errors
  }
}

/**
 * Handles failed attempts for non-existent accounts to mirror lockout behavior in memory.
 * Ensures an attacker cannot detect account existence through repeated failed attempt probes.
 */
export function recordNonexistentAccountFailure(cleanPhone: string): { isLocked: boolean; remainingMinutes?: number } {
  pruneCaches();
  const now = Date.now();
  let mem = memoryTrackers.get(cleanPhone);
  if (!mem) {
    mem = { attempts: 0, lockedUntil: 0, lastAttempt: now };
    memoryTrackers.set(cleanPhone, mem);
  }

  if (mem.lockedUntil > now) {
    const remainingMinutes = Math.max(1, Math.ceil((mem.lockedUntil - now) / 60000));
    return { isLocked: true, remainingMinutes };
  }

  // If previous lock expired, reset counter
  if (mem.lockedUntil > 0 && mem.lockedUntil <= now) {
    mem.attempts = 0;
    mem.lockedUntil = 0;
  }

  mem.attempts += 1;
  mem.lastAttempt = now;

  if (mem.attempts >= MAX_FAILED_ATTEMPTS) {
    mem.lockedUntil = now + LOCKOUT_DURATION_MS;
    return { isLocked: true, remainingMinutes: 15 };
  }

  return { isLocked: false };
}

/**
 * Records a failed M-PIN attempt for an existing user.
 * Increments failed_mpin_attempts and sets mpin_locked_until if threshold (5) is reached.
 */
export async function recordFailedAttempt(
  adminClient: any,
  user: { id: string; failed_mpin_attempts?: number | null; mpin_locked_until?: string | null },
  ip: string,
  identifier?: string
): Promise<{
  locked: boolean;
  remainingAttempts: number;
  remainingMinutes?: number;
  lockedUntil?: string;
}> {
  const now = Date.now();
  let currentAttempts = typeof user.failed_mpin_attempts === "number" ? user.failed_mpin_attempts : 0;

  // If previous lockout expired, reset attempt count for the new cycle
  if (user.mpin_locked_until && new Date(user.mpin_locked_until).getTime() <= now) {
    currentAttempts = 0;
  }

  const newAttempts = currentAttempts + 1;

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockExpiryMs = now + LOCKOUT_DURATION_MS;
    const lockedUntilIso = new Date(lockExpiryMs).toISOString();

    // 1. Update in-memory fallback
    if (identifier) {
      memoryTrackers.set(identifier, {
        attempts: newAttempts,
        lockedUntil: lockExpiryMs,
        lastAttempt: now,
      });
    }
    memoryTrackers.set(user.id, {
      attempts: newAttempts,
      lockedUntil: lockExpiryMs,
      lastAttempt: now,
    });

    // 2. Persist to database
    try {
      await adminClient
        .from("users")
        .update({
          failed_mpin_attempts: newAttempts,
          mpin_locked_until: lockedUntilIso,
        })
        .eq("id", user.id);
    } catch (dbErr) {
      console.error("Failed to update lockout columns in users table:", dbErr);
    }

    // 3. Write audit log
    await writeAuditLog({
      actorId: user.id,
      action: "account_locked_failed_mpin",
      targetId: user.id,
      meta: { attempts: newAttempts, lockoutMinutes: 15, ip },
    });

    return {
      locked: true,
      remainingAttempts: 0,
      remainingMinutes: 15,
      lockedUntil: lockedUntilIso,
    };
  }

  // Not yet reached threshold
  if (identifier) {
    const mem = memoryTrackers.get(identifier) || { attempts: 0, lockedUntil: 0, lastAttempt: now };
    mem.attempts = newAttempts;
    mem.lastAttempt = now;
    memoryTrackers.set(identifier, mem);
  }

  try {
    await adminClient
      .from("users")
      .update({
        failed_mpin_attempts: newAttempts,
      })
      .eq("id", user.id);
  } catch (dbErr) {
    console.error("Failed to update failed_mpin_attempts in users table:", dbErr);
  }

  return {
    locked: false,
    remainingAttempts: MAX_FAILED_ATTEMPTS - newAttempts,
  };
}

/**
 * Resets failed attempts and unlocks the account upon successful authentication or admin reset.
 */
export async function resetAccountLockout(
  adminClient: any,
  userId: string,
  identifier?: string
): Promise<void> {
  // Clear in-memory fallback
  if (identifier) {
    memoryTrackers.delete(identifier);
  }
  memoryTrackers.delete(userId);

  // Clear database state
  try {
    await adminClient
      .from("users")
      .update({
        failed_mpin_attempts: 0,
        mpin_locked_until: null,
      })
      .eq("id", userId);
  } catch (dbErr) {
    console.error("Failed to reset failed_mpin_attempts in users table:", dbErr);
  }
}

/**
 * Test/reset helper for verifying rate limiter state.
 */
export function _resetRateLimitStateForTesting() {
  ipAttempts.clear();
  memoryTrackers.clear();
  accountMutexes.clear();
}
