import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

type SearchHit = {
  id: string;
  full_name: string;
  native_village?: string;
  photo_url?: string | null;
  is_registered?: boolean;
};

/**
 * Unified search for vanshawali link:
 * - Registered community members (from users table)
 * - Existing unregistered family ancestors (from vanshawali_persons table where user_id IS NULL)
 *
 * Avoids duplicates, provides clear contextual badges, and maintains 100% frontend compatibility.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ users: [] });

  const supabase = createAdminClient();
  const qLower = q.toLowerCase();
  const hits: SearchHit[] = [];

  // 1. Query registered users (prioritized)
  try {
    const { data: usersData } = await supabase
      .from("users")
      .select("id, full_name, native_village, photo_url, role, verification_status")
      .ilike("full_name", `%${q}%`)
      .neq("id", session.userId)
      .limit(10);

    if (usersData && usersData.length > 0) {
      for (const u of usersData) {
        hits.push({
          id: u.id,
          full_name: u.full_name,
          native_village: u.native_village ? `📍 ${u.native_village}` : "Registered Member",
          photo_url: u.photo_url || null,
          is_registered: true,
        });
      }
    }
  } catch (err) {
    console.error("Vanshawali search users error:", err);
  }

  // 2. Query existing unregistered ancestors in vanshawali_persons (if table exists)
  try {
    const { data: personsData } = await supabase
      .from("vanshawali_persons")
      .select("id, legacy_id, display_name, birth_year, photo_url, user_id")
      .is("user_id", null)
      .ilike("display_name", `%${q}%`)
      .limit(10);

    if (personsData && personsData.length > 0) {
      for (const p of personsData) {
        // Avoid returning duplicate if already listed
        const pId = p.legacy_id || p.id;
        if (!hits.some((h) => h.id === pId || h.full_name.toLowerCase() === p.display_name.toLowerCase())) {
          hits.push({
            id: pId,
            full_name: p.display_name,
            native_village: p.birth_year ? `🌳 Ancestor (b. ${p.birth_year})` : "🌳 Family Ancestor",
            photo_url: p.photo_url || null,
            is_registered: false,
          });
        }
      }
    }
  } catch (_err) {
    // Graceful fallback if relational table is not yet deployed
  }

  // Fallback if ILIKE returned empty: try fallback filter across top users
  if (hits.length === 0) {
    try {
      const { data: allUsers } = await supabase
        .from("users")
        .select("id, full_name, native_village, photo_url")
        .neq("id", session.userId)
        .limit(50);

      const filtered = (allUsers || [])
        .filter((u) => String(u.full_name || "").toLowerCase().includes(qLower))
        .slice(0, 10);

      for (const u of filtered) {
        hits.push({
          id: u.id,
          full_name: u.full_name,
          native_village: u.native_village ? `📍 ${u.native_village}` : "Registered Member",
          photo_url: u.photo_url || null,
          is_registered: true,
        });
      }
    } catch (_err) {}
  }

  return NextResponse.json({ users: hits.slice(0, 15) });
}
