import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { getFeatureFlagsAdmin, writeFeatureFlag, writeAllFlags, DEFAULTS, type FeatureFlags } from "@/lib/featureFlags";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  const flags = await getFeatureFlagsAdmin();
  return NextResponse.json({ flags });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));

  if (body.action === "unlock_all") {
    const allOn = { ...DEFAULTS } as FeatureFlags;
    (Object.keys(DEFAULTS) as (keyof FeatureFlags)[]).forEach((k) => {
      (allOn as any)[k] = true;
    });
    const result = await writeAllFlags(allOn);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Failed", flags: result.flags }, { status: 500 });
    }
    // verify modules members care about
    const f = result.flags;
    const sample = {
      stage_2: f.stage_2_enabled,
      stage_3: f.stage_3_enabled,
      sos: f.sos_enabled,
      matrimony: f.matrimony_enabled,
      jobs: f.jobs_enabled,
    };
    return NextResponse.json({ success: true, flags: result.flags, sample });
  }

  const key = body.key as string;
  const value = body.value;
  if (!key || typeof value !== "boolean") {
    return NextResponse.json({ error: "key and boolean value required" }, { status: 400 });
  }

  const result = await writeFeatureFlag(key as keyof FeatureFlags, value, session.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Save failed" }, { status: 500 });
  }

  try {
    await writeAuditLog({
      actorId: session.userId,
      action: "feature_flag_toggle",
      meta: { key, value },
    });
  } catch {
    /* ignore */
  }

  return NextResponse.json({ success: true, flags: result.flags });
}
