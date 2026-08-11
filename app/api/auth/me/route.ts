import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: user, error } = await supabase
    .from("users")
    .select(
      "id, full_name, phone, role, city_id, native_village, verification_status, qr_code_id, photo_url, created_at, cities(name)"
    )
    .eq("id", session.userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
