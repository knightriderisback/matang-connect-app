import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const state = String(body.state || "").trim();
  if (!name || !state) {
    return NextResponse.json({ error: "name and state required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("cities")
    .select("id, name, state")
    .eq("name", name)
    .eq("state", state)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ city: existing, created: false });
  }

  const { data, error } = await supabase
    .from("cities")
    .insert({ name, state, is_active: true })
    .select("id, name, state")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ city: data, created: true });
}
