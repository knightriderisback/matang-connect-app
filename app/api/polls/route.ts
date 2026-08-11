import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  let q = supabase
    .from("polls")
    .select("id, question, options, is_active, ends_at, is_global, city_id, created_at, created_by")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(20);
  if (session.role !== "super_admin" && session.cityId) {
    q = q.or(`is_global.eq.true,city_id.eq.${session.cityId}`);
  }
  const { data: polls, error } = await q;
  if (error) return NextResponse.json({ polls: [], error: error.message });

  // Attach vote counts + user's vote
  const result = [];
  for (const p of polls || []) {
    const { data: votes } = await supabase
      .from("poll_votes")
      .select("option_index, user_id")
      .eq("poll_id", p.id);
    const counts: number[] = Array(Array.isArray(p.options) ? p.options.length : 0).fill(0);
    let myVote: number | null = null;
    (votes || []).forEach((v: any) => {
      if (v.option_index >= 0 && v.option_index < counts.length) counts[v.option_index]++;
      if (v.user_id === session.userId) myVote = v.option_index;
    });
    result.push({
      ...p,
      vote_counts: counts,
      total_votes: (votes || []).length,
      my_vote: myVote,
    });
  }
  return NextResponse.json({ polls: result });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json();

  // Vote action
  if (body.action === "vote") {
    if (body.poll_id == null || body.option_index == null) {
      return NextResponse.json({ error: "poll_id and option_index required" }, { status: 400 });
    }
    const supabase = createAdminClient();
    const { data: poll } = await supabase
      .from("polls")
      .select("id, is_active, ends_at, options")
      .eq("id", body.poll_id)
      .single();
    if (!poll || !poll.is_active) {
      return NextResponse.json({ error: "Poll not active" }, { status: 400 });
    }
    if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
      return NextResponse.json({ error: "Poll ended" }, { status: 400 });
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Create poll (staff)
  if (!STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  if (!body.question || !Array.isArray(body.options) || body.options.length < 2) {
    return NextResponse.json({ error: "Question and at least 2 options required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("polls")
    .insert({
      question: body.question,
      options: body.options.slice(0, 6),
      ends_at: body.ends_at || null,
      is_global: !!body.is_global && session.role === "super_admin",
      city_id: session.cityId || null,
      created_by: session.userId,
      is_active: true,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action: "poll_create",
    target_id: data.id,
  });
  return NextResponse.json({ success: true, poll: data });
}
