import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Write an audit log row. Tries several column shapes so it works across
 * live schemas (meta vs metadata, target_id text vs uuid).
 * Never throws — audit must not break the main action.
 */
export async function writeAuditLog(opts: {
  actorId?: string | null;
  action: string;
  targetId?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  try {
    const supabase = createAdminClient();
    const { actorId, action, targetId, meta } = opts;

    // Attempt 1: meta + target_id as text
    let { error } = await supabase.from("audit_logs").insert({
      actor_id: actorId || null,
      action,
      target_id: targetId || null,
      meta: meta || null,
    });
    if (!error) return true;

    // Attempt 2: metadata instead of meta
    ({ error } = await supabase.from("audit_logs").insert({
      actor_id: actorId || null,
      action,
      target_id: targetId || null,
      metadata: meta || {},
    }));
    if (!error) return true;

    // Attempt 3: minimal columns only
    ({ error } = await supabase.from("audit_logs").insert({
      actor_id: actorId || null,
      action,
    }));
    if (!error) return true;

    // Attempt 4: action only
    ({ error } = await supabase.from("audit_logs").insert({ action }));
    if (!error) return true;

    console.warn("audit_logs insert failed:", error?.message);
    return false;
  } catch (e: any) {
    console.warn("audit_logs exception:", e?.message);
    return false;
  }
}
