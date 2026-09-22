import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { getFeatureFlagsAdmin, type FeatureFlags } from "@/lib/featureFlags";
import {
  getFeatureRoleMatrix,
  matrixToLegacyFlags,
  getUserEffectiveFeatures,
  getUserVisibleModules,
} from "@/lib/featureRoleMatrix";

export async function GET() {
  try {
    const session = await getSession();
    let flags: FeatureFlags = await getFeatureFlagsAdmin();
    const matrix = await getFeatureRoleMatrix();

    if (!session?.userId) {
      const legacy = matrixToLegacyFlags(matrix, flags);
      return NextResponse.json(
        {
          flags: legacy,
          matrix,
          memberModules: [],
          stages: {
            s1: legacy.stage_1_enabled,
            s2: legacy.stage_2_enabled,
            s3: legacy.stage_3_enabled,
          },
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const { effective, overrides } = await getUserEffectiveFeatures(session.userId, session.role);
    const memberModules = await getUserVisibleModules(session.userId, session.role);

    // Reflect user's effective flags
    const effectiveFlags = { ...flags };
    for (const [k, v] of Object.entries(effective)) {
      if (k in effectiveFlags) {
        (effectiveFlags as any)[k] = v;
      }
    }

    return NextResponse.json(
      {
        flags: effectiveFlags,
        matrix,
        effective,
        overrides,
        memberModules,
        stages: {
          s1: effectiveFlags.stage_1_enabled,
          s2: effectiveFlags.stage_2_enabled,
          s3: effectiveFlags.stage_3_enabled,
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
