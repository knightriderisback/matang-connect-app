import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { fullName, phone, mpin, cityId, nativeVillage } = await request.json();

    if (!fullName || !phone || !mpin || !cityId || !nativeVillage) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (mpin.length !== 4 || !/^\d{4}$/.test(mpin)) {
      return NextResponse.json({ error: "M-PIN must be exactly 4 digits" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("register_user", {
      p_full_name: fullName,
      p_phone: phone.replace(/\D/g, "").slice(-10),
      p_mpin: mpin,
      p_city_id: cityId,
      p_native_village: nativeVillage,
    });

    if (error) {
      if (error.message?.includes("PHONE_EXISTS")) {
        return NextResponse.json({ error: "This phone number is already registered" }, { status: 409 });
      }
      if (error.message?.includes("INVALID_CITY")) {
        return NextResponse.json({ error: "Please select a valid city" }, { status: 400 });
      }
      console.error("register_user error:", error.message);
      return NextResponse.json({ error: "Registration failed: " + error.message }, { status: 500 });
    }

    const result = data?.[0];
    return NextResponse.json({ success: true, qrCodeId: result?.qr_code_id });
  } catch (err) {
    console.error("Register route error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
