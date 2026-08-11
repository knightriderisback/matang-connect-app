import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Public read-only member card by QR ID — no phone exposed */
export async function GET(request: NextRequest) {
  const qr = request.nextUrl.searchParams.get("qr")?.trim();
  if (!qr) return NextResponse.json({ error: "QR required" }, { status: 400 });

  let code = qr;
  const urlMatch = qr.match(/\/u\/([A-Z0-9\-]+)/i);
  if (urlMatch) code = urlMatch[1];
  code = code.toUpperCase();

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select(
        "full_name, native_village, verification_status, role, qr_code_id, photo_url, cities(name)"
      )
      .eq("qr_code_id", code)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Never expose phone on public endpoint
    return NextResponse.json({ member: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
