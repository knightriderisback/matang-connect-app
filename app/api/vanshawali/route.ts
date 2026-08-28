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
  /** ISO date YYYY-MM-DD when full DOB known */
  birth_date?: string | null;
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

function buildTree(store: Store, centre: Person, viewerId: string, isStaff: boolean) {
  const showLink = (l: Link) =>
    l.status === "verified" ||
    l.proposed_by === viewerId ||
    isStaff ||
    centre.user_id === viewerId;

  const byId = (id: string) => store.persons.find((p) => p.id === id);

  type Row = {
    person: Person;
    relation: string;
    link: Link;
    via_id?: string;
  };

  const mapNode = (row: Row) => ({
    id: row.person.id,
    user_id: row.person.user_id,
    display_name: row.person.display_name,
    gender: row.person.gender,
    birth_year: row.person.birth_year,
    birth_date: row.person.birth_date || null,
    age: ageFromYear(row.person.birth_year),
    photo_url: row.person.photo_url,
    relation: row.relation,
    status: row.link.status,
    gotra: row.person.gotra,
    link_id: row.link.id,
    via_id: row.via_id,
    via_parent_id: row.via_id,
    via_child_id: row.via_id,
  });

  /** Parents of personId */
  function parentsOf(personId: string): Row[] {
    const out: Row[] = [];
    for (const l of store.links) {
      if (!showLink(l)) continue;
      if ((l.relation === "father" || l.relation === "mother") && l.to_id === personId) {
        const p = byId(l.from_id);
        if (p) out.push({ person: p, relation: l.relation, link: l, via_id: personId });
      }
    }
    return out;
  }

  /** Children of personId */
  function childrenOf(personId: string): Row[] {
    const out: Row[] = [];
    const seen = new Set<string>();
    for (const l of store.links) {
      if (!showLink(l)) continue;
      let childId: string | null = null;
      if (l.relation === "child" && l.from_id === personId) childId = l.to_id;
      else if ((l.relation === "father" || l.relation === "mother") && l.from_id === personId)
        childId = l.to_id;
      if (!childId || seen.has(childId)) continue;
      seen.add(childId);
      const p = byId(childId);
      if (p) out.push({ person: p, relation: "child", link: l, via_id: personId });
    }
    return out;
  }

  function spousesOf(personId: string): Row[] {
    const out: Row[] = [];
    for (const l of store.links) {
      if (!showLink(l)) continue;
      if (l.relation !== "spouse") continue;
      if (l.from_id !== personId && l.to_id !== personId) continue;
      const otherId = l.from_id === personId ? l.to_id : l.from_id;
      const p = byId(otherId);
      if (p) out.push({ person: p, relation: "spouse", link: l });
    }
    return out;
  }

  // levels_up[0] = parents, [1] = grandparents, ...
  const levels_up: Row[][] = [];
  let frontier = [centre.id];
  const seenUp = new Set<string>([centre.id]);
  for (let depth = 0; depth < 12; depth++) {
    const next: Row[] = [];
    const nextIds: string[] = [];
    for (const id of frontier) {
      for (const row of parentsOf(id)) {
        if (seenUp.has(row.person.id)) continue;
        seenUp.add(row.person.id);
        next.push(row);
        nextIds.push(row.person.id);
      }
    }
    if (!next.length) break;
    levels_up.push(next);
    frontier = nextIds;
  }

  // levels_down[0] = children, [1] = grandchildren, ...
  const levels_down: Row[][] = [];
  frontier = [centre.id];
  const seenDown = new Set<string>([centre.id]);
  for (let depth = 0; depth < 12; depth++) {
    const next: Row[] = [];
    const nextIds: string[] = [];
    for (const id of frontier) {
      for (const row of childrenOf(id)) {
        if (seenDown.has(row.person.id)) continue;
        seenDown.add(row.person.id);
        next.push(row);
        nextIds.push(row.person.id);
      }
    }
    if (!next.length) break;
    levels_down.push(next);
    frontier = nextIds;
  }

  const parents = levels_up[0] || [];
  const grandparents = levels_up[1] || [];
  const children = levels_down[0] || [];
  const grandchildren = levels_down[1] || [];
  const spouses = spousesOf(centre.id);

  // Spouses of EVERY tree member (parents, kids, GP…) so they can show + marry-link
  const allTreeIds = new Set<string>([centre.id]);
  for (const lvl of levels_up) for (const r of lvl) allTreeIds.add(r.person.id);
  for (const lvl of levels_down) for (const r of lvl) allTreeIds.add(r.person.id);
  for (const s of spouses) allTreeIds.add(s.person.id);

  const spouses_of: Record<string, ReturnType<typeof mapNode>[]> = {};
  for (const id of Array.from(allTreeIds)) {
    const sp = spousesOf(id);
    if (sp.length) {
      spouses_of[id] = sp.map((row) => ({
        ...mapNode(row),
        via_id: id,
        relation: "spouse",
      }));
      for (const row of sp) allTreeIds.add(row.person.id);
    }
  }

  // Siblings of centre = other children of either parent (not centre)
  const siblingSeen = new Set<string>([centre.id]);
  const siblingRows: Row[] = [];
  for (const par of parents) {
    for (const row of childrenOf(par.person.id)) {
      if (siblingSeen.has(row.person.id)) continue;
      siblingSeen.add(row.person.id);
      siblingRows.push({
        ...row,
        relation: "sibling",
        via_id: par.person.id,
      });
    }
  }

  // Siblings of ANY tree person (uncle/aunt etc. when adding brother of father)
  const siblings_of: Record<string, ReturnType<typeof mapNode>[]> = {};
  for (const id of Array.from(allTreeIds)) {
    const pParents = parentsOf(id);
    if (!pParents.length) continue;
    const seen = new Set<string>([id]);
    const rows: ReturnType<typeof mapNode>[] = [];
    for (const par of pParents) {
      for (const row of childrenOf(par.person.id)) {
        if (seen.has(row.person.id)) continue;
        seen.add(row.person.id);
        // skip if already the centre's direct sibling list only for centre — still include in siblings_of
        rows.push({
          ...mapNode({ ...row, relation: "sibling", via_id: par.person.id }),
          relation: "sibling",
          via_id: par.person.id,
        });
      }
    }
    if (rows.length) siblings_of[id] = rows;
  }

  return {
    centre: {
      id: centre.id,
      user_id: centre.user_id,
      display_name: centre.display_name,
      gender: centre.gender,
      birth_year: centre.birth_year,
      birth_date: centre.birth_date || null,
      age: ageFromYear(centre.birth_year),
      photo_url: centre.photo_url,
      relation: "self",
      status: "verified",
      gotra: centre.gotra,
    },
    spouses: spouses.map(mapNode),
    parents: parents.map(mapNode),
    children: children.map(mapNode),
    grandparents: grandparents.map((row) => ({
      ...mapNode(row),
      via_parent_id: row.via_id,
    })),
    grandchildren: grandchildren.map((row) => ({
      ...mapNode(row),
      via_child_id: row.via_id,
    })),
    siblings: siblingRows.map((row) => ({
      ...mapNode(row),
      relation: "sibling",
      via_id: row.via_id,
    })),
    siblings_of,
    spouses_of,
    /** Infinite gens for auto canvas */
    levels_up: levels_up.map((lvl) =>
      lvl.map((row) => ({ ...mapNode(row), via_id: row.via_id, via_parent_id: row.via_id }))
    ),
    levels_down: levels_down.map((lvl) =>
      lvl.map((row) => ({ ...mapNode(row), via_id: row.via_id, via_child_id: row.via_id }))
    ),
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
    const rootUser = String(body.root_user_id || session.userId);
    const ownsTree = rootUser === session.userId || isSA;
    const centre = body.centre_person_id
      ? store.persons.find((p) => p.id === body.centre_person_id)
      : null;
    const allowed =
      ownsTree ||
      centre?.user_id === session.userId ||
      link.proposed_by === session.userId;
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

  if (action === "edit") {
    const personId = String(body.person_id || "");
    const person = store.persons.find((p) => p.id === personId);
    if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 });
    const rootUser = String(body.root_user_id || session.userId);
    const ownsTree = rootUser === session.userId || isSA;
    const allowed =
      ownsTree ||
      person.created_by === session.userId ||
      (!person.user_id && store.links.some((l) => {
        const other = l.from_id === personId ? l.to_id : l.to_id === personId ? l.from_id : null;
        if (!other) return false;
        const o = store.persons.find((p) => p.id === other);
        return o?.user_id === session.userId;
      }));
    if (!allowed) return NextResponse.json({ error: "Not allowed to edit" }, { status: 403 });
    if (body.display_name != null) {
      const name = String(body.display_name).trim();
      if (name) person.display_name = name;
    }
    if (body.birth_year !== undefined) {
      const by = body.birth_year ? parseInt(String(body.birth_year), 10) : null;
      person.birth_year = by && !isNaN(by) ? by : null;
    }
    if (body.birth_date !== undefined) {
      const bd = body.birth_date ? String(body.birth_date).slice(0, 10) : null;
      person.birth_date = bd || null;
      if (bd && /^\d{4}/.test(bd)) {
        const y = parseInt(bd.slice(0, 4), 10);
        if (!isNaN(y)) person.birth_year = y;
      }
    }
    if (body.gender !== undefined) {
      person.gender = body.gender || null;
    }
    if (body.relation && body.link_id) {
      const link = store.links.find((l) => l.id === String(body.link_id));
      const rel = String(body.relation).toLowerCase();
      if (link && ["father", "mother", "spouse", "child"].includes(rel)) {
        link.relation = rel as Link["relation"];
      }
    }
    await saveStore(supabase, store, session.userId);
    return NextResponse.json({ success: true, person });
  }


  let centre: Person;
  // Tree owner (root profile) may edit ANY node in their vanshawali; SA always
  const rootUser = String(body.root_user_id || body.centre_user_id || session.userId);
  const ownsTree = rootUser === session.userId || isSA;
  if (body.centre_person_id) {
    const found = store.persons.find((p) => p.id === String(body.centre_person_id));
    if (!found) return NextResponse.json({ error: "Centre person not found" }, { status: 404 });
    if (!ownsTree) {
      return NextResponse.json({ error: "Only own tree (or Super Admin)" }, { status: 403 });
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
    const birth_date = body.birth_date ? String(body.birth_date).slice(0, 10) : null;
    let birth_year = body.birth_year ? parseInt(String(body.birth_year), 10) : null;
    if (birth_date && /^\d{4}/.test(birth_date)) {
      const y = parseInt(birth_date.slice(0, 4), 10);
      if (!isNaN(y)) birth_year = y;
    }
    other = {
      id: uid(),
      user_id: null,
      display_name: name,
      gender: body.gender || null,
      birth_year: birth_year && !isNaN(birth_year) ? birth_year : null,
      birth_date: birth_date || null,
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

  // Dual-parent + co-parents: child belongs with spouse AND any co-parent
  // (e.g. sibling of self → auto-link both father AND mother)
  if (relation === "child") {
    const coParentIds = new Set<string>();
    // 1) spouses of centre
    for (const l of store.links) {
      if (l.relation !== "spouse") continue;
      if (l.from_id !== centre.id && l.to_id !== centre.id) continue;
      if (!(l.status === "verified" || l.proposed_by === session.userId || isStaff)) continue;
      coParentIds.add(l.from_id === centre.id ? l.to_id : l.from_id);
    }
    // 2) other parents of existing children of centre (mother when adding via father, etc.)
    for (const l of store.links) {
      if (l.relation !== "child" || l.from_id !== centre.id) continue;
      if (!(l.status === "verified" || l.proposed_by === session.userId || isStaff)) continue;
      const kidId = l.to_id;
      for (const pl of store.links) {
        if (pl.to_id !== kidId) continue;
        if (pl.relation !== "father" && pl.relation !== "mother" && pl.relation !== "child")
          continue;
        const pid = pl.relation === "child" ? pl.from_id : pl.from_id;
        if (pl.relation === "father" || pl.relation === "mother") {
          if (pl.from_id !== centre.id) coParentIds.add(pl.from_id);
        }
      }
    }
    // 3) if centre is father/mother of someone, their co-parent on same child
    for (const l of store.links) {
      if ((l.relation === "father" || l.relation === "mother") && l.from_id === centre.id) {
        const kidId = l.to_id;
        for (const pl of store.links) {
          if (pl.to_id !== kidId) continue;
          if (pl.relation !== "father" && pl.relation !== "mother") continue;
          if (pl.from_id !== centre.id) coParentIds.add(pl.from_id);
        }
      }
    }
    for (const spouseId of Array.from(coParentIds)) {
      if (spouseId === other.id || spouseId === centre.id) continue;
      const already = store.links.some(
        (l) =>
          (l.relation === "child" && l.from_id === spouseId && l.to_id === other.id) ||
          ((l.relation === "father" || l.relation === "mother") &&
            l.from_id === spouseId &&
            l.to_id === other.id)
      );
      if (already) continue;
      store.links.push({
        id: uid(),
        from_id: spouseId,
        to_id: other.id,
        relation: "child",
        status,
        proposed_by: session.userId,
        created_at: new Date().toISOString(),
      });
    }
  }

  // If adding spouse to someone who already has children, link new spouse → those children
  if (relation === "spouse") {
    const kids = store.links.filter(
      (l) =>
        l.relation === "child" &&
        l.from_id === centre.id &&
        (l.status === "verified" || l.proposed_by === session.userId || isStaff)
    );
    for (const kl of kids) {
      const already = store.links.some(
        (l) =>
          l.relation === "child" &&
          l.from_id === other.id &&
          l.to_id === kl.to_id
      );
      if (already) continue;
      store.links.push({
        id: uid(),
        from_id: other.id,
        to_id: kl.to_id,
        relation: "child",
        status,
        proposed_by: session.userId,
        created_at: new Date().toISOString(),
      });
    }
  }

  await saveStore(supabase, store, session.userId);

  return NextResponse.json({ success: true, person: other, link });
}
