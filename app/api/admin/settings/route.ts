import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { getFeatureFlagsAdmin, writeFeatureFlag, type FeatureFlags } from "@/lib/featureFlags";
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
