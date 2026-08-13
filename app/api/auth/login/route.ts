import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

type AuthUser = {
  id: string;
  full_name: string;
  role: string;
  city_id: string | null;
  qr_code_id: string | null;
  verification_status: string;
  m_pin_hash?: string;
  mpin_locked_until?: string | null;
  failed_mpin_attempts?: number;
};

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

    let user: AuthUser | null = null;

    // 1) Prefer secure RPC (pgcrypto crypt)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabase.rpc("login_with_mpin", {
        p_phone: cleanPhone,
        p_mpin: String(mpin),
      });
      if (error) {
        if (error.message?.includes("ACCOUNT_LOCKED")) {
          return NextResponse.json(
            { error: "Account temporarily locked. Try again after 15 minutes." },
            { status: 429 }
          );
        }
        console.warn("login_with_mpin RPC:", error.message);
      } else if (data?.[0]) {
        user = data[0] as AuthUser;
      }
    } catch (e: any) {
      console.warn("login RPC exception:", e?.message);
    }

    // 2) Fallback: service role + bcrypt compare (works if RPC missing / bcryptjs hashes)
    if (!user) {
      try {
        const admin = createAdminClient();
        const { data: row } = await admin
          .from("users")
          .select(
            "id, full_name, role, city_id, qr_code_id, verification_status, m_pin_hash, mpin_locked_until, failed_mpin_attempts"
          )
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (!row) {
          return NextResponse.json({ error: "Invalid phone number or M-PIN" }, { status: 401 });
        }

        if (row.mpin_locked_until && new Date(row.mpin_locked_until) > new Date()) {
          return NextResponse.json(
            { error: "Account temporarily locked. Try again after 15 minutes." },
            { status: 429 }
          );
        }

        const hash = row.m_pin_hash || "";
        let ok = false;
        try {
          ok = await bcrypt.compare(String(mpin), hash);
        } catch {
          ok = false;
        }

        if (!ok) {
          const fails = (row.failed_mpin_attempts || 0) + 1;
          await admin
            .from("users")
            .update({
              failed_mpin_attempts: fails,
              mpin_locked_until: fails >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
            })
            .eq("id", row.id);
          return NextResponse.json({ error: "Invalid phone number or M-PIN" }, { status: 401 });
        }

        await admin
          .from("users")
          .update({ failed_mpin_attempts: 0, mpin_locked_until: null })
          .eq("id", row.id);

        user = {
          id: row.id,
          full_name: row.full_name,
          role: row.role,
          city_id: row.city_id,
          qr_code_id: row.qr_code_id,
          verification_status: row.verification_status,
        };
      } catch (e: any) {
        console.error("login fallback error:", e?.message);
        return NextResponse.json({ error: "Login failed", detail: e?.message }, { status: 500 });
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid phone number or M-PIN" }, { status: 401 });
    }

    // Pending members CAN login (pilot) — verification is soft trust flag, not hard block
    const token = await createSessionToken({
      userId: user.id,
      role: user.role as any,
      cityId: user.city_id,
      fullName: user.full_name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        role: user.role,
        qrCodeId: user.qr_code_id,
        verificationStatus: user.verification_status,
      },
      pendingVerification: user.verification_status !== "verified",
    });

    response.cookies.set(sessionCookieOptions.name, token, sessionCookieOptions);
    return response;
  } catch (err: any) {
    console.error("Login route error:", err);
    return NextResponse.json({ error: "Something went wrong", detail: err?.message }, { status: 500 });
  }
}
