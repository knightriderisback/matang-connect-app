import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import {
  getFeatureRoleMatrix,
  setMatrixCell,
  MATRIX_FLAG_KEYS,
  type RoleCol,
  memberModulesFromMatrix,
} from "@/lib/featureRoleMatrix";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  const matrix = await getFeatureRoleMatrix();
  const memberModules = memberModulesFromMatrix(matrix);
  return NextResponse.json({
    matrix,
    keys: MATRIX_FLAG_KEYS,
    memberModules,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const key = body.key as string;
  const role = body.role as RoleCol;
  const view = body.view;

  if (!key || !["member", "volunteer", "core"].includes(role) || typeof view !== "boolean") {
    return NextResponse.json({ error: "key, role (member|volunteer|core), view boolean required" }, { status: 400 });
  }

  const result = await setMatrixCell(key, role, view);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Save failed" }, { status: 500 });
  }

  try {
    await writeAuditLog({
      actorId: session.userId,
      action: "set_module_access",
      meta: { key, role, view },
    });
  } catch {
    /* ignore */
  }

  return NextResponse.json({ success: true, matrix: result.matrix, memberModules: result.memberModules });
}
