import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

async function ensureTables(supabase: ReturnType<typeof createAdminClient>) {
  // Best-effort: if tables missing, inserts will surface clear errors
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = createAdminClient();
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const { data: alert, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !alert) {
      return NextResponse.json({ error: error?.message || "Not found" }, { status: 404 });
    }
    let raiser: any = null;
    if (alert.raised_by) {
      const { data: u } = await supabase
        .from("users")
        .select("id, full_name, phone, native_village, role")
        .eq("id", alert.raised_by)
        .maybeSingle();
      raiser = u;
    }
    let responsesWithNames: any[] = [];
    const { data: responses, error: respErr } = await supabase
      .from("sos_responses")
      .select("*")
      .eq("alert_id", id)
      .order("created_at", { ascending: false });
    if (!respErr && responses?.length) {
      for (const r of responses) {
        const { data: u } = await supabase
          .from("users")
          .select("full_name, phone, role")
          .eq("id", r.responder_id)
          .maybeSingle();
        responsesWithNames.push({ ...r, responder: u });
      }
    } else {
      // Fallback list from app_settings
      const { data: fb } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", `sos_responses:${id}`)
        .maybeSingle();
      const raw = fb?.setting_value;
      const list = Array.isArray(raw) ? raw : [];
      responsesWithNames = list.map((r: any) => ({
        id: r.responder_id + r.updated_at,
        alert_id: id,
        responder_id: r.responder_id,
        status: r.status,
        created_at: r.updated_at,
        responder: {
          full_name: r.full_name,
          phone: r.phone,
          role: r.role,
        },
      }));
    }
    return NextResponse.json({ alert, raiser, responses: responsesWithNames });
  }

  const { data, error } = await supabase
    .from("sos_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) return NextResponse.json({ alerts: [], error: error.message });

  // Enrich with raiser name
  const alerts = [];
  for (const a of data || []) {
    let name = "";
    if (a.raised_by) {
      const { data: u } = await supabase
        .from("users")
        .select("full_name, phone")
        .eq("id", a.raised_by)
        .maybeSingle();
      name = u?.full_name || "";
    }
    alerts.push({ ...a, raiser_name: name });
  }
  return NextResponse.json({ alerts });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const type = String(body.type || "medical").toLowerCase().slice(0, 40);
  const details = body.details || {};
  const lat = body.lat != null ? Number(body.lat) : null;
  const lng = body.lng != null ? Number(body.lng) : null;

  const supabase = createAdminClient();

  let cityId: string | null = session.cityId || null;
  let fullName = session.fullName || "Member";
  let phone = "";
  try {
    const { data: requester } = await supabase
      .from("users")
      .select("city_id, full_name, phone")
      .eq("id", session.userId)
      .maybeSingle();
    if (requester?.city_id) cityId = requester.city_id;
    if (requester?.full_name) fullName = requester.full_name;
    if (requester?.phone) phone = requester.phone;
  } catch {
    /* ignore */
  }

  const detailObj =
    typeof details === "object" && details
      ? { ...details, lat, lng, phone, name: fullName }
      : { note: String(details), lat, lng, phone, name: fullName };

  const message = JSON.stringify(detailObj).slice(0, 2500);
  const mapsLink =
    lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
      ? `https://maps.google.com/?q=${lat},${lng}`
      : null;

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
      .select("*")
      .maybeSingle();
    if (!error && data) {
      saved = data;
      break;
    }
    lastError = error?.message || lastError;
  }

  if (!saved) {
    return NextResponse.json(
      { error: "Could not raise SOS alert", detail: lastError },
      { status: 500 }
    );
  }

  // Feed short card via notices (so Home feed shows it)
  const feedTitle =
    type === "blood"
      ? `🩸 Blood needed — ${detailObj.group || ""}`
      : type === "medicine"
        ? `💊 Medicine help — ${detailObj.medicine || ""}`
        : `🚨 SOS Emergency — ${fullName}`;
  const feedBody =
    type === "medical"
      ? `${fullName} needs urgent help.${mapsLink ? `\n📍 ${mapsLink}` : ""}\nOpen SOS for details & to respond.`
      : type === "blood"
        ? `Group: ${detailObj.group || "-"} · Units: ${detailObj.units || "-"} · ${detailObj.location || ""}${mapsLink ? `\n📍 ${mapsLink}` : ""}`
        : `Medicine: ${detailObj.medicine || "-"} · ${detailObj.location || ""}${mapsLink ? `\n📍 ${mapsLink}` : ""}`;

  try {
    await supabase.from("notices").insert({
      title: feedTitle.slice(0, 120),
      content: feedBody.slice(0, 2000),
      type: type === "medical" ? "urgent" : "urgent",
      posted_by: session.userId,
      city_id: cityId,
    });
  } catch {
    /* feed optional */
  }

  // In-app notifications for staff (volunteer + core + super) in same city / all staff
  try {
    const { data: staff } = await supabase
      .from("users")
      .select("id, role")
      .in("role", ["volunteer", "core_committee", "super_admin"])
      .limit(200);
    const rows = (staff || [])
      .filter((u) => u.id !== session.userId)
      .map((u) => ({
        user_id: u.id,
        title: feedTitle.slice(0, 100),
        body: feedBody.slice(0, 300),
        type: "sos",
        ref_id: saved.id,
        is_read: false,
      }));
    if (rows.length) {
      // notifications table may not exist — ignore fail
      await supabase.from("notifications").insert(rows);
    }
  } catch {
    /* optional */
  }

  await writeAuditLog({
    actorId: session.userId,
    action: "sos_" + type,
    targetId: saved.id,
    meta: { type, lat, lng },
  });

  return NextResponse.json({
    success: true,
    alert: saved,
    mapsLink,
    shareWhatsApp: type === "blood" || type === "medicine",
    feedPosted: true,
  });
}

/** Volunteer/core: respond / update status on an alert */
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!STAFF_ROLES.includes(session.role as any) && session.role !== "super_admin") {
    // allow any logged-in to show interest? User said volunteer and core
    if (!["volunteer", "core_committee", "super_admin"].includes(session.role)) {
      return NextResponse.json({ error: "Staff only to respond" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const alertId = body.alertId || body.alert_id;
  const status = String(body.status || "interested").slice(0, 40);
  // interested | en_route | arrived | completed | fake | cancelled
  if (!alertId) return NextResponse.json({ error: "alertId required" }, { status: 400 });

  const supabase = createAdminClient();
  const allowed = ["interested", "en_route", "arrived", "completed", "fake", "cancelled"];
  const st = allowed.includes(status) ? status : "interested";

  // upsert-like: try insert response
  const { data: existing } = await supabase
    .from("sos_responses")
    .select("id")
    .eq("alert_id", alertId)
    .eq("responder_id", session.userId)
    .maybeSingle();

  let row;
  if (existing?.id) {
    const { data, error } = await supabase
      .from("sos_responses")
      .update({ status: st, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    row = data;
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
    if (error) {
      // table may not exist
      return NextResponse.json(
        {
          error: error.message,
          hint: "Create sos_responses table in Supabase (see migration note)",
        },
        { status: 500 }
      );
    }
    row = data;
  }

  // Update alert status when completed / fake
  if (st === "completed" || st === "fake") {
    await supabase
      .from("sos_alerts")
      .update({ status: st === "fake" ? "fake" : "resolved" })
      .eq("id", alertId);
  } else if (st === "en_route" || st === "arrived") {
    await supabase.from("sos_alerts").update({ status: "in_progress" }).eq("id", alertId);
  }

  await writeAuditLog({
    actorId: session.userId,
    action: "sos_response_" + st,
    targetId: alertId,
  });

  return NextResponse.json({ success: true, response: row });
}
