import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

const ALLOWED = ["interested", "en_route", "arrived", "completed", "fake", "cancelled"] as const;

type RespRow = {
  responder_id: string;
  status: string;
  full_name?: string;
  phone?: string;
  role?: string;
  updated_at: string;
};

async function loadFallback(
  supabase: ReturnType<typeof createAdminClient>,
  alertId: string
): Promise<RespRow[]> {
  const key = `sos_responses:${alertId}`;
  const { data } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", key)
    .maybeSingle();
  const v = data?.setting_value;
  if (Array.isArray(v)) return v as RespRow[];
  if (v && typeof v === "object" && Array.isArray((v as any).items)) {
    return (v as any).items as RespRow[];
  }
  return [];
}

async function saveFallback(
  supabase: ReturnType<typeof createAdminClient>,
  alertId: string,
  rows: RespRow[],
  actorId: string
) {
  const key = `sos_responses:${alertId}`;
  const payload = {
    setting_key: key,
    setting_value: rows,
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  };
  let { error } = await supabase.from("app_settings").upsert(payload, {
    onConflict: "setting_key",
  });
  if (error) {
    await supabase.from("app_settings").delete().eq("setting_key", key);
    ({ error } = await supabase.from("app_settings").insert(payload));
  }
  return error;
}

/** POST — volunteer/core respond to SOS (works without sos_responses table) */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json(
      { error: "Only volunteer / core committee / super admin can respond" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const alertId = body.alertId || body.alert_id;
  const status = String(body.status || "interested").slice(0, 40);
  if (!alertId) {
    return NextResponse.json({ error: "alertId required" }, { status: 400 });
  }
  const st = ALLOWED.includes(status as any) ? status : "interested";

  const supabase = createAdminClient();

  // Load responder profile for display
  let fullName = session.fullName || "Staff";
  let phone = "";
  try {
    const { data: u } = await supabase
      .from("users")
      .select("full_name, phone")
      .eq("id", session.userId)
      .maybeSingle();
    if (u?.full_name) fullName = u.full_name;
    if (u?.phone) phone = u.phone;
  } catch {
    /* ignore */
  }

  let usedTable = false;
  let row: any = null;

  // 1) Prefer sos_responses table if it exists
  try {
    const { data: existing, error: selErr } = await supabase
      .from("sos_responses")
      .select("id")
      .eq("alert_id", alertId)
      .eq("responder_id", session.userId)
      .maybeSingle();

    if (!selErr) {
      if (existing?.id) {
        const { data, error } = await supabase
          .from("sos_responses")
          .update({ status: st, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .select("*")
          .maybeSingle();
        if (!error && data) {
          row = data;
          usedTable = true;
        }
      } else {
        const { data, error } = await supabase
          .from("sos_responses")
          .insert({
            alert_id: alertId,
            responder_id: session.userId,
            status: st,
          })
          .select("*")
          .maybeSingle();
        if (!error && data) {
          row = data;
          usedTable = true;
        }
      }
    }
  } catch {
    /* table missing */
  }

  // 2) Fallback: app_settings JSON list
  if (!usedTable) {
    const list = await loadFallback(supabase, alertId);
    const now = new Date().toISOString();
    const idx = list.findIndex((r) => r.responder_id === session.userId);
    const entry: RespRow = {
      responder_id: session.userId,
      status: st,
      full_name: fullName,
      phone,
      role: session.role,
      updated_at: now,
    };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);

    const err = await saveFallback(supabase, alertId, list, session.userId);
    if (err) {
      return NextResponse.json(
        {
          error: "Could not save response: " + err.message,
          hint: "Ensure app_settings exists, or run supabase/sos_responses.sql",
        },
        { status: 500 }
      );
    }
    row = entry;
  }

  // Update parent alert status
  if (st === "completed") {
    await supabase.from("sos_alerts").update({ status: "resolved" }).eq("id", alertId);
  } else if (st === "fake") {
    await supabase.from("sos_alerts").update({ status: "fake" }).eq("id", alertId);
  } else if (st === "en_route" || st === "arrived" || st === "interested") {
    await supabase.from("sos_alerts").update({ status: "in_progress" }).eq("id", alertId);
  }

  await writeAuditLog({
    actorId: session.userId,
    action: "sos_response_" + st,
    targetId: String(alertId),
    meta: { status: st, name: fullName },
  });

  return NextResponse.json({
    success: true,
    response: row,
    storage: usedTable ? "sos_responses" : "app_settings",
  });
}
