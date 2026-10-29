import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME, SessionPayload } from "./session";

export async function getSession(
  req?: { cookies: { get: (name: string) => { value?: string } | undefined } }
): Promise<SessionPayload | null> {
  let token: string | undefined;
  if (req?.cookies?.get) {
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  }
  if (!token) {
    try {
      token = cookies().get(SESSION_COOKIE_NAME)?.value;
    } catch {
      token = undefined;
    }
  }
  if (!token) return null;
  return verifySessionToken(token);
}

export const ADMIN_ROLES = ["core_committee", "super_admin"] as const;
export const STAFF_ROLES = ["volunteer", "core_committee", "super_admin"] as const;
