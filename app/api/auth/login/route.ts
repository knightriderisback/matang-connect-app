import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { phone, mpin } = await request.json();

    if (!phone || !mpin) {
      return NextResponse.json({ error: "Phone and M-PIN are required" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(mpin)) {
      return NextResponse.json({ error: "M-PIN must be exactly 4 digits" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("login_with_mpin", {
      p_phone: cleanPhone,
      p_mpin: mpin,
    });

    if (error) {
      if (error.message?.includes("ACCOUNT_LOCKED")) {
        return NextResponse.json(
          { error: "Account temporarily locked. Try again after 15 minutes." },
          { status: 429 }
        );
      }
      console.error("login_with_mpin error:", error.message);
      return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }

    const user = data?.[0];
    if (!user) {
      return NextResponse.json({ error: "Invalid phone number or M-PIN" }, { status: 401 });
    }

    if (user.verification_status !== "verified") {
      return NextResponse.json(
        { error: "Your account is pending verification by a volunteer or committee member." },
        { status: 403 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      role: user.role,
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
      },
    });

    response.cookies.set(sessionCookieOptions.name, token, sessionCookieOptions);
    return response;
  } catch (err) {
    console.error("Login route error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
