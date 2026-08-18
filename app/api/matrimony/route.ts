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

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const gender = request.nextUrl.searchParams.get("gender");
  const supabase = createAdminClient();

  let profiles: any[] = [];
  let tableErr = "";

  const selects = [
    "id, user_id, gender, age, height_cm, education, occupation, native_village, about, looking_for, photo_url, contact_visible, city_id, created_at, is_active",
    "id, user_id, gender, age, education, occupation, about, created_at",
    "*",
  ];

  for (const sel of selects) {
    let q = supabase.from("matrimony_profiles").select(sel).order("created_at", { ascending: false }).limit(50);
    try {
      q = q.eq("is_active", true);
    } catch {
      /* column may not exist in filter builder - applied after */
    }
    const { data, error } = await q;
    if (!error) {
      profiles = (data || []).filter((p: any) => p.is_active !== false);
      break;
    }
    tableErr = error.message;
  }

  // settings fallback
  if (!profiles.length) {
    const store = await readStore(supabase);
    profiles = store.filter((p) => p && p.is_active !== false);
  }

  profiles = profiles.filter((p) => p.user_id !== session.userId);
  if (gender && gender !== "all") {
    profiles = profiles.filter((p) => p.gender === gender);
  }
  if (session.role !== "super_admin" && session.cityId) {
    profiles = profiles.filter((p) => !p.city_id || p.city_id === session.cityId);
  }

  // own profile
  let mine: any = null;
  {
    const { data } = await supabase
      .from("matrimony_profiles")
      .select("*")
      .eq("user_id", session.userId)
      .maybeSingle();
    mine = data;
  }
  if (!mine) {
    const store = await readStore(supabase);
    mine = store.find((p) => p.user_id === session.userId) || null;
  }

  return NextResponse.json({
    profiles,
    mine,
    error: tableErr || undefined,
  });
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

  // Table path
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
    // thinner schemas
    {
      user_id: session.userId,
      gender: body.gender,
      age: body.age ? Number(body.age) : null,
      education: body.education || null,
      occupation: body.occupation || null,
      about: body.about || null,
      is_active: true,
    },
    {
      user_id: session.userId,
      gender: body.gender,
      about: body.about || null,
    },
  ];

  let data: any = null;
  let lastError = "";

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
      lastError = r.error.message;
    } else {
      const r = await supabase.from("matrimony_profiles").insert(row).select().maybeSingle();
      if (!r.error) {
        data = r.data;
        break;
      }
      lastError = r.error.message;
      // if unique violation, try update
      if (/duplicate|unique/i.test(r.error.message)) {
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
        lastError = up.error.message;
      }
    }
  }

  if (data) {
    return NextResponse.json({ success: true, profile: data });
  }

  // app_settings fallback
  const store = await readStore(supabase);
  const idx = store.findIndex((p) => p.user_id === session.userId);
  const local = {
    id: idx >= 0 ? store[idx].id : `mat_${session.userId.slice(0, 8)}_${Date.now()}`,
    ...payload,
    created_at: idx >= 0 ? store[idx].created_at : new Date().toISOString(),
  };
  if (idx >= 0) store[idx] = { ...store[idx], ...local };
  else store.unshift(local);

  try {
    await writeStore(supabase, store);
  } catch (e: any) {
    return NextResponse.json(
      {
        error: lastError || e?.message || "Save failed",
        hint: "Create matrimony_profiles table (stage3_tables.sql)",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    profile: local,
    stored: "app_settings",
  });
}
