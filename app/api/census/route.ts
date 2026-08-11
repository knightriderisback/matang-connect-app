import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const family = body.family || {};
  const members = body.members || [];
  const supabase = createAdminClient();

  // Soft-warning duplicate family by contact phone (no hard block)
  let duplicateWarning: string | null = null;
  if (family.contact_phone) {
    const phone = String(family.contact_phone).replace(/\D/g, "").slice(-10);
    if (phone.length === 10) {
      const { data: existing } = await supabase
        .from("families")
        .select("id, head_of_family")
        .eq("contact_phone", phone)
        .limit(1);
      if (existing && existing.length > 0) {
        duplicateWarning = "A family with this contact phone may already exist. Saved with soft warning flag.";
      }
    }
  }

  const familyInsert: Record<string, unknown> = {
    head_of_family: session.userId,
    native_village: family.native_village || null,
    address: family.address || null,
    education_summary: family.education_summary || null,
    employment_status: family.employment_status || null,
    needs: family.needs ?? [],
  };
  // Optional columns — ignore if schema doesn't have them yet
  if (family.contact_phone) familyInsert.contact_phone = String(family.contact_phone).replace(/\D/g, "").slice(-10);
  if (duplicateWarning) familyInsert.duplicate_flag = true;

  let familyRow: any = null;
  let familyError: any = null;

  ({ data: familyRow, error: familyError } = await supabase
    .from("families")
    .insert(familyInsert)
    .select()
    .single());

  // Fallback if optional columns missing
  if (familyError && (familyError.message?.includes("contact_phone") || familyError.message?.includes("duplicate_flag"))) {
    delete familyInsert.contact_phone;
    delete familyInsert.duplicate_flag;
    ({ data: familyRow, error: familyError } = await supabase
      .from("families")
      .insert(familyInsert)
      .select()
      .single());
  }

  if (familyError) {
    console.error("census family insert error:", familyError.message);
    return NextResponse.json({ error: "Could not save family details", detail: familyError.message }, { status: 500 });
  }

  if (Array.isArray(members) && members.length > 0) {
    const rows = members.map((m: any) => {
      const age = m.age != null && m.age !== "" ? parseInt(m.age, 10) : ageFromDob(m.dob);
      return {
        family_id: familyRow.id,
        name: m.name,
        relation: m.relation || null,
        age: Number.isFinite(age) ? age : null,
        date_of_birth: m.dob || null,
        gender: m.gender || null,
        education_level: m.education_level || null,
        occupation: m.occupation || null,
        blood_group: m.blood_group || null,
        marital_status: m.marital_status || null,
        phone: m.phone ? String(m.phone).replace(/\D/g, "").slice(-10) : null,
        is_unemployed: !!m.is_unemployed,
        needs_care: !!m.needs_care,
        disability: m.disability || null,
        photo_url: m.photo || null,
      };
    });

    // Try full insert; fall back to core columns if schema lags
    let { error: membersError } = await supabase.from("family_members").insert(rows);
    if (membersError) {
      console.warn("full member insert failed, trying core columns:", membersError.message);
      const core = rows.map((r: any) => ({
        family_id: r.family_id,
        name: r.name,
        relation: r.relation,
        age: r.age,
        education_level: r.education_level,
        occupation: r.occupation,
        is_unemployed: r.is_unemployed,
        needs_care: r.needs_care,
      }));
      ({ error: membersError } = await supabase.from("family_members").insert(core));
      if (membersError) {
        console.error("census members insert error:", membersError.message);
        return NextResponse.json({ error: "Family saved, but members could not be added", detail: membersError.message }, { status: 500 });
      }
    }
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action: "census_submit",
    target_id: familyRow.id,
  });

  return NextResponse.json({
    success: true,
    familyId: familyRow.id,
    warning: duplicateWarning,
  });
}
