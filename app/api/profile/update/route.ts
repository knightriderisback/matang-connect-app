import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { full_name, native_village } = await request.json();
  if (!full_name?.trim() || !native_village?.trim()) {
    return NextResponse.json({ error: "Name and village required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ full_name: full_name.trim(), native_village: native_village.trim() })
    .eq("id", session.userId);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action: "profile_update",
    target_id: session.userId,
  });

  return NextResponse.json({ success: true });
}
