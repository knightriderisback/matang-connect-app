import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

/** Live schema: kosh_transactions + sahyog_kosh_contributions (no kosh_entries) */

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();

  const { data: transactions, error: txErr } = await supabase
    .from("kosh_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: contributions } = await supabase
    .from("sahyog_kosh_contributions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (txErr) {
    return NextResponse.json({
      entries: [],
      contributions: contributions || [],
      summary: { income: 0, expense: 0, balance: 0 },
      error: txErr.message,
    });
  }

  const txs = transactions || [];
  // category: treat "income"/"donation"/"contribution" as income; else expense
  const isIncome = (c: string) =>
    /income|donation|contribution|inflow|credit/i.test(c || "");
  const income = txs
    .filter((e: any) => isIncome(e.category))
    .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const expense = txs
    .filter((e: any) => !isIncome(e.category))
    .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const contribTotal = (contributions || []).reduce(
    (s: number, e: any) => s + Number(e.amount || 0),
    0
  );

  // Normalize for UI that expects entry_type + description
  const entries = txs.map((e: any) => ({
    id: e.id,
    entry_type: isIncome(e.category) ? "income" : "expense",
    amount: e.amount,
    description: e.description || e.category,
    category: e.category,
    entry_date: e.created_at?.slice?.(0, 10) || null,
    created_at: e.created_at,
    recorded_by: e.recorded_by,
  }));

  return NextResponse.json({
    entries,
    contributions: contributions || [],
    summary: {
      income: income + contribTotal,
      expense,
      balance: income + contribTotal - expense,
      contributions: contribTotal,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const body = await request.json();
  const supabase = createAdminClient();

  // Member contribution
  if (body.action === "contribution") {
    if (body.amount == null) {
      return NextResponse.json({ error: "amount required" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("sahyog_kosh_contributions")
      .insert({
        contributor_id: session.userId,
        amount: Number(body.amount),
        purpose: body.purpose || body.description || null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, contribution: data });
  }

  // Ledger transaction
  if (body.amount == null) {
    return NextResponse.json({ error: "amount required" }, { status: 400 });
  }
  const category =
    body.category ||
    (body.entry_type === "expense" ? "expense" : "income");

  const { data, error } = await supabase
    .from("kosh_transactions")
    .insert({
      amount: Number(body.amount),
      category,
      description: body.description || null,
      recorded_by: session.userId,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, entry: data });
}
