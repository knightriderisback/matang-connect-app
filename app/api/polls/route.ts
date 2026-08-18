import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

const CHANGE_REQ_KEY = "poll_vote_change_requests";

async function loadPollsResilient(supabase: any, session: any) {
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
      supabase.from("polls").select("*").order("created_at", { ascending: false }).limit(20),
  ];

  let polls: any[] = [];
  for (const run of attempts) {
    const { data, error } = await run();
    if (!error) {
      polls = data || [];
      break;
    }
  }

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
    polls = polls.filter((p) => p.is_global || !p.city_id || p.city_id === session.cityId);
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
      vote_locked: myVote != null,
    });
  }
  return result;
}

async function getChangeRequests(supabase: any): Promise<any[]> {
  const { data } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", CHANGE_REQ_KEY)
    .maybeSingle();
  return Array.isArray(data?.setting_value) ? data.setting_value : [];
}

async function saveChangeRequests(supabase: any, list: any[]) {
  await supabase.from("app_settings").upsert(
    { setting_key: CHANGE_REQ_KEY, setting_value: list.slice(0, 80) },
    { onConflict: "setting_key" }
  );
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  const polls = await loadPollsResilient(supabase, session);

  let change_requests: any[] = [];
  if (["core_committee", "super_admin"].includes(session.role)) {
    const raw = await getChangeRequests(supabase);
    change_requests = raw.filter((r: any) => r.status === "pending");
    // attach names
    const ids = Array.from(
      new Set(change_requests.flatMap((r: any) => [r.user_id, r.poll_id]).filter(Boolean))
    );
    const userIds = change_requests.map((r: any) => r.user_id).filter(Boolean);
    if (userIds.length) {
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", userIds);
      const map: Record<string, string> = {};
      (users || []).forEach((u) => {
        map[u.id] = u.full_name;
      });
      change_requests = change_requests.map((r: any) => ({
        ...r,
        user_name: map[r.user_id] || "Member",
      }));
    }
  }

  // user's pending requests
  const allReq = await getChangeRequests(supabase);
  const my_requests = allReq.filter(
    (r: any) => r.user_id === session.userId && r.status === "pending"
  );

  return NextResponse.json({ polls, change_requests, my_requests });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();

  // --- request vote change ---
  if (body.action === "request_change") {
    if (body.poll_id == null || body.option_index == null) {
      return NextResponse.json({ error: "poll_id and new option_index required" }, { status: 400 });
    }
    const list = await getChangeRequests(supabase);
    const exists = list.find(
      (r: any) =>
        r.user_id === session.userId &&
        r.poll_id === body.poll_id &&
        r.status === "pending"
    );
    if (exists) {
      return NextResponse.json({ error: "Change request already pending" }, { status: 400 });
    }
    list.unshift({
      id: `pcr_${Date.now()}`,
      poll_id: body.poll_id,
      user_id: session.userId,
      from_index: body.from_index ?? null,
      option_index: body.option_index,
      reason: String(body.reason || "").slice(0, 200),
      status: "pending",
      created_at: new Date().toISOString(),
    });
    await saveChangeRequests(supabase, list);
    return NextResponse.json({
      success: true,
      message: "Request sent to Core Committee / Super Admin",
    });
  }

  // --- resolve change (core / super only) ---
  if (body.action === "resolve_change") {
    if (!["core_committee", "super_admin"].includes(session.role)) {
      return NextResponse.json({ error: "Core Committee or Super Admin only" }, { status: 403 });
    }
    const list = await getChangeRequests(supabase);
    const idx = list.findIndex((r: any) => r.id === body.request_id);
    if (idx < 0) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    const req = list[idx];
    if (req.status !== "pending") {
      return NextResponse.json({ error: "Already resolved" }, { status: 400 });
    }

    if (body.decision === "accept") {
      // apply new vote
      if (String(req.poll_id).startsWith("local_")) {
        const { data: sett } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "polls_store")
          .maybeSingle();
        const polls = Array.isArray(sett?.setting_value) ? [...sett.setting_value] : [];
        const pi = polls.findIndex((p: any) => p.id === req.poll_id);
        if (pi >= 0) {
          polls[pi] = {
            ...polls[pi],
            votes: { ...(polls[pi].votes || {}), [req.user_id]: req.option_index },
          };
          await supabase
            .from("app_settings")
            .upsert(
              { setting_key: "polls_store", setting_value: polls },
              { onConflict: "setting_key" }
            );
        }
      } else {
        await supabase.from("poll_votes").upsert(
          {
            poll_id: req.poll_id,
            user_id: req.user_id,
            option_index: req.option_index,
          },
          { onConflict: "poll_id,user_id" }
        );
      }
      list[idx] = {
        ...req,
        status: "accepted",
        resolved_by: session.userId,
        resolved_at: new Date().toISOString(),
      };
    } else {
      list[idx] = {
        ...req,
        status: "rejected",
        resolved_by: session.userId,
        resolved_at: new Date().toISOString(),
      };
    }
    await saveChangeRequests(supabase, list);
    return NextResponse.json({ success: true, status: list[idx].status });
  }

  // --- vote (locked after first) ---
  if (body.action === "vote") {
    if (body.poll_id == null || body.option_index == null) {
      return NextResponse.json({ error: "poll_id and option_index required" }, { status: 400 });
    }

    // local store
    if (String(body.poll_id).startsWith("local_")) {
      const { data: sett } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "polls_store")
        .maybeSingle();
      const list = Array.isArray(sett?.setting_value) ? [...sett.setting_value] : [];
      const idx = list.findIndex((p: any) => p.id === body.poll_id);
      if (idx < 0) return NextResponse.json({ error: "Poll not found" }, { status: 404 });
      const poll = { ...list[idx], votes: { ...(list[idx].votes || {}) } };
      if (poll.votes[session.userId] != null) {
        return NextResponse.json(
          {
            error: "Vote locked. Raise a change request.",
            code: "VOTE_LOCKED",
            current_vote: poll.votes[session.userId],
          },
          { status: 409 }
        );
      }
      poll.votes[session.userId] = body.option_index;
      list[idx] = poll;
      await supabase
        .from("app_settings")
        .upsert({ setting_key: "polls_store", setting_value: list }, { onConflict: "setting_key" });
      return NextResponse.json({ success: true, locked: true });
    }

    const { data: existing } = await supabase
      .from("poll_votes")
      .select("option_index")
      .eq("poll_id", body.poll_id)
      .eq("user_id", session.userId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        {
          error: "Vote locked. Raise a change request for Core/Super Admin approval.",
          code: "VOTE_LOCKED",
          current_vote: existing.option_index,
        },
        { status: 409 }
      );
    }

    const { data: poll } = await supabase.from("polls").select("*").eq("id", body.poll_id).maybeSingle();
    if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    const opts = Array.isArray(poll.options) ? poll.options : [];
    if (body.option_index < 0 || body.option_index >= opts.length) {
      return NextResponse.json({ error: "Invalid option" }, { status: 400 });
    }
    const { error } = await supabase.from("poll_votes").insert({
      poll_id: body.poll_id,
      user_id: session.userId,
      option_index: body.option_index,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, locked: true });
  }

  // --- create (staff) LOCKED feature path still works ---
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
    { ...base, is_active: true, is_global: false, ends_at: null },
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
    const local = {
      id: `local_${Date.now()}`,
      ...base,
      is_active: true,
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
      .upsert(
        { setting_key: "polls_store", setting_value: list.slice(0, 40) },
        { onConflict: "setting_key" }
      );
    if (up.error) {
      return NextResponse.json({ error: lastError || up.error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, poll: local, stored: "app_settings" });
  }
  return NextResponse.json({ success: true, poll: data });
}
