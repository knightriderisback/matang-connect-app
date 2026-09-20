import { NextResponse } from "next/server";
import { getSession } from "./getSession";
import type { SessionPayload } from "./session";

type Role = SessionPayload["role"];

type AuthResult =
  | { session: SessionPayload; response: null }
  | { session: null; response: NextResponse };

/**
 * Centralized auth guard for API routes.
 *
 * Usage:
 *   const auth = await requireAuth();
 *   if (!auth.session) return auth.response;
 *   const { session } = auth;
 *
 * With role restriction:
 *   const auth = await requireAuth(["volunteer", "core_committee", "super_admin"]);
 *   if (!auth.session) return auth.response;
 *
 * This does not replace getSession() anywhere automatically — existing
 * routes keep working exactly as before. Routes can migrate to this
 * one at a time, whenever convenient, with zero behavior change for
 * routes that already check role/session correctly.
 */
export async function requireAuth(allowedRoles?: readonly Role[]): Promise<AuthResult> {
  const session = await getSession();

  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return {
      session: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, response: null };
}
