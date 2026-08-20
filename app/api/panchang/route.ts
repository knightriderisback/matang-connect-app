import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { festivalsForYear, hasVerifiedYear, VERIFIED_YEARS } from "@/lib/hinduFestivals2026";

const STORE_KEY = "festivals_store";
const VERIFIED_KEY = "festivals_verified_cache";

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

type VerifiedCache = {
  byYear: Record<string, any[]>;
  lastSyncAt: string;
  lastSyncYear?: number;
};

async function readVerifiedCache(supabase: any): Promise<VerifiedCache> {
  const { data } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", VERIFIED_KEY)
    .maybeSingle();
  const v = data?.setting_value;
  if (v && typeof v === "object" && v.byYear) return v as VerifiedCache;
  return { byYear: {}, lastSyncAt: "" };
}

async function writeVerifiedCache(supabase: any, cache: VerifiedCache) {
  await supabase.from("app_settings").upsert(
    { setting_key: VERIFIED_KEY, setting_value: cache },
    { onConflict: "setting_key" }
  );
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();

  const year = Number(request.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const month = Number(request.nextUrl.searchParams.get("month"));

  let from: Date;
  let to: Date;
  if (month >= 1 && month <= 12) {
    from = new Date(year, month - 1, 1);
    to = new Date(year, month, 0);
  } else {
    from = new Date(year, 0, 1);
    to = new Date(year, 11, 31);
  }
  const fromS = from.toISOString().slice(0, 10);
  const toS = to.toISOString().slice(0, 10);

  // Staff / community festivals only (never mixed with verified bulk replace)
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

  // Verified layer (optional cache after sync) — does not replace staff list
  const cache = await readVerifiedCache(supabase);
  const verifiedYear = cache.byYear?.[String(year)] || [];

  return NextResponse.json({
    festivals,
    verified: verifiedYear.filter((f: any) => f.festival_date >= fromS && f.festival_date <= toS),
    verifiedMeta: {
      lastSyncAt: cache.lastSyncAt || null,
      lastSyncYear: cache.lastSyncYear || null,
      hasBuiltIn: hasVerifiedYear(year),
      verifiedYears: VERIFIED_YEARS,
    },
    from: fromS,
    to: toS,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();

  // --- Sync verified dates for a year (does NOT touch staff festivals) ---
  if (body.action === "sync_verified") {
    const year = Number(body.year) || new Date().getFullYear();
    if (!hasVerifiedYear(year)) {
      return NextResponse.json(
        {
          error: `Year ${year} not in verified set (${VERIFIED_YEARS.join(", ")}). Use Drik link.`,
          code: "YEAR_NOT_VERIFIED",
          verifiedYears: VERIFIED_YEARS,
        },
        { status: 400 }
      );
    }
    const rows = festivalsForYear(year).map((e) => ({
      id: e.id,
      title: e.titleHi || e.title,
      description: [e.tithi, e.note].filter(Boolean).join(" · "),
      festival_date: e.date,
      source: "verified_drik",
      year,
    }));

    const cache = await readVerifiedCache(supabase);
    // Only replace this year's verified slice — never staff store
    cache.byYear = { ...(cache.byYear || {}), [String(year)]: rows };
    cache.lastSyncAt = new Date().toISOString();
    cache.lastSyncYear = year;
    try {
      await writeVerifiedCache(supabase, cache);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "Sync write failed" }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      year,
      count: rows.length,
      lastSyncAt: cache.lastSyncAt,
      note: "Staff/community festivals unchanged",
    });
  }

  // --- Staff add festival ---
  if (!STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  if (!body.title || !body.festival_date) {
    return NextResponse.json({ error: "Title and date required" }, { status: 400 });
  }
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
