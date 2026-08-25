import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

const STORE_KEY = "vanshawali_store";

type Person = {
  id: string;
  user_id: string | null;
  display_name: string;
  gender?: string | null;
  birth_year?: number | null;
  gotra?: string | null;
  photo_url?: string | null;
  created_by?: string;
  created_at?: string;
};

type Link = {
  id: string;
  from_id: string;
  to_id: string;
  /** from is father|mother|spouse of to, or from is parent of to when relation=child meaning from→child to */
  relation: "father" | "mother" | "spouse" | "child";
  status: "pending" | "verified" | "rejected";
  proposed_by: string;
  created_at: string;
};

type Store = { persons: Person[]; links: Link[] };

async function loadStore(supabase: any): Promise<Store> {
  const { data } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", STORE_KEY)
    .maybeSingle();
  const v = data?.setting_value;
  if (v && typeof v === "object" && Array.isArray((v as any).persons)) {
    return {
      persons: (v as any).persons || [],
      links: (v as any).links || [],
    };
  }
  return { persons: [], links: [] };
}

async function saveStore(supabase: any, store: Store, actor: string) {
  await supabase.from("app_settings").upsert(
    {
      setting_key: STORE_KEY,
      setting_value: store,
      updated_by: actor,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" }
  );
}

function uid() {
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ageFromYear(y?: number | null) {
  if (!y || y < 1900 || y > 2100) return null;
  return Math.max(0, new Date().getFullYear() - y);
}

/** Ensure a vansh person exists for a registered user */
async function ensurePersonForUser(
  store: Store,
  supabase: any,
  userId: string
): Promise<Person> {
  const existing = store.persons.find((p) => p.user_id === userId);
  if (existing) return existing;

  const { data: u } = await supabase
    .from("users")
    .select("id, full_name, photo_url, gender")
    .eq("id", userId)
    .maybeSingle();

  const person: Person = {
    id: uid(),
    user_id: userId,
    display_name: u?.full_name || "Member",
    gender: u?.gender || null,
    photo_url: u?.photo_url || null,
    birth_year: null,
    created_by: userId,
    created_at: new Date().toISOString(),
  };
  store.persons.push(person);
  return person;
}


function getParentsOf(
  store: Store,
  personId: string,
  showLink: (l: Link) => boolean,
  byId: (id: string) => Person | undefined
) {
  const out: { person: Person; relation: string; link: Link }[] = [];
  for (const l of store.links) {
    if (!showLink(l)) continue;
    if ((l.relation === "father" || l.relation === "mother") && l.to_id === personId) {
      const p = byId(l.from_id);
      if (p) out.push({ person: p, relation: l.relation, link: l });
    }
  }
  return out;
}

function getChildrenOf(
  store: Store,
  personId: string,
  showLink: (l: Link) => boolean,
  byId: (id: string) => Person | undefined
) {
  const out: { person: Person; relation: string; link: Link }[] = [];
  for (const l of store.links) {
    if (!showLink(l)) continue;
    if (l.relation === "child" && l.from_id === personId) {
      const p = byId(l.to_id);
      if (p) out.push({ person: p, relation: "child", link: l });
    } else if ((l.relation === "father" || l.relation === "mother") && l.from_id === personId) {
      const p = byId(l.to_id);
      if (p) out.push({ person: p, relation: "child", link: l });
    }
  }
  return out;
}

function buildTree(store: Store, centre: Person, viewerId: string, isStaff: boolean) {
  const showLink = (l: Link) =>
    l.status === "verified" ||
    l.proposed_by === viewerId ||
    isStaff ||
    centre.user_id === viewerId;

  const byId = (id: string) => store.persons.find((p) => p.id === id);

  const mapNode = (
    row: { person: Person; relation: string; link: Link },
    via?: { via_id?: string }
  ) => ({
    id: row.person.id,
    user_id: row.person.user_id,
    display_name: row.person.display_name,
    gender: row.person.gender,
    birth_year: row.person.birth_year,
    age: ageFromYear(row.person.birth_year),
    photo_url: row.person.photo_url,
    relation: row.relation,
    status: row.link.status,
    gotra: row.person.gotra,
    link_id: row.link.id,
    via_id: via?.via_id,
  });

  // Spouses of centre
  const spouses: { person: Person; relation: string; link: Link }[] = [];
  for (const l of store.links) {
    if (!showLink(l)) continue;
    if (l.relation === "spouse" && (l.from_id === centre.id || l.to_id === centre.id)) {
      const otherId = l.from_id === centre.id ? l.to_id : l.from_id;
      const p = byId(otherId);
      if (p) spouses.push({ person: p, relation: "spouse", link: l });
    }
  }

  // Infinite UP: levelsUp[0]=parents, [1]=grandparents, ...
  const levelsUp: ReturnType<typeof mapNode>[][] = [];
  let frontier = [centre.id];
  const seenUp = new Set<string>([centre.id]);
  for (let depth = 0; depth < 30; depth++) {
    const level: ReturnType<typeof mapNode>[] = [];
    const next: string[] = [];
    for (const pid of frontier) {
      for (const row of getParentsOf(store, pid, showLink, byId)) {
        if (seenUp.has(row.person.id)) continue;
        seenUp.add(row.person.id);
        level.push(mapNode(row, { via_id: pid }));
        next.push(row.person.id);
      }
    }
    if (!level.length) break;
    levelsUp.push(level);
    frontier = next;
  }

  // Infinite DOWN
  const levelsDown: ReturnType<typeof mapNode>[][] = [];
  frontier = [centre.id];
  const seenDown = new Set<string>([centre.id]);
  for (let depth = 0; depth < 30; depth++) {
    const level: ReturnType<typeof mapNode>[] = [];
    const next: string[] = [];
    for (const pid of frontier) {
      for (const row of getChildrenOf(store, pid, showLink, byId)) {
        if (seenDown.has(row.person.id)) continue;
        seenDown.add(row.person.id);
        level.push(mapNode(row, { via_id: pid }));
        next.push(row.person.id);
      }
    }
    if (!level.length) break;
    levelsDown.push(level);
    frontier = next;
  }

  // Legacy flat fields for compatibility
  const parents = levelsUp[0] || [];
  const children = levelsDown[0] || [];

  return {
    centre: {
      id: centre.id,
      user_id: centre.user_id,
      display_name: centre.display_name,
      gender: centre.gender,
      birth_year: centre.birth_year,
      age: ageFromYear(centre.birth_year),
      photo_url: centre.photo_url,
      relation: "self",
      status: "verified",
      gotra: centre.gotra,
    },
    spouses: spouses.map((r) => mapNode(r)),
    parents,
    children,
    levels_up: levelsUp,
    levels_down: levelsDown,
  };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = request.nextUrl.searchParams.get("userId") || session.userId;
  const supabase = createAdminClient();
  const store = await loadStore(supabase);
  const centre = await ensurePersonForUser(store, supabase, userId);
  // persist if new
  await saveStore(supabase, store, session.userId);

  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(session.role);
  const tree = buildTree(store, centre, session.userId, isStaff);

  // pending for centre owner / staff
  const pending = store.links.filter(
    (l) =>
      l.status === "pending" &&
      (isStaff ||
        l.proposed_by === session.userId ||
        centre.user_id === session.userId)
  );

  return NextResponse.json({
    tree,
    pending_count: pending.length,
    can_edit: session.userId === userId || session.role === "super_admin",
    is_owner: session.userId === userId,
    is_super_admin: session.role === "super_admin",
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body.action || "add";
  const supabase = createAdminClient();
  const store = await loadStore(supabase);
  const isStaff = ["core_committee", "super_admin"].includes(session.role);
  const isSA = session.role === "super_admin";

  if (action === "verify" || action === "reject") {
    const linkId = body.link_id;
    const link = store.links.find((l) => l.id === linkId);
    if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });
    // proposer cannot self-verify unless staff
    if (!isStaff && link.proposed_by === session.userId && action === "verify") {
      return NextResponse.json({ error: "Dusra member / staff verify kare" }, { status: 403 });
    }
    if (!isStaff && action === "verify") {
      // any logged-in family-ish: allow any member to confirm for day-1 simplicity, or only staff
      // User asked day-1 verify: staff OR other party — allow any authenticated non-proposer
    }
    link.status = action === "verify" ? "verified" : "rejected";
    await saveStore(supabase, store, session.userId);
    return NextResponse.json({ success: true, link });
  }

  if (action === "remove") {
    const linkId = String(body.link_id || "");
    const link = store.links.find((l) => l.id === linkId);
    if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });
    const centre = body.centre_person_id
      ? store.persons.find((p) => p.id === body.centre_person_id)
      : null;
    const touches =
      !centre ||
      link.from_id === centre.id ||
      link.to_id === centre.id;
    const allowed =
      isSA ||
      (centre?.user_id === session.userId && touches) ||
      (link.proposed_by === session.userId && !centre);
    if (!allowed) return NextResponse.json({ error: "Not allowed to remove" }, { status: 403 });
    store.links = store.links.filter((l) => l.id !== linkId);
    // prune orphan ghosts (no user_id, no remaining links)
    const used = new Set<string>();
    for (const l of store.links) {
      used.add(l.from_id);
      used.add(l.to_id);
    }
    store.persons = store.persons.filter(
      (p) => p.user_id || used.has(p.id) || p.created_by === session.userId
    );
    // keep persons that still linked
    store.persons = store.persons.filter((p) => p.user_id != null || used.has(p.id));
    await saveStore(supabase, store, session.userId);
    return NextResponse.json({ success: true });
  }

  // add relative — centre by user id OR vansh person id (extend branch)
  let centre: Person;
  if (body.centre_person_id) {
    const found = store.persons.find((p) => p.id === String(body.centre_person_id));
    if (!found) return NextResponse.json({ error: "Centre person not found" }, { status: 404 });
    // only owner of linked user or SA
    if (found.user_id && found.user_id !== session.userId && !isSA) {
      return NextResponse.json({ error: "Only own tree (or Super Admin)" }, { status: 403 });
    }
    if (!found.user_id && !isSA) {
      // ghost: allow if editor owns the root tree being viewed
      const rootUser = String(body.root_user_id || session.userId);
      if (rootUser !== session.userId && !isSA) {
        return NextResponse.json({ error: "Only own tree (or Super Admin)" }, { status: 403 });
      }
    }
    centre = found;
  } else {
    const centreUserId = body.centre_user_id || session.userId;
    if (centreUserId !== session.userId && !isSA) {
      return NextResponse.json({ error: "Only own tree (or Super Admin)" }, { status: 403 });
    }
    centre = await ensurePersonForUser(store, supabase, centreUserId);
  }
  const relation = String(body.relation || "").toLowerCase() as Link["relation"];
  if (!["father", "mother", "spouse", "child"].includes(relation)) {
    return NextResponse.json({ error: "relation: father|mother|spouse|child" }, { status: 400 });
  }

  let other: Person | null = null;
  if (body.member_user_id) {
    other = await ensurePersonForUser(store, supabase, String(body.member_user_id));
  } else {
    const name = String(body.display_name || "").trim();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const birth_year = body.birth_year ? parseInt(String(body.birth_year), 10) : null;
    other = {
      id: uid(),
      user_id: null,
      display_name: name,
      gender: body.gender || null,
      birth_year: birth_year && !isNaN(birth_year) ? birth_year : null,
      gotra: body.gotra || null,
      created_by: session.userId,
      created_at: new Date().toISOString(),
    };
    store.persons.push(other);
  }

  // auto-verify if staff
  const status: Link["status"] = isStaff ? "verified" : "pending";
  let link: Link;

  if (relation === "father" || relation === "mother") {
    link = {
      id: uid(),
      from_id: other.id,
      to_id: centre.id,
      relation,
      status,
      proposed_by: session.userId,
      created_at: new Date().toISOString(),
    };
  } else if (relation === "spouse") {
    link = {
      id: uid(),
      from_id: centre.id,
      to_id: other.id,
      relation: "spouse",
      status,
      proposed_by: session.userId,
      created_at: new Date().toISOString(),
    };
  } else {
    // child
    link = {
      id: uid(),
      from_id: centre.id,
      to_id: other.id,
      relation: "child",
      status,
      proposed_by: session.userId,
      created_at: new Date().toISOString(),
    };
  }

  store.links.push(link);
  await saveStore(supabase, store, session.userId);

  return NextResponse.json({ success: true, person: other, link });
}
