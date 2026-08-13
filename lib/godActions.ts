import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULTS, type FeatureFlags } from "@/lib/featureFlags";
import bcrypt from "bcryptjs";
import { writeAuditLog } from "@/lib/audit";

export type GodResult = {
  handled: boolean;
  message: string;
  data?: unknown;
};

function flagKeyFromText(q: string): string | null {
  const map: [RegExp, keyof FeatureFlags][] = [
    [/stage\s*1|stage_1/i, "stage_1_enabled"],
    [/stage\s*2|stage_2/i, "stage_2_enabled"],
    [/stage\s*3|stage_3/i, "stage_3_enabled"],
    [/\bsos\b/i, "sos_enabled"],
    [/\bjobs?\b|rojgar/i, "jobs_enabled"],
    [/notice|feed/i, "notices_enabled"],
    [/\bcare\b|vridh/i, "care_enabled"],
    [/\bkosh\b|sahyog/i, "kosh_transparency_mode"],
    [/vyapar|business/i, "vyapar_enabled"],
    [/matrimony|shadi/i, "matrimony_enabled"],
    [/dharohar|history/i, "dharohar_enabled"],
    [/panchang/i, "panchang_enabled"],
    [/mahila/i, "mahila_enabled"],
    [/polls?/i, "polls_enabled"],
    [/arthik/i, "arthik_enabled"],
    [/rides?/i, "rides_enabled"],
    [/gaurav/i, "gaurav_enabled"],
    [/gamification|credits?|badge/i, "gamification_enabled"],
    [/\bscan\b|qr/i, "scan_enabled"],
    [/titles?/i, "titles_enabled"],
  ];
  for (const [re, key] of map) {
    if (re.test(q)) return key;
  }
  return null;
}

async function setFlag(key: string, value: boolean, actorId: string): Promise<string> {
  const supabase = createAdminClient();
  const payload = {
    setting_key: key,
    setting_value: value,
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  };
  let { error } = await supabase.from("app_settings").upsert(payload, { onConflict: "setting_key" });
  if (error) {
    await supabase.from("app_settings").delete().eq("setting_key", key);
    ({ error } = await supabase.from("app_settings").insert(payload));
  }
  if (error) return `Failed to set ${key}: ${error.message}`;
  await writeAuditLog({ actorId, action: "god_flag_set", meta: { key, value } });
  return `${key} → ${value ? "ON" : "OFF"} (saved)`;
}

/** Try to execute Super Admin natural-language commands against live DB */
export async function tryGodAction(
  message: string,
  actorId: string
): Promise<GodResult> {
  const q = message.trim();
  const lower = q.toLowerCase();

  // --- Feature / stage ON/OFF ---
  const turnOn = /\b(on|enable|unlock|खोल|चालू|on\s+kar|enable\s+kar)\b/i.test(q);
  const turnOff = /\b(off|disable|lock|band|बंद|off\s+kar|disable\s+kar)\b/i.test(q);
  if (turnOn || turnOff) {
    const key = flagKeyFromText(q);
    if (key) {
      const msg = await setFlag(key, turnOn && !turnOff, actorId);
      return { handled: true, message: msg };
    }
    if (/all\s+stage|saari\s+stage|all\s+module/i.test(q) && turnOn) {
      const lines: string[] = [];
      for (const k of Object.keys(DEFAULTS) as (keyof FeatureFlags)[]) {
        lines.push(await setFlag(k, true, actorId));
      }
      return { handled: true, message: "All stages/modules ON:\n" + lines.join("\n") };
    }
  }

  // --- Stats / counts ---
  if (
    /kitne|how many|count|total|stats|summary|status\s+report|dashboard\s+stats/i.test(
      lower
    )
  ) {
    const supabase = createAdminClient();
    const tables = ["users", "notices", "jobs", "care_requests", "families"] as const;
    const parts: string[] = [];
    for (const t of tables) {
      const { count, error } = await supabase
        .from(t)
        .select("*", { count: "exact", head: true });
      parts.push(error ? `${t}: (error)` : `${t}: ${count ?? 0}`);
    }
    const { count: pending } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "pending");
    parts.push(`pending_verification: ${pending ?? 0}`);
    await writeAuditLog({ actorId, action: "god_stats", meta: {} });
    return { handled: true, message: "Live counts:\n" + parts.join("\n") };
  }

  // --- Verify all pending ---
  if (/verify\s+all|approve\s+all|sab\s+verify|pending\s+approve/i.test(lower)) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .update({ verification_status: "verified" })
      .eq("verification_status", "pending")
      .select("id");
    if (error) return { handled: true, message: "Verify failed: " + error.message };
    await writeAuditLog({
      actorId,
      action: "god_verify_all",
      meta: { count: data?.length || 0 },
    });
    return {
      handled: true,
      message: `Verified ${data?.length || 0} pending member(s).`,
    };
  }

  // --- Verify by phone ---
  const verifyPhone = q.match(
    /verify\s+(?:user\s+)?(?:phone\s+)?(\d{10})|(\d{10})\s+verify/i
  );
  if (verifyPhone) {
    const phone = (verifyPhone[1] || verifyPhone[2] || "").slice(-10);
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .update({ verification_status: "verified" })
      .eq("phone", phone)
      .select("id, full_name")
      .maybeSingle();
    if (error) return { handled: true, message: "Verify failed: " + error.message };
    if (!data) return { handled: true, message: `No user with phone ${phone}` };
    await writeAuditLog({
      actorId,
      action: "god_verify_user",
      targetId: data.id,
    });
    return {
      handled: true,
      message: `Verified: ${data.full_name} (${phone})`,
    };
  }

  // --- Reset M-PIN by phone ---
  const resetM = q.match(
    /(?:reset\s*(?:m-?pin|pin)|mpin\s*reset).*?(\d{10}).*?(\d{4})|(\d{10}).*?(?:mpin|pin).*?(\d{4})/i
  );
  if (resetM || /reset\s*m-?pin/i.test(lower)) {
    const phone =
      resetM?.[1] ||
      resetM?.[3] ||
      (q.match(/\b(\d{10})\b/) || [])[1];
    const pin =
      resetM?.[2] ||
      resetM?.[4] ||
      (q.match(/\b(\d{4})\b/) || [])[1];
    if (phone && pin && /^\d{4}$/.test(pin)) {
      const supabase = createAdminClient();
      const hash = await bcrypt.hash(pin, 10);
      const { data, error } = await supabase
        .from("users")
        .update({ m_pin_hash: hash })
        .eq("phone", phone)
        .select("id, full_name")
        .maybeSingle();
      if (error) return { handled: true, message: "Reset failed: " + error.message };
      if (!data) return { handled: true, message: `No user with phone ${phone}` };
      await writeAuditLog({
        actorId,
        action: "god_reset_mpin",
        targetId: data.id,
      });
      return {
        handled: true,
        message: `M-PIN reset for ${data.full_name} (${phone}) to ${pin}`,
      };
    }
  }

  // --- Post notice ---
  const noticeMatch = q.match(
    /(?:post|create|add)\s+(?:notice|announcement|feed)\s*[:\-]?\s*(.+)/i
  );
  if (noticeMatch) {
    const content = noticeMatch[1].trim();
    const title = content.slice(0, 80);
    const supabase = createAdminClient();
    const { data: me } = await supabase
      .from("users")
      .select("city_id")
      .eq("id", actorId)
      .maybeSingle();
    const { data, error } = await supabase
      .from("notices")
      .insert({
        title,
        content,
        type: /urgent|jaruri/i.test(q) ? "urgent" : "general",
        posted_by: actorId,
        city_id: me?.city_id || null,
      })
      .select("id")
      .maybeSingle();
    if (error) return { handled: true, message: "Notice failed: " + error.message };
    await writeAuditLog({
      actorId,
      action: "god_post_notice",
      targetId: data?.id,
    });
    return {
      handled: true,
      message: `Notice published on Community Feed:\n“${title}”`,
    };
  }

  // --- List pending users ---
  if (/list\s+pending|pending\s+list|pending\s+members/i.test(lower)) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("full_name, phone, native_village, created_at")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return { handled: true, message: error.message };
    if (!data?.length) return { handled: true, message: "No pending members." };
    const lines = data.map(
      (u, i) =>
        `${i + 1}. ${u.full_name} · ${u.phone} · ${u.native_village || "-"}`
    );
    return { handled: true, message: "Pending members:\n" + lines.join("\n") };
  }

  // --- Delete notice by title fragment (careful) ---
  const delNotice = q.match(/delete\s+notice\s+(.+)/i);
  if (delNotice) {
    const frag = delNotice[1].trim();
    const supabase = createAdminClient();
    const { data: rows } = await supabase
      .from("notices")
      .select("id, title")
      .ilike("title", `%${frag}%`)
      .limit(5);
    if (!rows?.length) {
      return { handled: true, message: `No notice matching “${frag}”` };
    }
    const ids = rows.map((r) => r.id);
    const { error } = await supabase.from("notices").delete().in("id", ids);
    if (error) return { handled: true, message: error.message };
    await writeAuditLog({
      actorId,
      action: "god_delete_notice",
      meta: { titles: rows.map((r) => r.title) },
    });
    return {
      handled: true,
      message: `Deleted ${rows.length} notice(s): ${rows.map((r) => r.title).join("; ")}`,
    };
  }

  return { handled: false, message: "" };
}

/** Lightweight public info fetch (Wikipedia + DuckDuckGo-style) */
export async function fetchPublicInfo(query: string): Promise<string | null> {
  const q = query.trim();
  if (q.length < 3) return null;

  // Wikipedia summary
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      q.replace(/\s+/g, "_")
    )}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.extract) {
        return `Wikipedia:\n${data.title}\n${data.extract.slice(0, 800)}`;
      }
    }
  } catch {
    /* ignore */
  }

  // DuckDuckGo Instant Answer
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      if (data.AbstractText) {
        return `Web:\n${data.Heading || q}\n${String(data.AbstractText).slice(0, 800)}`;
      }
      if (data.Answer) {
        return `Web:\n${String(data.Answer).slice(0, 500)}`;
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

export function wantsWebInfo(message: string): boolean {
  return /what is|who is|tell me about|search|news|information|info about|kya hai|kaun hai|batao|google|internet|wikipedia/i.test(
    message
  );
}
