import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sos_alerts")
    .select("id, raised_by, type, status, city_id, message, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ alerts: [], error: error.message });
  }
  return NextResponse.json({ alerts: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const type = String(body.type || "medical").toLowerCase().slice(0, 40);
  const details = body.details || body.message || {};

  const supabase = createAdminClient();
  let cityId = session.cityId;
  try {
    const { data: requester } = await supabase
      .from("users")
      .select("city_id, full_name, phone")
      .eq("id", session.userId)
      .maybeSingle();
    if (requester?.city_id) cityId = requester.city_id;
  } catch {
    /* ignore */
  }

  const message =
    typeof details === "object"
      ? JSON.stringify(details).slice(0, 2000)
      : String(details).slice(0, 2000);

  // Try inserts with progressive column sets (live schema may differ)
  const attempts: Record<string, unknown>[] = [
    {
      raised_by: session.userId,
      type,
      status: "active",
      city_id: cityId || null,
      message,
    },
    {
      raised_by: session.userId,
      type,
      status: "active",
      message,
    },
    {
      raised_by: session.userId,
      type,
      message,
    },
    // alternate column names some schemas use
    {
      user_id: session.userId,
      alert_type: type,
      status: "active",
      notes: message,
    },
  ];

  let saved: any = null;
  let lastError = "";

  for (const row of attempts) {
    const { data, error } = await supabase
      .from("sos_alerts")
      .insert(row)
      .select("*")
      .maybeSingle();
    if (!error && data) {
      saved = data;
      break;
    }
    lastError = error?.message || lastError;
  }

  if (!saved) {
    console.error("SOS insert failed:", lastError);
    return NextResponse.json(
      {
        error: "Could not raise SOS alert",
        detail: lastError || "sos_alerts insert failed — check table exists in Supabase",
      },
      { status: 500 }
    );
  }

  await writeAuditLog({
    actorId: session.userId,
    action: "sos_" + type,
    targetId: saved.id,
    meta: typeof details === "object" ? details : { message },
  });

  return NextResponse.json({ success: true, alert: saved });
}
