import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

async function loadPollsResilient(supabase: any, session: any) {
  // Try full schema, then minimal
  const attempts = [
    () =>
      supabase
        .from("polls")
        .select("id, question, options, is_active, ends_at, is_global, city_id, created_at, created_by")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20),
    () =>
      supabase
        .from("polls")
        .select("id, question, options, ends_at, city_id, created_at, created_by")
        .order("created_at", { ascending: false })
        .limit(20),
    () =>
      supabase
        .from("polls")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
  ];

  let polls: any[] = [];
  let lastErr = "";
  for (const run of attempts) {
    const { data, error } = await run();
    if (!error) {
      polls = data || [];
      lastErr = "";
      break;
    }
    lastErr = error.message;
  }

  // app_settings fallback store
  if (!polls.length) {
    const { data: sett } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "polls_store")
      .maybeSingle();
    if (Array.isArray(sett?.setting_value)) {
      polls = sett.setting_value.filter((p: any) => p && p.is_active !== false).slice(0, 20);
    }
  }

  if (session.role !== "super_admin" && session.cityId) {
    polls = polls.filter(
      (p) => p.is_global || !p.city_id || p.city_id === session.cityId
    );
  }

  const result = [];
  for (const p of polls) {
    let counts: number[] = Array(Array.isArray(p.options) ? p.options.length : 0).fill(0);
    let myVote: number | null = null;
    let total = 0;
    if (p.id && !String(p.id).startsWith("local_")) {
      const { data: votes } = await supabase
        .from("poll_votes")
        .select("option_index, user_id")
        .eq("poll_id", p.id);
      (votes || []).forEach((v: any) => {
        if (v.option_index >= 0 && v.option_index < counts.length) counts[v.option_index]++;
        if (v.user_id === session.userId) myVote = v.option_index;
      });
      total = (votes || []).length;
    } else if (p.votes && typeof p.votes === "object") {
      // settings-store votes: { userId: optionIndex }
      Object.entries(p.votes).forEach(([uid, idx]) => {
        const i = Number(idx);
        if (i >= 0 && i < counts.length) counts[i]++;
        if (uid === session.userId) myVote = i;
      });
      total = Object.keys(p.votes).length;
    }
    result.push({
      ...p,
      is_active: p.is_active !== false,
      vote_counts: counts,
      total_votes: total,
      my_vote: myVote,
    });
  }
  return { polls: result, error: lastErr || undefined };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  const { polls, error } = await loadPollsResilient(supabase, session);
  return NextResponse.json({ polls, error });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();

  // Vote
  if (body.action === "vote") {
    if (body.poll_id == null || body.option_index == null) {
      return NextResponse.json({ error: "poll_id and option_index required" }, { status: 400 });
    }
    // Settings-store poll
    if (String(body.poll_id).startsWith("local_")) {
      const { data: sett } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "polls_store")
        .maybeSingle();
      const list = Array.isArray(sett?.setting_value) ? [...sett.setting_value] : [];
      const idx = list.findIndex((p: any) => p.id === body.poll_id);
      if (idx < 0) return NextResponse.json({ error: "Poll not found" }, { status: 404 });
      const poll = { ...list[idx] };
      poll.votes = { ...(poll.votes || {}), [session.userId]: body.option_index };
      list[idx] = poll;
      await supabase
        .from("app_settings")
        .upsert({ setting_key: "polls_store", setting_value: list }, { onConflict: "setting_key" });
      return NextResponse.json({ success: true });
    }

    const { data: poll } = await supabase.from("polls").select("*").eq("id", body.poll_id).maybeSingle();
    if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    if (poll.is_active === false) {
      return NextResponse.json({ error: "Poll not active" }, { status: 400 });
    }
    const opts = Array.isArray(poll.options) ? poll.options : [];
    if (body.option_index < 0 || body.option_index >= opts.length) {
      return NextResponse.json({ error: "Invalid option" }, { status: 400 });
    }
    const { error } = await supabase.from("poll_votes").upsert(
      {
        poll_id: body.poll_id,
        user_id: session.userId,
        option_index: body.option_index,
      },
      { onConflict: "poll_id,user_id" }
    );
    if (error) {
      // try plain insert
      const ins = await supabase.from("poll_votes").insert({
        poll_id: body.poll_id,
        user_id: session.userId,
        option_index: body.option_index,
      });
      if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Create
  if (!STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  if (!body.question || !Array.isArray(body.options) || body.options.length < 2) {
    return NextResponse.json({ error: "Question and at least 2 options required" }, { status: 400 });
  }

  const options = body.options.slice(0, 6).map((o: any) => String(o).slice(0, 120));
  const base: any = {
    question: String(body.question).slice(0, 300),
    options,
    created_by: session.userId,
    city_id: session.cityId || null,
  };

  const tries = [
    { ...base, is_active: true, is_global: !!body.is_global && session.role === "super_admin", ends_at: body.ends_at || null },
    { ...base, is_active: true },
    { ...base },
  ];

  let data: any = null;
  let lastError = "";
  for (const row of tries) {
    const r = await supabase.from("polls").insert(row).select().single();
    if (!r.error) {
      data = r.data;
      break;
    }
    lastError = r.error.message;
  }

  if (!data) {
    // Ultimate fallback: app_settings store
    const local = {
      id: `local_${Date.now()}`,
      ...base,
      is_active: true,
      is_global: false,
      created_at: new Date().toISOString(),
      votes: {},
    };
    const { data: sett } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "polls_store")
      .maybeSingle();
    const list = Array.isArray(sett?.setting_value) ? sett.setting_value : [];
    list.unshift(local);
    const up = await supabase
      .from("app_settings")
      .upsert({ setting_key: "polls_store", setting_value: list.slice(0, 40) }, { onConflict: "setting_key" });
    if (up.error) {
      return NextResponse.json(
        { error: lastError || up.error.message, hint: "Create polls table (stage3_tables.sql)" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, poll: local, stored: "app_settings" });
  }

  try {
    await supabase.from("audit_logs").insert({
      actor_id: session.userId,
      action: "poll_create",
      target_id: data.id,
    });
  } catch {
    /* ignore */
  }

  return NextResponse.json({ success: true, poll: data });
}
