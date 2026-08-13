import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { phone, mpin } = await request.json();
    if (!phone || !mpin) {
      return NextResponse.json({ error: "Phone and M-PIN are required" }, { status: 400 });
    }
    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(String(mpin))) {
      return NextResponse.json({ error: "M-PIN must be exactly 4 digits" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Select only core columns (avoid missing optional columns in schema cache)
    let { data: row, error } = await admin
      .from("users")
      .select("id, full_name, role, city_id, qr_code_id, verification_status, m_pin_hash")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (error) {
      console.error("login select:", error.message);
      return NextResponse.json({ error: "Login failed", detail: error.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Invalid phone number or M-PIN" }, { status: 401 });
    }

    const hash = row.m_pin_hash || "";
    let ok = false;
    if (hash) {
      try {
        ok = await bcrypt.compare(String(mpin), hash);
      } catch {
        ok = false;
      }
    }

    if (!ok) {
      return NextResponse.json({ error: "Invalid phone number or M-PIN" }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: row.id,
      role: row.role as any,
      cityId: row.city_id,
      fullName: row.full_name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: row.id,
        fullName: row.full_name,
        role: row.role,
        qrCodeId: row.qr_code_id,
        verificationStatus: row.verification_status,
      },
      pendingVerification: row.verification_status !== "verified",
    });
    response.cookies.set(sessionCookieOptions.name, token, sessionCookieOptions);
    return response;
  } catch (err: any) {
    console.error("Login route error:", err);
    return NextResponse.json({ error: "Something went wrong", detail: err?.message }, { status: 500 });
  }
}
