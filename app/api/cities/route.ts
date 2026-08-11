import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Prefer Chhattisgarh first in list
    const list = (data || []).slice().sort((a, b) => {
      const aCG = a.state === "Chhattisgarh" ? 0 : 1;
      const bCG = b.state === "Chhattisgarh" ? 0 : 1;
      if (aCG !== bCG) return aCG - bCG;
      return String(a.name).localeCompare(String(b.name));
    });

    return NextResponse.json({ cities: list, error: list.length ? undefined : errorMsg });
  } catch (e: any) {
    return NextResponse.json({ cities: [], error: e?.message });
  }
}
