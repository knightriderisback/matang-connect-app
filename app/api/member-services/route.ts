import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import {
  getMemberAllowlist,
  setMemberAllowlist,
  getEffectiveModulesForUser,
  resetAllPersonalModuleOverrides,
  ALL_MEMBER_MODULE_KEYS,
} from "@/lib/memberServices";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.role === "super_admin") {
    const keys = await getMemberAllowlist();
    return NextResponse.json(
      { keys, all: ALL_MEMBER_MODULE_KEYS, scope: "global" },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
  const keys = await getEffectiveModulesForUser(session.userId);
  return NextResponse.json(
    { keys, all: ALL_MEMBER_MODULE_KEYS, scope: "effective" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));

  if (body.action === "reset_personal") {
    const result = await resetAllPersonalModuleOverrides();
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({
      success: true,
      cleared: result.cleared,
      message: "Personal overrides cleared — members follow global",
    });
  }

  if (body.action === "set" && Array.isArray(body.keys)) {
    const result = await setMemberAllowlist(body.keys);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ success: true, keys: result.keys });
  }

  if (body.action === "toggle" && typeof body.key === "string") {
    const current = await getMemberAllowlist();
    const on = body.value === true;
    const next = on
      ? current.includes(body.key) ? current : [...current, body.key]
      : current.filter((k) => k !== body.key);
    const result = await setMemberAllowlist(next);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ success: true, keys: result.keys });
  }

  if (body.action === "enable_all") {
    const result = await setMemberAllowlist([...ALL_MEMBER_MODULE_KEYS]);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ success: true, keys: result.keys });
  }

  if (body.action === "disable_all") {
    const result = await setMemberAllowlist([]);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ success: true, keys: result.keys });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
