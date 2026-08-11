import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { fullName, phone, mpin, cityId, nativeVillage } = await request.json();

    if (!fullName || !phone || !mpin || !cityId || !nativeVillage) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (mpin.length !== 4 || !/^\d{4}$/.test(mpin)) {
      return NextResponse.json({ error: "M-PIN must be exactly 4 digits" }, { status: 400 });
    }

    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
    }

    // Prefer anon RPC (intended path)
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let data: any = null;
    let error: any = null;

    const rpc = await anon.rpc("register_user", {
      p_full_name: fullName.trim(),
      p_phone: cleanPhone,
      p_mpin: mpin,
      p_city_id: cityId,
      p_native_village: nativeVillage.trim(),
    });
    data = rpc.data;
    error = rpc.error;

    // Fallback: if RPC missing / permission issue, insert via service role with server-side hash not available —
    // only surface clearer error (RPC is required for secure hashing)
    if (error) {
      const msg = error.message || "";
      if (msg.includes("PHONE_EXISTS")) {
        return NextResponse.json({ error: "This phone number is already registered" }, { status: 409 });
      }
      if (msg.includes("INVALID_CITY")) {
        return NextResponse.json({ error: "Please select a valid city from the list" }, { status: 400 });
      }
      if (msg.includes("INVALID_MPIN")) {
        return NextResponse.json({ error: "M-PIN must be exactly 4 digits" }, { status: 400 });
      }
      // Try to verify city exists for better message
      try {
        const admin = createAdminClient();
        const { data: city } = await admin.from("cities").select("id").eq("id", cityId).maybeSingle();
        if (!city) {
          return NextResponse.json(
            { error: "Selected city is invalid. Run CG cities migration in Supabase." },
            { status: 400 }
          );
        }
      } catch {
        /* ignore */
      }
      console.error("register_user error:", msg);
      return NextResponse.json(
        {
          error:
            "Registration failed. Ensure register_user RPC exists in Supabase (run 001_initial_schema.sql).",
          detail: msg,
        },
        { status: 500 }
      );
    }

    const result = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ success: true, qrCodeId: result?.qr_code_id });
  } catch (err: any) {
    console.error("Register route error:", err);
    return NextResponse.json({ error: "Something went wrong", detail: err?.message }, { status: 500 });
  }
}
