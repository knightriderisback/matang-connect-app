import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import bcrypt from "bcryptjs";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fullName = String(body.fullName || body.full_name || "").trim();
    const mpin = String(body.mpin || body.m_pin || "");
    const cityId = body.cityId || body.city_id;
    const nativeVillage = String(body.nativeVillage || body.native_village || "").trim();
    const cleanPhone = String(body.phone || "").replace(/\D/g, "").slice(-10);

    if (!fullName || !cleanPhone || !mpin || !cityId || !nativeVillage) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(mpin)) {
      return NextResponse.json({ error: "M-PIN must be exactly 4 digits" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: city } = await admin.from("cities").select("id").eq("id", cityId).maybeSingle();
    if (!city) {
      return NextResponse.json(
        { error: "Selected city is invalid. Pick a city from the list." },
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

    const hash = await bcrypt.hash(mpin, 10);
    const qr =
      "MATANG-" +
      Math.random().toString(36).slice(2, 8).toUpperCase() +
      Date.now().toString(36).slice(-4).toUpperCase();

    // Only columns that exist on live users table
    const baseRow = {
      full_name: fullName,
      phone: cleanPhone,
      m_pin_hash: hash,
      city_id: cityId,
      native_village: nativeVillage,
      qr_code_id: qr,
      role: "normal",
      verification_status: "pending",
    };

    let { data: created, error: insErr } = await admin
      .from("users")
      .insert(baseRow)
      .select("id, full_name, role, city_id, qr_code_id, verification_status")
      .single();

    // Retry without optional columns if schema cache complains
    if (insErr) {
      console.warn("register insert retry:", insErr.message);
      const minimal = {
        full_name: fullName,
        phone: cleanPhone,
        m_pin_hash: hash,
        city_id: cityId,
        native_village: nativeVillage,
        role: "normal",
        verification_status: "pending",
      };
      ({ data: created, error: insErr } = await admin
        .from("users")
        .insert(minimal)
        .select("id, full_name, role, city_id, qr_code_id, verification_status")
        .single());
    }

    if (insErr || !created) {
      return NextResponse.json(
        { error: "Registration failed: " + (insErr?.message || "unknown") },
        { status: 500 }
      );
    }

    await writeAuditLog({ actorId: created.id, action: "user_registered", targetId: created.id, meta: { phone: cleanPhone } });

    const token = await createSessionToken({
      userId: created.id,
      role: (created.role as any) || "normal",
      cityId: created.city_id,
      fullName: created.full_name,
    });

    const response = NextResponse.json({
      success: true,
      qrCodeId: created.qr_code_id || qr,
      autoLogin: true,
      user: {
        id: created.id,
        fullName: created.full_name,
        role: created.role,
      },
      message: "Registered and logged in.",
    });
    response.cookies.set(sessionCookieOptions.name, token, sessionCookieOptions);
    return response;
  } catch (err: any) {
    console.error("Register route error:", err);
    return NextResponse.json({ error: "Something went wrong", detail: err?.message }, { status: 500 });
  }
}
