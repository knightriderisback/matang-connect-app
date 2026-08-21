import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import {
  getModuleAccessLists,
  setAccessCell,
  saveModuleAccessLists,
  defaultAccessLists,
  type RoleCol,
} from "@/lib/moduleAccess";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  const lists = await getModuleAccessLists();
  return NextResponse.json({ lists });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));

  if (body.action === "reset") {
    const lists = await saveModuleAccessLists(defaultAccessLists());
    return NextResponse.json({ success: true, lists });
  }

  const key = body.key as string;
  const role = body.role as RoleCol;
  const view = body.view;
  if (!key || !["member", "volunteer", "core"].includes(role) || typeof view !== "boolean") {
    return NextResponse.json({ error: "key, role, view required" }, { status: 400 });
  }

  try {
    const lists = await setAccessCell(key, role, view);
    try {
      await writeAuditLog({
        actorId: session.userId,
        action: "module_access_cell",
        meta: { key, role, view },
      });
    } catch {
      /* ignore */
    }
    return NextResponse.json({ success: true, lists });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Save failed" }, { status: 500 });
  }
}
