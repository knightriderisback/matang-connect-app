import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULTS, type FeatureFlags } from "@/lib/featureFlags";
import bcrypt from "bcryptjs";
import { writeAuditLog } from "@/lib/audit";

export type GodResult = {
  handled: boolean;
  message: string;
  data?: unknown;
};

const FLAG_PATTERNS: [RegExp, keyof FeatureFlags][] = [
  [/stage\s*1|stage_1|स्टेज\s*1/i, "stage_1_enabled"],
  [/stage\s*2|stage_2|स्टेज\s*2/i, "stage_2_enabled"],
  [/stage\s*3|stage_3|स्टेज\s*3/i, "stage_3_enabled"],
  [/\bsos\b|एसओएस|emergency\s*module/i, "sos_enabled"],
  [/\bjobs?\b|rojgar|नौकरी|रोजगार/i, "jobs_enabled"],
  [/notices?|feed|सूचना|पोस्ट\s*module/i, "notices_enabled"],
  [/\bcare\b|vridh|केयर|बुजुर्ग\s*सेवा/i, "care_enabled"],
  [/\bkosh\b|sahyog|कोष|सहयोग/i, "kosh_transparency_mode"],
  [/vyapar|व्यवसाय|बिज़नेस/i, "vyapar_enabled"],
  [/matrimony|शादी|विवाह/i, "matrimony_enabled"],
  [/dharohar|धरोहर/i, "dharohar_enabled"],
  [/panchang|पंचांग/i, "panchang_enabled"],
  [/mahila|महिला/i, "mahila_enabled"],
  [/polls?|मतदान|पोल/i, "polls_enabled"],
  [/arthik|आर्थिक/i, "arthik_enabled"],
  [/rides?|राइड/i, "rides_enabled"],
  [/gaurav|गौरव/i, "gaurav_enabled"],
  [/gamification|credits?|badge|क्रेडिट/i, "gamification_enabled"],
  [/\bscan\b|qr\s*scan/i, "scan_enabled"],
  [/titles?|पद/i, "titles_enabled"],
];

function detectFlag(q: string): keyof FeatureFlags | null {
  for (const [re, key] of FLAG_PATTERNS) {
    if (re.test(q)) return key;
  }
  return null;
}

function wantsOn(q: string): boolean {
  return /\b(on|enable|unlock|open|start|activate|चालू|खोल|सक्रिय|enable\s*kar|on\s*kar|chalu|khol)\b/i.test(
    q
  );
}
function wantsOff(q: string): boolean {
  return /\b(off|disable|lock|close|stop|deactivate|बंद|lock\s*kar|off\s*kar|band|disable\s*kar)\b/i.test(
    q
  );
}

async function setFlag(
  key: string,
  value: boolean,
  actorId: string
): Promise<string> {
  const supabase = createAdminClient();
  const payload = {
    setting_key: key,
    setting_value: value,
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  };
  let { error } = await supabase
    .from("app_settings")
    .upsert(payload, { onConflict: "setting_key" });
  if (error) {
    await supabase.from("app_settings").delete().eq("setting_key", key);
    ({ error } = await supabase.from("app_settings").insert(payload));
  }
  if (error) return `❌ ${key} save fail: ${error.message}`;
  await writeAuditLog({ actorId, action: "god_flag_set", meta: { key, value } });
  return `✅ ${key} → ${value ? "ON" : "OFF"}`;
}

function extractPhones(q: string): string[] {
  return (q.match(/\d{10}/g) || []).map((p) => p.slice(-10));
}
function extractPins(q: string): string[] {
  // 4-digit not part of a 10-digit phone: rough filter
  const pins: string[] = [];
  const re = /\b(\d{4})\b/g;
  let m;
  while ((m = re.exec(q))) {
    const start = m.index;
    const before = q[start - 1];
    const after = q[start + 4];
    if (before && /\d/.test(before)) continue;
    if (after && /\d/.test(after)) continue;
    pins.push(m[1]);
  }
  return pins;
}

export async function tryGodAction(
  message: string,
  actorId: string
): Promise<GodResult> {
  const q = message.trim();
  const lower = q.toLowerCase();

  // ===== FLAGS ON/OFF =====
  if (wantsOn(q) || wantsOff(q)) {
    const on = wantsOn(q) && !wantsOff(q);
    if (/all\s*(stage|module|feature)|saari|sab\s*(module|stage|feature)|सभी|सारे/i.test(q) && on) {
      const lines: string[] = [];
      for (const k of Object.keys(DEFAULTS)) {
        lines.push(await setFlag(k, true, actorId));
      }
      return { handled: true, message: lines.join("\n") };
    }
    if (/all\s*(stage|module|feature)|saari|sab\s*(module|stage)/i.test(q) && !on) {
      // don't turn off stage_1 by default for safety — only modules
      const lines: string[] = [];
      for (const k of Object.keys(DEFAULTS) as (keyof FeatureFlags)[]) {
        if (k === "stage_1_enabled") continue;
        lines.push(await setFlag(k, false, actorId));
      }
      return { handled: true, message: lines.join("\n") };
    }
    const key = detectFlag(q);
    if (key) {
      return { handled: true, message: await setFlag(key, on, actorId) };
    }
  }

  // ===== STATS =====
  if (
    /kitne|how many|count|total|stats|summary|status report|kitna|संख्या|काउंट|report|dashboard/i.test(
      lower
    )
  ) {
    const supabase = createAdminClient();
    const parts: string[] = [];
    for (const t of ["users", "notices", "jobs", "care_requests", "families"] as const) {
      const { count, error } = await supabase
        .from(t)
        .select("*", { count: "exact", head: true });
      parts.push(error ? `${t}: error` : `${t}: ${count ?? 0}`);
    }
    const { count: pending } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "pending");
    const { count: verified } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "verified");
    parts.push(`verified: ${verified ?? 0}`, `pending: ${pending ?? 0}`);
    await writeAuditLog({ actorId, action: "god_stats" });
    return { handled: true, message: "📊 Live data:\n" + parts.join("\n") };
  }

  // ===== VERIFY ALL =====
  if (
    /verify\s*all|approve\s*all|sab\s*verify|pending\s*(ko\s*)?(approve|verify)|सभी\s*verify|सब\s*verify|pending\s*sab/i.test(
      lower
    )
  ) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .update({ verification_status: "verified" })
      .eq("verification_status", "pending")
      .select("id, full_name, phone");
    if (error) return { handled: true, message: "❌ " + error.message };
    await writeAuditLog({
      actorId,
      action: "god_verify_all",
      meta: { count: data?.length || 0 },
    });
    const names = (data || []).slice(0, 10).map((u) => u.full_name).join(", ");
    return {
      handled: true,
      message: `✅ Verified ${data?.length || 0} member(s).${names ? "\n" + names : ""}`,
    };
  }

  // ===== VERIFY PHONE / single =====
  if (/verify|approve|सत्यापित|वेरिफाई/i.test(lower)) {
    const phones = extractPhones(q);
    if (phones[0]) {
      const phone = phones[0];
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("users")
        .update({ verification_status: "verified" })
        .eq("phone", phone)
        .select("id, full_name")
        .maybeSingle();
      if (error) return { handled: true, message: "❌ " + error.message };
      if (!data) return { handled: true, message: `❌ No user with phone ${phone}` };
      await writeAuditLog({
        actorId,
        action: "god_verify_user",
        targetId: data.id,
      });
      return {
        handled: true,
        message: `✅ Verified ${data.full_name} (${phone})`,
      };
    }
  }

  // ===== RESET MPIN =====
  if (/reset.*(?:m-?pin|pin)|(?:m-?pin|pin).*reset|पिन\s*reset|mpin\s*badal/i.test(lower)) {
    const phones = extractPhones(q);
    const pins = extractPins(q);
    const phone = phones[0];
    const pin = pins.find((p) => p !== phone?.slice(0, 4) && p !== phone?.slice(-4)) || pins[0];
    if (phone && pin && /^\d{4}$/.test(pin)) {
      const supabase = createAdminClient();
      const hash = await bcrypt.hash(pin, 10);
      const { data, error } = await supabase
        .from("users")
        .update({ m_pin_hash: hash })
        .eq("phone", phone)
        .select("id, full_name")
        .maybeSingle();
      if (error) return { handled: true, message: "❌ " + error.message };
      if (!data) return { handled: true, message: `❌ No user ${phone}` };
      await writeAuditLog({
        actorId,
        action: "god_reset_mpin",
        targetId: data.id,
      });
      return {
        handled: true,
        message: `✅ M-PIN for ${data.full_name} (${phone}) set to ${pin}`,
      };
    }
    return {
      handled: true,
      message:
        "Format: Reset M-PIN 9876543210 to 1234\n(phone 10 digit + new 4 digit PIN)",
    };
  }

  // ===== POST NOTICE =====
  if (
    /(?:post|create|add|publish|daal|dal|लिख|पोस्ट).*(?:notice|announcement|feed|सूचना|पोस्ट)|(?:notice|सूचना)\s*[:：\-]/i.test(
      lower
    )
  ) {
    let content = q
      .replace(
        /(?:please\s+)?(?:post|create|add|publish|daal|dalo|डालो|पोस्ट\s*karo?)\s*(?:a\s+)?(?:notice|announcement|feed|सूचना)?\s*[:：\-]?\s*/i,
        ""
      )
      .trim();
    if (!content || content.length < 2) {
      return {
        handled: true,
        message: "Format: Post notice: Meeting Sunday 10 AM at Samaj Bhavan",
      };
    }
    const title = content.split(/[.\n]/)[0].slice(0, 100);
    const supabase = createAdminClient();
    const { data: me } = await supabase
      .from("users")
      .select("city_id")
      .eq("id", actorId)
      .maybeSingle();
    const type = /urgent|jaruri|जरूरी/i.test(q)
      ? "urgent"
      : /shok|शोक/i.test(q)
        ? "shok_sandesh"
        : /meeting|बैठक/i.test(q)
          ? "meeting"
          : "general";
    const { data, error } = await supabase
      .from("notices")
      .insert({
        title,
        content,
        type,
        posted_by: actorId,
        city_id: me?.city_id || null,
      })
      .select("id, title")
      .maybeSingle();
    if (error) return { handled: true, message: "❌ Notice: " + error.message };
    await writeAuditLog({
      actorId,
      action: "god_post_notice",
      targetId: data?.id,
    });
    return {
      handled: true,
      message: `✅ Notice live on Home feed:\n“${data?.title || title}”`,
    };
  }

  // ===== LIST PENDING =====
  if (/list\s*pending|pending\s*(list|members|users)|pending\s*dikhao|pending\s*batao|कौन\s*pending/i.test(lower)) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("full_name, phone, native_village, created_at")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) return { handled: true, message: "❌ " + error.message };
    if (!data?.length) return { handled: true, message: "✅ No pending members." };
    return {
      handled: true,
      message:
        "Pending:\n" +
        data
          .map(
            (u, i) =>
              `${i + 1}. ${u.full_name} · ${u.phone} · ${u.native_village || "-"}`
          )
          .join("\n"),
    };
  }

  // ===== LIST / SEARCH USERS =====
  if (
    /list\s*(members|users)|sab\s*members|member\s*list|directory|user\s*list|सभी\s*सदस्य/i.test(
      lower
    )
  ) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("full_name, phone, role, verification_status, native_village")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return { handled: true, message: "❌ " + error.message };
    return {
      handled: true,
      message:
        `Members (latest ${data?.length || 0}):\n` +
        (data || [])
          .map(
            (u, i) =>
              `${i + 1}. ${u.full_name} · ${u.phone} · ${u.role} · ${u.verification_status}`
          )
          .join("\n"),
    };
  }

  // ===== FIND USER BY PHONE =====
  if (/find|search|dikhao|batao|खोज|ढूंढ/i.test(lower)) {
    const phones = extractPhones(q);
    if (phones[0]) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("users")
        .select(
          "full_name, phone, role, verification_status, native_village, qr_code_id, city_id"
        )
        .eq("phone", phones[0])
        .maybeSingle();
      if (error) return { handled: true, message: "❌ " + error.message };
      if (!data) return { handled: true, message: `❌ No user ${phones[0]}` };
      return {
        handled: true,
        message: `👤 ${data.full_name}
Phone: ${data.phone}
Role: ${data.role}
Status: ${data.verification_status}
Village: ${data.native_village || "-"}
QR: ${data.qr_code_id || "-"}`,
      };
    }
  }

  // ===== DELETE NOTICE =====
  const del = q.match(
    /(?:delete|remove|hatao|हटाओ|मिटा)\s+(?:notice|post|सूचना)?\s*[:：\-]?\s*(.+)/i
  );
  if (del || /delete\s+notice|notice\s+delete/i.test(lower)) {
    const frag = (del?.[1] || "").trim() || extractPhones(q)[0] || "";
    if (frag.length >= 2) {
      const supabase = createAdminClient();
      const { data: rows } = await supabase
        .from("notices")
        .select("id, title")
        .ilike("title", `%${frag.slice(0, 40)}%`)
        .limit(5);
      if (!rows?.length)
        return { handled: true, message: `❌ No notice matching “${frag}”` };
      await supabase
        .from("notices")
        .delete()
        .in(
          "id",
          rows.map((r) => r.id)
        );
      await writeAuditLog({
        actorId,
        action: "god_delete_notice",
        meta: { titles: rows.map((r) => r.title) },
      });
      return {
        handled: true,
        message: `✅ Deleted: ${rows.map((r) => r.title).join("; ")}`,
      };
    }
  }

  // ===== POST JOB =====
  if (/(?:post|add|create)\s+job|job\s+post|नौकरी\s*(?:डाल|पोस्ट)/i.test(lower)) {
    let desc = q
      .replace(/(?:post|add|create)\s+job\s*[:：\-]?\s*/i, "")
      .replace(/job\s+post\s*[:：\-]?\s*/i, "")
      .trim();
    if (desc.length < 3) {
      return {
        handled: true,
        message: "Format: Post job: Shop helper Bilaspur 10k",
      };
    }
    const supabase = createAdminClient();
    const { data: me } = await supabase
      .from("users")
      .select("city_id")
      .eq("id", actorId)
      .maybeSingle();
    const title = desc.slice(0, 80);
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        title,
        description: desc,
        posted_by: actorId,
        city_id: me?.city_id || null,
        status: "active",
      })
      .select("id, title")
      .maybeSingle();
    if (error) return { handled: true, message: "❌ Job: " + error.message };
    await writeAuditLog({
      actorId,
      action: "god_post_job",
      targetId: data?.id,
    });
    return { handled: true, message: `✅ Job posted: ${data?.title || title}` };
  }

  // ===== CURRENT FLAGS STATUS =====
  if (
    /flag\s*status|which\s*module|kya\s*on|kya\s*off|feature\s*status|stage\s*status/i.test(
      lower
    )
  ) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value");
    const lines = (data || [])
      .filter((r) => r.setting_key in DEFAULTS)
      .map((r) => {
        const v = r.setting_value;
        const on = v === true || v === "true";
        return `${r.setting_key}: ${on ? "ON" : "OFF"}`;
      });
    return {
      handled: true,
      message:
        lines.length > 0
          ? "Flags:\n" + lines.join("\n")
          : "No flag rows yet (defaults all ON for Super Admin).",
    };
  }

  return { handled: false, message: "" };
}

export async function fetchPublicInfo(query: string): Promise<string | null> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return null;
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
        return `🌐 ${data.title}\n${String(data.extract).slice(0, 900)}`;
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      q
    )}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      if (data.AbstractText)
        return `🌐 ${data.Heading || q}\n${String(data.AbstractText).slice(0, 900)}`;
      if (data.Answer) return `🌐 ${String(data.Answer).slice(0, 500)}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function wantsWebInfo(message: string): boolean {
  return /what is|who is|tell me about|search|news|information|info about|kya hai|kaun hai|batao about|wikipedia|internet|google|के बारे में|क्या है|कौन है/i.test(
    message
  );
}
