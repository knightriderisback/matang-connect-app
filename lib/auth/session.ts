import { SignJWT, jwtVerify } from "jose";

function getSecretKey(): Uint8Array {
  const secretKey = process.env.APP_SESSION_SECRET;
  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      // Avoid hard crash during `next build` page collection; fail at runtime token ops
      console.error(
        "APP_SESSION_SECRET is not set. Set it in Vercel env (openssl rand -base64 32)."
      );
    } else {
      console.warn(
        "APP_SESSION_SECRET is not set. Using insecure fallback — set it in .env.local."
      );
    }
  }
  return new TextEncoder().encode(
    secretKey || "dev-insecure-fallback-key-do-not-use-in-prod"
  );
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
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
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
