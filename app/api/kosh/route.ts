import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  let q = supabase.from("kosh_entries").select("*").order("entry_date", { ascending: false }).limit(100);
  if (session.role !== "super_admin" && session.cityId) {
    q = q.eq("city_id", session.cityId);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ entries: [], error: error.message });
  const entries = data || [];
  const income = entries.filter((e: any) => e.entry_type === "income").reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const expense = entries.filter((e: any) => e.entry_type === "expense").reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  return NextResponse.json({ entries, summary: { income, expense, balance: income - expense } });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const body = await request.json();
  if (!body.entry_type || body.amount == null) {
    return NextResponse.json({ error: "entry_type and amount required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("kosh_entries").insert({
    entry_type: body.entry_type,
    amount: Number(body.amount),
    description: body.description || null,
    entry_date: body.entry_date || new Date().toISOString().slice(0, 10),
    city_id: session.cityId || null,
    created_by: session.userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, entry: data });
}
