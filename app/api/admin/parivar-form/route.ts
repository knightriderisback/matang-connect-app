import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Super Admin only. Session server-side verify hota hai; DB RPC ke andar bhi role dobara check hota hai.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(["super_admin"]);
  if (!auth.session) return auth.response;
  const supabase = createAdminClient();

  if (request.nextUrl.searchParams.get("log")) {
    const { data, error } = await supabase.rpc("admin_get_form_config_log", {
      p_actor: auth.session.userId,
      p_limit: 100,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ log: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data, error } = await supabase.rpc("admin_get_parivar_form_config", { p_actor: auth.session.userId });
  if (error) return NextResponse.json({ error: error.message }, { status: error.message.includes("forbidden") ? 403 : 400 });
  return NextResponse.json({ sections: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["super_admin"]);
  if (!auth.session) return auth.response;
  const actor = auth.session.userId;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const supabase = createAdminClient();

  let result;
  switch (body?.op) {
    case "upsert_section":
      result = await supabase.rpc("admin_upsert_form_section", { p_actor: actor, p_data: body.data ?? {} });
      break;
    case "upsert_field":
      result = await supabase.rpc("admin_upsert_form_field", { p_actor: actor, p_data: body.data ?? {} });
      break;
    case "upsert_option":
      result = await supabase.rpc("admin_upsert_form_option", { p_actor: actor, p_data: body.data ?? {} });
      break;
    case "reorder":
      result = await supabase.rpc("admin_reorder_form_items", {
        p_actor: actor,
        p_entity: String(body.entity || ""),
        p_ids: Array.isArray(body.ids) ? body.ids : [],
      });
      break;
    case "state":
      result = await supabase.rpc("admin_set_form_item_state", {
        p_actor: actor,
        p_entity: String(body.entity || ""),
        p_id: body.id,
        p_action: String(body.action || ""),
      });
      break;
    case "delete":
      result = await supabase.rpc("admin_delete_form_item", {
        p_actor: actor,
        p_entity: String(body.entity || ""),
        p_id: body.id,
        p_confirm: String(body.confirm || ""),
      });
      break;
    default:
      return NextResponse.json({ error: "Unknown operation" }, { status: 400 });
  }

  if (result.error) {
    const msg = result.error.message || "Failed";
    const friendly: Record<string, string> = {
      locked_field: "This is a core field and cannot be hidden, archived or made optional.",
      section_has_locked_fields: "This section contains core fields and cannot be hidden or archived.",
      archive_first: "Archive the item first, then delete it permanently.",
      system_field: "System fields cannot be deleted permanently. Archive or hide them instead.",
      invalid_field_key: "Invalid field key.",
      invalid_slug: "Invalid section key.",
    };
    const key = Object.keys(friendly).find((k) => msg.includes(k));
    return NextResponse.json({ error: key ? friendly[key] : msg }, { status: msg.includes("forbidden") ? 403 : 400 });
  }
  return NextResponse.json({ success: true, data: result.data ?? null });
}
