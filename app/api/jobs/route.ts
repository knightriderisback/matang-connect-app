import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

/** Live schema: posted_by, title, description, city_id, status */

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  let q = supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (session.role !== "super_admin" && session.cityId) {
    q = q.or(`city_id.eq.${session.cityId},city_id.is.null`);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ jobs: [], error: error.message });
  // Normalize for UI that may expect is_active
  const jobs = (data || []).map((j: any) => ({
    ...j,
    is_active: j.status === "active" || j.status === "open",
  }));
  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const body = await request.json();
  if (!body.title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      title: body.title,
      description: body.description || null,
      city_id: body.city_id || session.cityId || null,
      posted_by: session.userId,
      status: body.status || "active",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, job: data });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id, status } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = createAdminClient();

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id, posted_by, city_id")
    .eq("id", id)
    .maybeSingle();

  if (jobErr || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const isPoster = job.posted_by === session.userId;
  const isSA = session.role === "super_admin";
  const isStaffInCity =
    STAFF_ROLES.includes(session.role as any) &&
    session.cityId &&
    (!job.city_id || job.city_id === session.cityId);

  if (!isSA && !isPoster && !isStaffInCity) {
    return NextResponse.json({ error: "Not authorized to modify this job" }, { status: 403 });
  }

  const { error } = await supabase
    .from("jobs")
    .update({ status: status || "closed" })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
