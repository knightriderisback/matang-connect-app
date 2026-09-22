import { SignJWT, jwtVerify } from "jose";

function getSecretKey(): Uint8Array {
  const secretKey = process.env.APP_SESSION_SECRET;
  if (!secretKey || secretKey.trim().length === 0) {
    throw new Error(
      "FATAL: APP_SESSION_SECRET environment variable is missing or empty. " +
      "Server-side JWT operations require APP_SESSION_SECRET to be configured in environment variables (e.g., .env.local or Vercel env)."
    );
  }
  return new TextEncoder().encode(secretKey);
}

export interface SessionPayload {
  userId: string;
  role: "normal" | "volunteer" | "core_committee" | "super_admin";
  cityId: string | null;
  fullName: string;
}

const SESSION_COOKIE_NAME = "matang_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  const secret = getSecretKey();
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};

export { SESSION_COOKIE_NAME };
