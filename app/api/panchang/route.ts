import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

const STORE_KEY = "festivals_store";

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
  const supabase = createAdminClient();

  const year = Number(request.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const month = Number(request.nextUrl.searchParams.get("month")); // 1-12 optional

  let from: Date;
  let to: Date;
  if (month >= 1 && month <= 12) {
    from = new Date(year, month - 1, 1);
    to = new Date(year, month, 0); // last day of month
  } else {
    from = new Date(year, 0, 1);
    to = new Date(year, 11, 31);
  }
  const fromS = from.toISOString().slice(0, 10);
  const toS = to.toISOString().slice(0, 10);

  let festivals: any[] = [];
  const { data, error } = await supabase
    .from("festivals")
    .select("id, title, description, festival_date, is_recurring, city_id, created_at")
    .gte("festival_date", fromS)
    .lte("festival_date", toS)
    .order("festival_date", { ascending: true })
    .limit(100);

  if (!error && data) festivals = data;
  else {
    const store = await readStore(supabase);
    festivals = store.filter((f) => f.festival_date >= fromS && f.festival_date <= toS);
  }

  if (session.role !== "super_admin" && session.cityId) {
    festivals = festivals.filter((f) => !f.city_id || f.city_id === session.cityId);
  }

  return NextResponse.json({ festivals, from: fromS, to: toS });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  if (!body.title || !body.festival_date) {
    return NextResponse.json({ error: "Title and date required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const row = {
    title: body.title,
    description: body.description || null,
    festival_date: body.festival_date,
    is_recurring: body.is_recurring !== false,
    city_id: body.is_global ? null : session.cityId || null,
    created_by: session.userId,
  };

  const { data, error } = await supabase.from("festivals").insert(row).select().single();
  if (!error && data) {
    return NextResponse.json({ success: true, festival: data });
  }

  // fallback store
  const store = await readStore(supabase);
  const local = {
    id: `fest_${Date.now()}`,
    ...row,
    created_at: new Date().toISOString(),
  };
  store.push(local);
  try {
    await writeStore(supabase, store);
  } catch (e: any) {
    return NextResponse.json({ error: error?.message || e?.message || "Save failed" }, { status: 500 });
  }
  return NextResponse.json({ success: true, festival: local, stored: "app_settings" });
}
