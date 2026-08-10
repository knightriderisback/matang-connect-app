import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME, SessionPayload } from "./session";

/**
 * Reads and verifies the signed session cookie on the server.
 * Returns null if there is no valid session — callers must handle
 * the unauthenticated case themselves (this does NOT redirect).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const ADMIN_ROLES = ["core_committee", "super_admin"] as const;
export const STAFF_ROLES = ["volunteer", "core_committee", "super_admin"] as const;
