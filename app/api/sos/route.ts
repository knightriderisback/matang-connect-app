import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

/**
 * Live sos_alerts columns (001 schema):
 * id, raised_by, type, status, city_id, message, created_at
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sos_alerts")
    .select("id, raised_by, type, status, city_id, message, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ alerts: [], error: error.message });
  return NextResponse.json({ alerts: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const type = String(body.type || "medical").toLowerCase().slice(0, 40);
  const details = body.details || body.message || {};

  const supabase = createAdminClient();

  let cityId: string | null = session.cityId || null;
  try {
    const { data: requester } = await supabase
      .from("users")
      .select("city_id")
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

  // Only real columns — never invent alert_type / user_id / notes
  const attempts: Record<string, unknown>[] = [
    {
      raised_by: session.userId,
      type,
      status: "active",
      city_id: cityId,
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
  ];

  let saved: any = null;
  let lastError = "";

  for (const row of attempts) {
    const { data, error } = await supabase
      .from("sos_alerts")
      .insert(row)
      .select("id, raised_by, type, status, city_id, message, created_at")
      .maybeSingle();
    if (!error && data) {
      saved = data;
      break;
    }
    lastError = error?.message || lastError;
    // If table missing, stop early
    if (lastError && /does not exist|schema cache/i.test(lastError) && /sos_alerts/i.test(lastError)) {
      break;
    }
  }

  if (!saved) {
    console.error("SOS insert failed:", lastError);
    return NextResponse.json(
      {
        error: "Could not raise SOS alert",
        detail:
          lastError ||
          "sos_alerts insert failed. In Supabase run: CREATE TABLE IF NOT EXISTS sos_alerts (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, raised_by uuid REFERENCES users(id), type text, status text DEFAULT 'active', city_id uuid, message text, created_at timestamptz DEFAULT now());",
      },
      { status: 500 }
    );
  }

  await writeAuditLog({
    actorId: session.userId,
    action: "sos_" + type,
    targetId: saved.id,
    meta: typeof details === "object" ? (details as object) : { message },
  });

  return NextResponse.json({ success: true, alert: saved });
}
