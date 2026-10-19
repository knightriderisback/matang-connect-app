import { createAdminClient } from "@/lib/supabase/admin";

type Supa = ReturnType<typeof createAdminClient>;

/**
 * SOS blood alert -> Parivar Form me blood group bhare compatible members (18-60) ke family head ko notification.
 * Donor ka phone/data kisi ko share nahi hota; sirf family head ko "aap madad kar sakte ho" notification jaati hai.
 */
export async function notifyBloodDonors(
  supabase: Supa,
  p: { alertId: string; group: string; cityId: string | null; raiserId: string; where?: string }
): Promise<number> {
  try {
    const { data } = await supabase.rpc("get_blood_donor_heads", {
      p_group: p.group,
      p_city: p.cityId,
      p_exclude: p.raiserId,
    });
    const heads = (data || []) as { head_user_id: string }[];
    if (heads.length === 0) return 0;
    const rows = heads.map((h) => ({
      user_id: h.head_user_id,
      title: `🩸 Blood needed (${p.group}) — you may be able to help`.slice(0, 100),
      body: `आपके परिवार में कोई सदस्य रक्तदान कर सकता है। Group needed: ${p.group}. ${p.where || ""} Open SOS to respond.`.slice(0, 300),
      type: "sos",
      ref_id: p.alertId,
      is_read: false,
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    return error ? 0 : rows.length;
  } catch {
    return 0;
  }
}

/**
 * Naya job -> skills match karne wale berozgaar members (Parivar Form) ke family head ko notification.
 */
export async function notifyJobSeekers(
  supabase: Supa,
  p: { jobId: string; title: string; description: string; cityId: string | null; posterId: string }
): Promise<number> {
  try {
    const { data } = await supabase.rpc("match_job_seeker_heads", {
      p_text: `${p.title} ${p.description}`,
      p_city: p.cityId,
      p_exclude: p.posterId,
    });
    const heads = (data || []) as { head_user_id: string; matched_skill: string }[];
    if (heads.length === 0) return 0;
    const rows = heads.map((h) => ({
      user_id: h.head_user_id,
      title: `💼 New job: ${p.title}`.slice(0, 100),
      body: `आपके परिवार के किसी सदस्य के कौशल (${h.matched_skill}) से यह नौकरी मेल खाती है। Open Jobs to see details.`.slice(0, 300),
      type: "job",
      ref_id: p.jobId,
      is_read: false,
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    return error ? 0 : rows.length;
  } catch {
    return 0;
  }
}
