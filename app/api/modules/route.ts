import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { getUserVisibleModules } from "@/lib/featureRoleMatrix";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const modules = await getUserVisibleModules(session.userId, session.role);
    return NextResponse.json(
      {
        role: session.role,
        modules,
        source: "feature_matrix",
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        role: session.role,
        modules: [],
        error: err?.message,
      },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
