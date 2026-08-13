import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fullName = body.fullName || body.full_name;
    const phone = body.phone;
    const mpin = body.mpin || body.m_pin;
    const cityId = body.cityId || body.city_id;
    const nativeVillage = body.nativeVillage || body.native_village;

    if (!fullName || !phone || !mpin || !cityId || !nativeVillage) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (String(mpin).length !== 4 || !/^\d{4}$/.test(String(mpin))) {
      return NextResponse.json({ error: "M-PIN must be exactly 4 digits" }, { status: 400 });
    }

    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
    }

    // 1) Prefer RPC
    try {
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await anon.rpc("register_user", {
        p_full_name: String(fullName).trim(),
        p_phone: cleanPhone,
        p_mpin: String(mpin),
        p_city_id: cityId,
        p_native_village: String(nativeVillage).trim(),
      });
      if (!error) {
        const result = Array.isArray(data) ? data[0] : data;
        return NextResponse.json({
          success: true,
          qrCodeId: result?.qr_code_id,
          message: "Registered. You can login now (verification pending is OK).",
        });
      }
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
      console.warn("register_user RPC:", msg);
    } catch (e: any) {
      console.warn("register RPC exception:", e?.message);
    }

    // 2) Fallback: direct insert via service role
    const admin = createAdminClient();

    const { data: city } = await admin
      .from("cities")
      .select("id")
      .eq("id", cityId)
      .maybeSingle();
    if (!city) {
      return NextResponse.json(
        { error: "Selected city is invalid. Ensure cities exist in Supabase." },
        { status: 400 }
      );
    }

    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("phone", cleanPhone)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "This phone number is already registered" }, { status: 409 });
    }

    const hash = await bcrypt.hash(String(mpin), 10);
    const qr =
      "MATANG-" +
      Math.random().toString(36).slice(2, 8).toUpperCase() +
      Date.now().toString(36).slice(-4).toUpperCase();

    const { data: created, error: insErr } = await admin
      .from("users")
      .insert({
        full_name: String(fullName).trim(),
        phone: cleanPhone,
        m_pin_hash: hash,
        city_id: cityId,
        native_village: String(nativeVillage).trim(),
        qr_code_id: qr,
        role: "normal",
        verification_status: "pending",
      })
      .select("id, qr_code_id")
      .single();

    if (insErr) {
      console.error("register insert:", insErr.message);
      return NextResponse.json(
        { error: "Registration failed: " + insErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      qrCodeId: created?.qr_code_id || qr,
      message: "Registered. You can login with your phone + M-PIN.",
    });
  } catch (err: any) {
    console.error("Register route error:", err);
    return NextResponse.json({ error: "Something went wrong", detail: err?.message }, { status: 500 });
  }
}
