import { SignJWT, jwtVerify } from "jose";

// Set a strong random value in your environment (.env.local / Vercel env):
// APP_SESSION_SECRET=<openssl rand -base64 32>
const secretKey = process.env.APP_SESSION_SECRET;
if (!secretKey) {
  // Fail loudly in dev rather than silently signing with an empty key.
  console.warn(
    "APP_SESSION_SECRET is not set. Set it in .env.local before using auth."
  );
}
const encodedKey = new TextEncoder().encode(secretKey || "dev-insecure-fallback-key");

export interface SessionPayload {
  userId: string;
  role: "normal" | "volunteer" | "core_committee" | "super_admin";
  cityId: string | null;
  fullName: string;
}

const SESSION_COOKIE_NAME = "matang_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(encodedKey);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey);
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
