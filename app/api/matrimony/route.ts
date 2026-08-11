import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const gender = request.nextUrl.searchParams.get("gender");
  const supabase = createAdminClient();
  let q = supabase
    .from("matrimony_profiles")
    .select("id, user_id, gender, age, height_cm, education, occupation, native_village, about, looking_for, photo_url, contact_visible, city_id, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(50);
  // Hide own profile from list
  q = q.neq("user_id", session.userId);
  if (gender && gender !== "all") {
    q = q.eq("gender", gender);
  }
  if (session.role !== "super_admin" && session.cityId) {
    q = q.or(`city_id.eq.${session.cityId},city_id.is.null`);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ profiles: [], error: error.message });
  return NextResponse.json({ profiles: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json();
  if (!body.gender) {
    return NextResponse.json({ error: "Gender required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  // Upsert by user_id
  const { data: existing } = await supabase
    .from("matrimony_profiles")
    .select("id")
    .eq("user_id", session.userId)
    .maybeSingle();

  const payload = {
    user_id: session.userId,
    city_id: session.cityId || null,
    gender: body.gender,
    age: body.age ? Number(body.age) : null,
    height_cm: body.height_cm ? Number(body.height_cm) : null,
    education: body.education || null,
    occupation: body.occupation || null,
    native_village: body.native_village || null,
    about: body.about || null,
    looking_for: body.looking_for || null,
    photo_url: body.photo_url || null,
    contact_visible: !!body.contact_visible,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  let data, error;
  if (existing) {
    ({ data, error } = await supabase
      .from("matrimony_profiles")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from("matrimony_profiles")
      .insert(payload)
      .select()
      .single());
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, profile: data });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("matrimony_profiles")
    .update({ is_active: false })
    .eq("user_id", session.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
