import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Session user ke hi draft par kaam hota hai; client se user id kabhi nahi li jaati.
export async function GET() {
  const auth = await requireAuth();
  if (!auth.session) return auth.response;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("parivar_form_drafts")
    .select("data, current_step, updated_at")
    .eq("user_id", auth.session.userId)
    .maybeSingle();
  return NextResponse.json({ draft: data ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.session) return auth.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const payload = body?.data;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid draft" }, { status: 400 });
  }
  if (JSON.stringify(payload).length > 200_000) {
    return NextResponse.json({ error: "Draft too large" }, { status: 413 });
  }
  const step = Number.isInteger(body.step) && body.step >= 0 && body.step < 100 ? body.step : 0;

  const supabase = createAdminClient();
  const { error } = await supabase.from("parivar_form_drafts").upsert({
    user_id: auth.session.userId,
    data: payload,
    current_step: step,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("draft save error:", error.message);
    return NextResponse.json({ error: "Could not save draft" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const auth = await requireAuth();
  if (!auth.session) return auth.response;
  const supabase = createAdminClient();
  await supabase.from("parivar_form_drafts").delete().eq("user_id", auth.session.userId);
  return NextResponse.json({ success: true });
}
