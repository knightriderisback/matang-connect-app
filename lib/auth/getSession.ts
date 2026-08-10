import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME, SessionPayload } from "./session";

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const ADMIN_ROLES = ["core_committee", "super_admin"] as const;
export const STAFF_ROLES = ["volunteer", "core_committee", "super_admin"] as const;
