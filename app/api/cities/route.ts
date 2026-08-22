import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { allIndiaCityOptions } from "@/lib/indiaLocations";

export async function GET() {
  try {
    let data: any[] | null = null;
    let errorMsg = "";

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const res = await supabase
        .from("cities")
        .select("id, name, state")
        .eq("is_active", true)
        .order("state")
        .order("name");
      if (res.error) errorMsg = res.error.message;
      else data = res.data;
    } catch (e: any) {
      errorMsg = e?.message || "anon failed";
    }

    // Fallback: service role (RLS may block anon on some projects)
    if (!data?.length) {
      try {
        const admin = createAdminClient();
        const res = await admin
          .from("cities")
          .select("id, name, state")
          .eq("is_active", true)
          .order("state")
          .order("name");
        if (!res.error) data = res.data;
        else errorMsg = res.error.message;
      } catch (e: any) {
        errorMsg = e?.message || errorMsg;
      }
    }

    // Merge DB + full India static list (DB UUID wins on name+state match)
    const byKey = new Map<string, { id: string; name: string; state: string }>();
    for (const c of allIndiaCityOptions()) {
      byKey.set(`${c.state}||${c.name}`, c);
    }
    for (const c of data || []) {
      byKey.set(`${c.state}||${c.name}`, { id: c.id, name: c.name, state: c.state || "Other" });
    }
    const list = Array.from(byKey.values()).sort((a, b) => {
      const aCG = a.state === "Chhattisgarh" ? 0 : 1;
      const bCG = b.state === "Chhattisgarh" ? 0 : 1;
      if (aCG !== bCG) return aCG - bCG;
      if (a.state !== b.state) return String(a.state).localeCompare(String(b.state));
      return String(a.name).localeCompare(String(b.name));
    });

    return NextResponse.json({
      cities: list,
      states: Array.from(new Set(list.map((c) => c.state))).sort((a, b) => {
        if (a === "Chhattisgarh") return -1;
        if (b === "Chhattisgarh") return 1;
        return a.localeCompare(b);
      }),
      error: list.length ? undefined : errorMsg,
    });
  } catch (e: any) {
    return NextResponse.json({ cities: [], error: e?.message });
  }
}
