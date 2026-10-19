import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Volunteer assisted entry: phone se member dhundho (city-scoped, super admin global).
export async function GET(request: NextRequest) {
  const auth = await requireAuth(["volunteer", "core_committee", "super_admin"]);
  if (!auth.session) return auth.response;
  const session = auth.session;

  const phone = (request.nextUrl.searchParams.get("phone") || "").replace(/\D/g, "").slice(-10);
  if (phone.length !== 10) {
    return NextResponse.json({ error: "Enter a valid 10-digit phone" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, full_name, city_id")
    .eq("phone", phone)
    .maybeSingle();
  if (!user) return NextResponse.json({ error: "No member found with this phone" }, { status: 404 });

  if (session.role !== "super_admin" && session.cityId && user.city_id !== session.cityId) {
    return NextResponse.json({ error: "This member belongs to another city" }, { status: 403 });
  }
  return NextResponse.json({ user: { id: user.id, full_name: user.full_name } });
}
