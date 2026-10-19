import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Active (non-hidden, non-archived) Parivar Form configuration for filling the form.
export async function GET() {
  const auth = await requireAuth();
  if (!auth.session) return auth.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_parivar_form_config", { p_include_hidden: false });
  if (error) {
    console.error("parivar config error:", error.message);
    return NextResponse.json({ error: "Could not load form" }, { status: 500 });
  }
  return NextResponse.json(
    { sections: data ?? [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
