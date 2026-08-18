import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

const STORE_KEY = "matrimony_profiles_store";

async function readStore(supabase: any): Promise<any[]> {
  const { data } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", STORE_KEY)
    .maybeSingle();
  return Array.isArray(data?.setting_value) ? data.setting_value : [];
}

async function writeStore(supabase: any, list: any[]) {
  await supabase.from("app_settings").upsert(
    { setting_key: STORE_KEY, setting_value: list.slice(0, 200) },
    { onConflict: "setting_key" }
  );
}

async function attachNames(supabase: any, profiles: any[]) {
  const ids = Array.from(new Set(profiles.map((p) => p.user_id).filter(Boolean)));
  if (!ids.length) return profiles;
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, phone, role")
    .in("id", ids);
  const map: Record<string, any> = {};
  (users || []).forEach((u: any) => {
    map[u.id] = u;
  });
  return profiles.map((p) => ({
    ...p,
    user_name: map[p.user_id]?.full_name || "Member",
    user_phone: map[p.user_id]?.phone || null,
    user_role: map[p.user_id]?.role || null,
  }));
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const gender = request.nextUrl.searchParams.get("gender");
  const supabase = createAdminClient();

  const byUser = new Map<string, any>();

  // Table rows
  for (const sel of ["*", "id, user_id, gender, age, education, occupation, about, created_at"]) {
    const { data, error } = await supabase
      .from("matrimony_profiles")
      .select(sel)
      .order("created_at", { ascending: false })
      .limit(80);
    if (!error && data) {
      data.forEach((p: any) => {
        if (p.is_active === false) return;
        if (p.user_id) byUser.set(p.user_id, p);
      });
      break;
    }
  }

  // Always merge settings store (covers schema-missing saves)
  const store = await readStore(supabase);
  store.forEach((p) => {
    if (!p || p.is_active === false || !p.user_id) return;
    if (!byUser.has(p.user_id)) byUser.set(p.user_id, p);
    else {
      // prefer newer updated_at
      const cur = byUser.get(p.user_id);
      const t1 = new Date(cur.updated_at || cur.created_at || 0).getTime();
      const t2 = new Date(p.updated_at || p.created_at || 0).getTime();
      if (t2 >= t1) byUser.set(p.user_id, { ...cur, ...p });
    }
  });

  let profiles = Array.from(byUser.values());
  if (gender && gender !== "all") {
    profiles = profiles.filter((p) => p.gender === gender);
  }
  if (session.role !== "super_admin" && session.cityId) {
    profiles = profiles.filter(
      (p) => !p.city_id || p.city_id === session.cityId || p.user_id === session.userId
    );
  }

  profiles.sort((a, b) => {
    const ta = new Date(a.updated_at || a.created_at || 0).getTime();
    const tb = new Date(b.updated_at || b.created_at || 0).getTime();
    return tb - ta;
  });

  profiles = await attachNames(supabase, profiles);
  const mine = profiles.find((p) => p.user_id === session.userId) || null;

  return NextResponse.json({ profiles, mine });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.gender) {
    return NextResponse.json({ error: "Gender required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const payload: Record<string, unknown> = {
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

  let existing: any = null;
  {
    const { data } = await supabase
      .from("matrimony_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    existing = data;
  }

  const tryPayloads = [
    payload,
    {
      user_id: session.userId,
      gender: body.gender,
      age: body.age ? Number(body.age) : null,
      education: body.education || null,
      occupation: body.occupation || null,
      about: body.about || null,
      is_active: true,
    },
    { user_id: session.userId, gender: body.gender, about: body.about || null },
  ];

  let data: any = null;
  for (const row of tryPayloads) {
    if (existing?.id) {
      const r = await supabase
        .from("matrimony_profiles")
        .update(row)
        .eq("id", existing.id)
        .select()
        .maybeSingle();
      if (!r.error) {
        data = r.data;
        break;
      }
    } else {
      const r = await supabase.from("matrimony_profiles").insert(row).select().maybeSingle();
      if (!r.error) {
        data = r.data;
        break;
      }
      if (/duplicate|unique/i.test(r.error.message || "")) {
        const up = await supabase
          .from("matrimony_profiles")
          .update(row)
          .eq("user_id", session.userId)
          .select()
          .maybeSingle();
        if (!up.error) {
          data = up.data;
          break;
        }
      }
    }
  }

  // Always write settings store so list shows even if table schema blocks
  const store = await readStore(supabase);
  const idx = store.findIndex((p) => p.user_id === session.userId);
  const local = {
    id: data?.id || (idx >= 0 ? store[idx].id : `mat_${Date.now()}`),
    ...payload,
    created_at:
      data?.created_at ||
      (idx >= 0 ? store[idx].created_at : new Date().toISOString()),
  };
  if (idx >= 0) store[idx] = { ...store[idx], ...local };
  else store.unshift(local);
  try {
    await writeStore(supabase, store);
  } catch {
    /* ignore if settings fails but table ok */
  }

  if (!data && !local) {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: data || local });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  await supabase
    .from("matrimony_profiles")
    .update({ is_active: false })
    .eq("user_id", session.userId);
  const store = await readStore(supabase);
  const next = store.map((p) =>
    p.user_id === session.userId ? { ...p, is_active: false } : p
  );
  await writeStore(supabase, next);
  return NextResponse.json({ success: true });
}
