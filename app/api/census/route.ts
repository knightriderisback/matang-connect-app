import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { family, members } = await request.json();
  const supabase = createAdminClient();

  const { data: familyRow, error: familyError } = await supabase
    .from("families")
    .insert({
      head_of_family: session.userId,
      native_village: family.native_village,
      address: family.address,
      education_summary: family.education_summary,
      employment_status: family.employment_status,
      needs: family.needs ?? [],
    })
    .select()
    .single();

  if (familyError) {
    console.error("census family insert error:", familyError.message);
    return NextResponse.json({ error: "Could not save family details" }, { status: 500 });
  }

  if (Array.isArray(members) && members.length > 0) {
    const rows = members.map((m: any) => ({
      family_id: familyRow.id,
      name: m.name,
      relation: m.relation,
      age: parseInt(m.age, 10) || null,
      education_level: m.education_level || null,
      occupation: m.occupation || null,
      is_unemployed: !!m.is_unemployed,
      needs_care: !!m.needs_care,
    }));
    const { error: membersError } = await supabase.from("family_members").insert(rows);
    if (membersError) {
      console.error("census members insert error:", membersError.message);
      return NextResponse.json({ error: "Family saved, but members could not be added" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, familyId: familyRow.id });
}
