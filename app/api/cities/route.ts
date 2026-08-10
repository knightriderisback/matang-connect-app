import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase
      .from("cities")
      .select("id, name, state")
      .eq("is_active", true)
      .order("name");
    if (error) {
      console.error("cities error:", error.message);
      return NextResponse.json({ cities: [] });
    }
    return NextResponse.json({ cities: data || [] });
  } catch (e) {
    return NextResponse.json({ cities: [] });
  }
}
