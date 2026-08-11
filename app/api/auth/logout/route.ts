import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(sessionCookieOptions.name, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  return response;
}
