import { NextResponse } from "next/server";
import { getFeatureFlagsAdmin } from "@/lib/featureFlags";

/** Public feature flags for client gating (no secrets). */
export async function GET() {
  const flags = await getFeatureFlagsAdmin();
  return NextResponse.json({ flags });
}
