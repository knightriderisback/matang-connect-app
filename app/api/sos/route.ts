import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { type } = await request.json();
  const supabase = createAdminClient();

  const { data: requester } = await supabase.from("users").select("city_id").eq("id", session.userId).single();

  const { data, error } = await supabase
    .from("sos_alerts")
    .insert({ raised_by: session.userId, type, status: "active", city_id: requester?.city_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Could not raise SOS alert" }, { status: 500 });
  return NextResponse.json({ success: true, alert: data });
}
