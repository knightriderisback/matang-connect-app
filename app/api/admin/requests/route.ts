/** LOCKED — All Requests inbox */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Unified inbox for all app requests (polls, future modules, etc.)
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!["volunteer", "core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Staff only — Volunteer / Core / Super Admin" }, { status: 403 });
  }

  const supabase = createAdminClient();

  // Feature flag (global + personal override)
  if (session.role !== "super_admin") {
    const { data: globalRow } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "admin_requests_enabled")
      .maybeSingle();
    let enabled = true;
    if (globalRow && globalRow.setting_value !== undefined && globalRow.setting_value !== null) {
      const v = globalRow.setting_value;
      enabled = v === true || v === "true" || v === 1;
    }
    const { data: mem } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", `member_flags:${session.userId}`)
      .maybeSingle();
    const ov = mem?.setting_value;
    if (ov && typeof ov === "object" && "admin_requests_enabled" in ov) {
      enabled = Boolean((ov as any).admin_requests_enabled);
    }
    if (!enabled) {
      return NextResponse.json({ error: "All Requests disabled", requests: [], pending: [] }, { status: 403 });
    }
  }
  const requests: any[] = [];

  // 1) Poll vote-change requests
  {
    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "poll_vote_change_requests")
      .maybeSingle();
    const list = Array.isArray(data?.setting_value) ? data.setting_value : [];
    for (const r of list) {
      requests.push({
        id: r.id,
        type: "poll_vote_change",
        type_label: "Poll vote change",
        status: r.status || "pending",
        user_id: r.user_id,
        created_at: r.created_at,
        meta: {
          poll_id: r.poll_id,
          from_index: r.from_index,
          option_index: r.option_index,
          reason: r.reason,
        },
        source: "polls",
        href: "/polls",
      });
    }
  }

  // 2) Generic queue (future: matrimony contact, care help, etc.)
  {
    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "unified_requests")
      .maybeSingle();
    const list = Array.isArray(data?.setting_value) ? data.setting_value : [];
    for (const r of list) {
      requests.push({
        id: r.id,
        type: r.type || "generic",
        type_label: r.type_label || r.type || "Request",
        status: r.status || "pending",
        user_id: r.user_id,
        created_at: r.created_at,
        meta: r.meta || {},
        source: r.source || "app",
        href: r.href || "/admin/requests",
      });
    }
  }

  // 3) Pending user verifications as requests
  {
    const { data: pending } = await supabase
      .from("users")
      .select("id, full_name, phone, created_at, verification_status")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false })
      .limit(40);
    for (const u of pending || []) {
      requests.push({
        id: `verify_${u.id}`,
        type: "user_verify",
        type_label: "User verification",
        status: "pending",
        user_id: u.id,
        user_name: u.full_name,
        created_at: u.created_at,
        meta: { phone: u.phone },
        source: "registration",
        href: "/admin/verify",
      });
    }
  }

  // Attach missing names
  const needNames = requests.filter((r) => !r.user_name && r.user_id).map((r) => r.user_id);
  if (needNames.length) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", Array.from(new Set(needNames)));
    const map: Record<string, string> = {};
    (users || []).forEach((u: any) => {
      map[u.id] = u.full_name;
    });
    requests.forEach((r) => {
      if (!r.user_name && r.user_id) r.user_name = map[r.user_id] || "Member";
    });
  }

  requests.sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });

  const pending = requests.filter((r) => r.status === "pending");
  return NextResponse.json({
    requests,
    pending_count: pending.length,
    pending,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Core / Super Admin only for resolve" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));

  // Proxy poll resolve
  if (body.type === "poll_vote_change" && body.request_id) {
    const base = request.nextUrl.origin;
    const res = await fetch(`${base}/api/polls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        action: "resolve_change",
        request_id: body.request_id,
        decision: body.decision || "accept",
      }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
