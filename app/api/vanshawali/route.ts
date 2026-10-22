import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

const STORE_KEY = "vanshawali_store";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NEIGHBOURHOOD_DEPTH = 4;
const VIEW_DEPTH = 8;
const MIN_PARENT_GAP = 12;

export type Person = {
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
  legacy_id?: string | null;
};

export type Link = {
  id: string;
  from_id: string;
  to_id: string;
  /** from is father|mother|spouse of to, or from is parent of to when relation=child meaning from→child to */
  relation: "father" | "mother" | "spouse" | "child";
  status: "pending" | "verified" | "rejected";
  proposed_by: string;
  created_at: string;
  legacy_id?: string | null;
};

export type Store = { persons: Person[]; links: Link[] };

/** canonical id (legacy_id ya uuid) -> real DB uuid */
type Ctx = { personUuid: Map<string, string>; linkUuid: Map<string, string> };

class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function uid() {
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ageFromYear(y?: number | null) {
  if (!y || y < 1900 || y > 2100) return null;
  return Math.max(0, new Date().getFullYear() - y);
}

function normGender(g: unknown): "male" | "female" | "other" | null {
  const s = String(g ?? "").trim().toLowerCase();
  if (s === "male" || s === "m" || s === "man") return "male";
  if (s === "female" || s === "f" || s === "woman") return "female";
  if (s === "other") return "other";
  return null;
}

/** DB error ko chhupana nahi: log + clear error user ko */
function fail(error: { message?: string; code?: string } | null | undefined, what: string): void {
  if (!error) return;
  console.error(`vanshawali: ${what} failed:`, error.message);
  throw new ApiError(`${what} failed. Please try again.`, 500);
}

function uuidOf(ctx: Ctx, map: "person" | "link", key: string): string | undefined {
  const m = map === "person" ? ctx.personUuid : ctx.linkUuid;
  return m.get(key) ?? (UUID_RE.test(key) ? key : undefined);
}

// ----------------------------------------------------------------------------
// DATA ACCESS LAYER
// ----------------------------------------------------------------------------

async function isRelationalActive(supabase: any): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from("vanshawali_persons")
      .select("id", { count: "exact", head: true });
    return !error && typeof count === "number" && count > 0;
  } catch {
    return false;
  }
}

async function loadRelationalStore(supabase: any): Promise<{ store: Store; ctx: Ctx }> {
  const { data: personsData, error: pErr } = await supabase
    .from("vanshawali_persons")
    .select("id, legacy_id, user_id, display_name, gender, birth_year, birth_date, gotra, photo_url, created_by, created_at");

  const { data: linksData, error: lErr } = await supabase
    .from("vanshawali_relationships")
    .select("id, legacy_id, from_person_id, to_person_id, relation, status, proposed_by, created_at");

  if (pErr || lErr || !personsData) {
    throw new Error(`Failed to load relational store: ${pErr?.message || lErr?.message}`);
  }

  const idMap = new Map<string, string>(); // uuid/legacy -> canonical
  const ctx: Ctx = { personUuid: new Map(), linkUuid: new Map() };
  for (const p of personsData) {
    const canonicalId = p.legacy_id || p.id;
    idMap.set(p.id, canonicalId);
    if (p.legacy_id) idMap.set(p.legacy_id, canonicalId);
    ctx.personUuid.set(canonicalId, p.id);
  }

  const persons: Person[] = personsData.map((p: any) => ({
    id: p.legacy_id || p.id,
    user_id: p.user_id || null,
    display_name: p.display_name,
    gender: p.gender || null,
    birth_year: p.birth_year || null,
    birth_date: p.birth_date ? String(p.birth_date).slice(0, 10) : null,
    gotra: p.gotra || null,
    photo_url: p.photo_url || null,
    created_by: p.created_by || undefined,
    created_at: p.created_at || undefined,
    legacy_id: p.legacy_id || null,
  }));

  const links: Link[] = (linksData || []).map((l: any) => {
    const canonical = l.legacy_id || l.id;
    ctx.linkUuid.set(canonical, l.id);
    return {
      id: canonical,
      from_id: idMap.get(l.from_person_id) || l.from_person_id,
      to_id: idMap.get(l.to_person_id) || l.to_person_id,
      relation: l.relation as Link["relation"],
      status: l.status as Link["status"],
      proposed_by: l.proposed_by,
      created_at: l.created_at,
      legacy_id: l.legacy_id || null,
    };
  });

  return { store: { persons, links }, ctx };
}

async function loadLegacyStore(supabase: any): Promise<Store> {
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

async function loadStore(supabase: any): Promise<{ store: Store; isRelational: boolean; ctx: Ctx }> {
  const relational = await isRelationalActive(supabase);
  if (relational) {
    try {
      const { store, ctx } = await loadRelationalStore(supabase);
      return { store, isRelational: true, ctx };
    } catch (err) {
      console.warn("Relational store load failed, falling back to legacy JSON:", err);
    }
  }
  const store = await loadLegacyStore(supabase);
  return { store, isRelational: false, ctx: { personUuid: new Map(), linkUuid: new Map() } };
}

/**
 * Relational mode me tables hi sach hain, snapshot nahi likhte (pehle har GET par poora JSON
 * dobara likha jaata tha). Sirf legacy fallback mode me JSON persist hota hai.
 */
async function persistStore(supabase: any, store: Store, actor: string, isRelational: boolean) {
  if (isRelational) return;
  await supabase.from("app_settings").upsert(
    { setting_key: STORE_KEY, setting_value: store, updated_by: actor, updated_at: new Date().toISOString() },
    { onConflict: "setting_key" }
  );
}

async function audit(
  supabase: any,
  actor: string,
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown,
  after: unknown
) {
  try {
    await supabase.from("vanshawali_audit").insert({
      actor_id: actor,
      action,
      entity,
      entity_id: entityId,
      before_data: before ?? null,
      after_data: after ?? null,
    });
  } catch {
    /* audit best-effort */
  }
}

async function ensurePersonForUser(
  store: Store,
  ctx: Ctx,
  supabase: any,
  userId: string,
  isRelational: boolean,
  actorId: string,
  persist = true
): Promise<Person> {
  const existing = store.persons.find((p) => p.user_id === userId);
  if (existing) return existing;

  const { data: u } = await supabase
    .from("users")
    .select("id, full_name, photo_url, gender")
    .eq("id", userId)
    .maybeSingle();
  if (!u) throw new ApiError("Member not found", 404);

  const generatedId = uid();
  const person: Person = {
    id: generatedId,
    user_id: userId,
    display_name: u.full_name || "Member",
    gender: normGender(u.gender),
    photo_url: u.photo_url || null,
    birth_year: null,
    created_by: actorId,
    created_at: new Date().toISOString(),
  };

  if (!persist) return person; // sirf dekhne ke liye, DB me nahi likhte
  store.persons.push(person);

  if (isRelational) {
    const { data, error } = await supabase
      .from("vanshawali_persons")
      .insert({
        legacy_id: generatedId,
        user_id: userId,
        display_name: person.display_name,
        gender: person.gender,
        photo_url: person.photo_url,
        created_by: actorId,
      })
      .select("id")
      .single();
    fail(error, "Creating person");
    ctx.personUuid.set(generatedId, data.id);
  }
  return person;
}

// ----------------------------------------------------------------------------
// GRAPH HELPERS (validation / authorization)
// ----------------------------------------------------------------------------

function personOfUser(store: Store, userId: string): Person | undefined {
  return store.persons.find((p) => p.user_id === userId);
}

/** Undirected BFS (rejected links ignore) — "apne tree ke aas-paas" ke log */
function neighbourhood(store: Store, startId: string, depth = NEIGHBOURHOOD_DEPTH): Set<string> {
  const adj = new Map<string, string[]>();
  for (const l of store.links) {
    if (l.status === "rejected") continue;
    if (!adj.has(l.from_id)) adj.set(l.from_id, []);
    if (!adj.has(l.to_id)) adj.set(l.to_id, []);
    adj.get(l.from_id)!.push(l.to_id);
    adj.get(l.to_id)!.push(l.from_id);
  }
  const seen = new Set<string>([startId]);
  let frontier = [startId];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of adj.get(id) || []) {
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    if (!next.length) break;
    frontier = next;
  }
  return seen;
}

/** parent -> child edges se: kya `ancestorId` se `descendantId` tak pahuncha ja sakta hai? */
function isAncestorOf(store: Store, ancestorId: string, descendantId: string): boolean {
  const kids = new Map<string, string[]>();
  for (const l of store.links) {
    if (l.status === "rejected") continue;
    if (l.relation === "child" || l.relation === "father" || l.relation === "mother") {
      if (!kids.has(l.from_id)) kids.set(l.from_id, []);
      kids.get(l.from_id)!.push(l.to_id);
    }
  }
  const seen = new Set<string>([ancestorId]);
  const stack = [ancestorId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const k of kids.get(cur) || []) {
      if (k === descendantId) return true;
      if (!seen.has(k)) {
        seen.add(k);
        stack.push(k);
      }
    }
  }
  return false;
}

function cleanName(raw: unknown): string {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2) throw new ApiError("Name kam se kam 2 akshar ka hona chahiye");
  if (name.length > 80) throw new ApiError("Name bahut lamba hai (max 80)");
  return name;
}

function cleanBirthYear(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const y = parseInt(String(raw), 10);
  if (isNaN(y) || y < 1800 || y > new Date().getFullYear()) throw new ApiError("Birth year sahi nahi hai");
  return y;
}

// ----------------------------------------------------------------------------
// TREE ASSEMBLY (unchanged logic)
// ----------------------------------------------------------------------------

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

  function parentsOf(personId: string): Row[] {
    const out: Row[] = [];
    const seen = new Set<string>();
    for (const l of store.links) {
      if (!showLink(l)) continue;
      if (l.status === "rejected") continue;
      let parentId: string | null = null;
      let rel: "father" | "mother" = "father";
      if ((l.relation === "father" || l.relation === "mother") && l.to_id === personId) {
        parentId = l.from_id;
        rel = l.relation;
      } else if (l.relation === "child" && l.to_id === personId) {
        parentId = l.from_id;
        const p = byId(parentId);
        rel = p?.gender === "female" ? "mother" : "father";
      }
      if (!parentId || seen.has(parentId)) continue;
      seen.add(parentId);
      const p = byId(parentId);
      if (p) out.push({ person: p, relation: rel, link: l, via_id: personId });
    }
    return out;
  }

  function childrenOf(personId: string): Row[] {
    const out: Row[] = [];
    const seen = new Set<string>();
    for (const l of store.links) {
      if (!showLink(l)) continue;
      if (l.status === "rejected") continue;
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
      if (l.status === "rejected") continue;
      if (l.relation !== "spouse") continue;
      if (l.from_id !== personId && l.to_id !== personId) continue;
      const otherId = l.from_id === personId ? l.to_id : l.from_id;
      const p = byId(otherId);
      if (p) out.push({ person: p, relation: "spouse", link: l });
    }
    return out;
  }

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

  // 1. Siblings of centre (children of centre's parents)
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

  // 2. Uncles and aunts (siblings of centre's parents, i.e. children of grandparents)
  const uncleAuntRows: Row[] = [];
  const parentIds = new Set(parents.map((p) => p.person.id));
  parentIds.add(centre.id);
  for (const gp of grandparents) {
    for (const row of childrenOf(gp.person.id)) {
      if (parentIds.has(row.person.id)) continue;
      parentIds.add(row.person.id);
      uncleAuntRows.push({
        ...row,
        relation: "sibling",
        via_id: gp.person.id,
      });
    }
  }

  // 3. Initial full tree IDs
  const allTreeIds = new Set<string>([centre.id]);
  for (const lvl of levels_up) for (const r of lvl) allTreeIds.add(r.person.id);
  for (const lvl of levels_down) for (const r of lvl) allTreeIds.add(r.person.id);
  for (const s of spouses) allTreeIds.add(s.person.id);
  for (const s of siblingRows) allTreeIds.add(s.person.id);
  for (const u of uncleAuntRows) allTreeIds.add(u.person.id);

  // 4. Iteratively discover spouses and children (up to 3 passes to get full connected family)
  const spouses_of: Record<string, ReturnType<typeof mapNode>[]> = {};
  const children_of: Record<string, ReturnType<typeof mapNode>[]> = {};

  for (let pass = 0; pass < 3; pass++) {
    let newlyFound = 0;
    const currentIds = Array.from(allTreeIds);
    for (const id of currentIds) {
      if (!spouses_of[id]) {
        const sp = spousesOf(id);
        if (sp.length) {
          spouses_of[id] = sp.map((row) => ({
            ...mapNode(row),
            via_id: id,
            relation: "spouse",
          }));
          for (const row of sp) {
            if (!allTreeIds.has(row.person.id)) {
              allTreeIds.add(row.person.id);
              newlyFound++;
            }
          }
        }
      }

      if (!children_of[id]) {
        const ch = childrenOf(id);
        if (ch.length) {
          children_of[id] = ch.map((row) => ({
            ...mapNode(row),
            via_id: id,
            relation: "child",
          }));
          for (const row of ch) {
            if (!allTreeIds.has(row.person.id)) {
              allTreeIds.add(row.person.id);
              newlyFound++;
            }
          }
        }
      }
    }
    if (newlyFound === 0) break;
  }

  // 5. Siblings of everyone in the tree
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
    uncles_and_aunts: uncleAuntRows.map((row) => ({
      ...mapNode(row),
      relation: "sibling",
      via_id: row.via_id,
    })),
    siblings_of,
    spouses_of,
    children_of,
    levels_up: levels_up.map((lvl) =>
      lvl.map((row) => ({ ...mapNode(row), via_id: row.via_id, via_parent_id: row.via_id }))
    ),
    levels_down: levels_down.map((lvl) =>
      lvl.map((row) => ({ ...mapNode(row), via_id: row.via_id, via_child_id: row.via_id }))
    ),
  };
}

// ----------------------------------------------------------------------------
// WRITE HELPERS (relational)
// ----------------------------------------------------------------------------

async function insertLinkRow(supabase: any, ctx: Ctx, link: Link, actor: string) {
  const from = uuidOf(ctx, "person", link.from_id);
  const to = uuidOf(ctx, "person", link.to_id);
  if (!from || !to) throw new ApiError("Person not found in database", 500);
  const { data, error } = await supabase
    .from("vanshawali_relationships")
    .insert({
      legacy_id: link.id,
      from_person_id: from,
      to_person_id: to,
      relation: link.relation,
      status: link.status,
      proposed_by: actor,
    })
    .select("id")
    .single();
  if (error && (error as any).code === "23505") return; // pehle se hai
  fail(error, "Saving relation");
  if (data?.id) ctx.linkUuid.set(link.id, data.id);
}

/** Link ko chhune (remove/edit relation) ka haq */
function canTouchLink(
  link: Link,
  store: Store,
  near: Set<string>,
  session: { userId: string; role: string }
): boolean {
  if (session.role === "super_admin") return true;
  if (link.proposed_by === session.userId) return true;
  if (!near.has(link.from_id) || !near.has(link.to_id)) return false;
  const a = store.persons.find((p) => p.id === link.from_id);
  const b = store.persons.find((p) => p.id === link.to_id);
  // do registered members ke beech ka link sirf proposer/super admin hata sakta hai
  return !(a?.user_id && b?.user_id);
}

// ----------------------------------------------------------------------------
// API ROUTE HANDLERS
// ----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = createAdminClient();
  const { store, isRelational, ctx } = await loadStore(supabase);
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(session.role);

  // GET ?pending=1 -> mere liye approve/reject wale requests
  if (request.nextUrl.searchParams.get("pending")) {
    const verifier = ["core_committee", "super_admin"].includes(session.role);
    const nameOf = (id: string) => store.persons.find((p) => p.id === id)?.display_name || "?";
    const items = store.links
      .filter((l) => {
        if (l.status !== "pending") return false;
        if (l.proposed_by === session.userId) return false;
        if (verifier) return true;
        const a = store.persons.find((p) => p.id === l.from_id);
        const b = store.persons.find((p) => p.id === l.to_id);
        return a?.user_id === session.userId || b?.user_id === session.userId;
      })
      .map((l) => ({
        id: l.id,
        relation: l.relation,
        from_name: nameOf(l.from_id),
        to_name: nameOf(l.to_id),
        proposed_by: l.proposed_by,
        created_at: l.created_at,
      }));
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  }

  const userId = request.nextUrl.searchParams.get("userId") || session.userId;

  // Privacy: doosre ka tree sirf wahi dekh sakta hai jo (a) usi city ka ho, (b) rishte se jura ho,
  // ya (c) staff ho (super admin / core committee kahin bhi, volunteer apni city me).
  if (userId !== session.userId) {
    const { data: target } = await supabase.from("users").select("city_id").eq("id", userId).maybeSingle();
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    const meP = personOfUser(store, session.userId);
    const targetP = personOfUser(store, userId);
    const connected = !!(meP && targetP && neighbourhood(store, meP.id, VIEW_DEPTH).has(targetP.id));
    const sameCity = !!session.cityId && target.city_id === session.cityId;
    const staffOk =
      session.role === "super_admin" ||
      session.role === "core_committee" ||
      (session.role === "volunteer" && sameCity);
    if (!(connected || sameCity || staffOk)) {
      return NextResponse.json({ error: "Is vanshawali ko dekhne ki anumati nahi hai" }, { status: 403 });
    }
  }

  // Doosre ka tree dekhte waqt naya person DB me nahi banate (sirf apna)
  let centre: Person;
  try {
    centre = await ensurePersonForUser(store, ctx, supabase, userId, isRelational, session.userId, userId === session.userId);
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const tree = buildTree(store, centre, session.userId, isStaff);

  const pending = store.links.filter(
    (l) =>
      l.status === "pending" &&
      (isStaff || l.proposed_by === session.userId || centre.user_id === session.userId)
  );

  let positions: Record<string, { x: number; top: number }> = {};
  try {
    const { data: posData } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", `vansh_positions:${userId}`)
      .maybeSingle();
    if (posData?.setting_value && typeof posData.setting_value === "object") {
      positions = posData.setting_value as Record<string, { x: number; top: number }>;
    }
  } catch (_e) {}

  return NextResponse.json({
    tree,
    positions,
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

  try {
    return await handlePost(supabase, session, body, action);
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("vanshawali POST error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

async function handlePost(
  supabase: any,
  session: { userId: string; role: string; cityId?: string | null },
  body: any,
  action: string
) {
  const { store, isRelational, ctx } = await loadStore(supabase);
  const isVerifier = ["core_committee", "super_admin"].includes(session.role);
  const isSA = session.role === "super_admin";
  const me = personOfUser(store, session.userId);
  const near = me ? neighbourhood(store, me.id) : new Set<string>();

  // ACTION: VERIFY / REJECT
  if (action === "verify" || action === "reject") {
    const link = store.links.find((l) => l.id === String(body.link_id || ""));
    if (!link) throw new ApiError("Link not found", 404);
    if (link.status !== "pending") throw new ApiError("Ye request pehle hi process ho chuki hai", 409);

    const a = store.persons.find((p) => p.id === link.from_id);
    const b = store.persons.find((p) => p.id === link.to_id);
    const involved = a?.user_id === session.userId || b?.user_id === session.userId;
    if (link.proposed_by === session.userId && !isVerifier) {
      throw new ApiError("Dusra member / staff verify kare", 403);
    }
    if (!isVerifier && !involved) {
      throw new ApiError("Sirf jis member ka naam is rishte me hai ya staff verify kar sakta hai", 403);
    }

    const newStatus = action === "verify" ? "verified" : "rejected";
    if (isRelational) {
      const linkUuid = uuidOf(ctx, "link", link.id);
      if (!linkUuid) throw new ApiError("Link not found in database", 500);
      const { error } = await supabase
        .from("vanshawali_relationships")
        .update({
          status: newStatus,
          verified_by: session.userId,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", linkUuid);
      fail(error, "Updating request");
    }
    const before = { ...link };
    link.status = newStatus;
    await persistStore(supabase, store, session.userId, isRelational);
    await audit(supabase, session.userId, action, "link", link.id, before, link);
    return NextResponse.json({ success: true, link });
  }

  // ACTION: PROPOSE_RELATION_CHANGE (Bubble tap se rishta badalne ka request)
  if (action === "propose_relation_change") {
    const personId = String(body.person_id || "");
    const targetRelation = String(body.relation || "").toLowerCase();
    const note = String(body.note || "").trim();
    const rootUserId = String(body.root_user_id || session.userId);

    const person = store.persons.find((p) => p.id === personId);
    if (!person) throw new ApiError("Member not found", 404);

    const treeOwner = store.persons.find((p) => p.user_id === rootUserId);

    if (treeOwner?.user_id && treeOwner.user_id !== session.userId) {
      try {
        await supabase.from("notifications").insert({
          user_id: treeOwner.user_id,
          title: "वंशावली: रिश्ते में बदलाव का अनुरोध / Relationship change request",
          body: `${person.display_name} ke liye naye rishte (${targetRelation}) ka anurodh prapt hua hai.${note ? ` Note: ${note}` : ""}`.slice(0, 300),
          type: "vansh_request",
          ref_id: person.id,
          is_read: false,
        });
      } catch {
        /* notification best-effort */
      }
    }

    await audit(supabase, session.userId, "propose_relation_change", "person", person.id, null, {
      person_name: person.display_name,
      proposed_relation: targetRelation,
      note,
      root_user_id: rootUserId,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      message: "Rishta badalne ka anurodh safaltapoorvak bhej diya gaya hai. Approved hone ke baad vanshawali me reflect hoga.",
    });
  }

  // ACTION: REMOVE
  if (action === "remove") {
    const link = store.links.find((l) => l.id === String(body.link_id || ""));
    if (!link) throw new ApiError("Link not found", 404);
    if (!canTouchLink(link, store, near, session)) throw new ApiError("Not allowed to remove", 403);

    const before = { ...link };
    store.links = store.links.filter((l) => l.id !== link.id);

    const used = new Set<string>();
    for (const l of store.links) {
      used.add(l.from_id);
      used.add(l.to_id);
    }
    const orphans = [link.from_id, link.to_id].filter((pid) => {
      const p = store.persons.find((x) => x.id === pid);
      return p && !p.user_id && !used.has(pid);
    });
    store.persons = store.persons.filter((p) => !orphans.includes(p.id));

    if (isRelational) {
      const linkUuid = uuidOf(ctx, "link", link.id);
      if (!linkUuid) throw new ApiError("Link not found in database", 500);
      const { error } = await supabase.from("vanshawali_relationships").delete().eq("id", linkUuid);
      fail(error, "Removing relation");
      for (const opId of orphans) {
        const pu = uuidOf(ctx, "person", opId);
        if (!pu) continue;
        const { error: delErr } = await supabase.from("vanshawali_persons").delete().eq("id", pu).is("user_id", null);
        fail(delErr, "Cleaning up person");
      }
    }
    await persistStore(supabase, store, session.userId, isRelational);
    await audit(supabase, session.userId, "remove", "link", link.id, before, null);
    return NextResponse.json({ success: true });
  }

  // ACTION: SAVE_POSITIONS (layout sirf tree owner / super admin ka)
  if (action === "save_positions") {
    const rootUser = String(body.root_user_id || session.userId);
    if (rootUser !== session.userId && !isSA) {
      throw new ApiError("Only tree owner or Super Admin can save arrangement", 403);
    }
    const positions = body.positions as Record<string, { x: number; top: number }> | undefined;
    if (!positions || typeof positions !== "object") throw new ApiError("positions object required");
    const clean: Record<string, { x: number; top: number }> = {};
    for (const [k, v] of Object.entries(positions)) {
      if (v && Number.isFinite(v.x) && Number.isFinite(v.top)) clean[k] = { x: v.x, top: v.top };
    }
    const { error } = await supabase.from("app_settings").upsert(
      {
        setting_key: `vansh_positions:${rootUser}`,
        setting_value: clean,
        updated_by: session.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" }
    );
    fail(error, "Saving arrangement");
    return NextResponse.json({ success: true, count: Object.keys(clean).length });
  }

  // ACTION: EDIT
  if (action === "edit") {
    const person = store.persons.find((p) => p.id === String(body.person_id || ""));
    if (!person) throw new ApiError("Person not found", 404);

    const isSelf = person.user_id === session.userId;
    const allowed =
      isSA ||
      isSelf ||
      (!person.user_id && (person.created_by === session.userId || near.has(person.id)));
    if (!allowed) throw new ApiError("Not allowed to edit", 403);

    const before = { ...person };
    if (body.display_name != null) person.display_name = cleanName(body.display_name);
    if (body.birth_year !== undefined) person.birth_year = cleanBirthYear(body.birth_year);
    if (body.birth_date !== undefined) {
      const bd = body.birth_date ? String(body.birth_date).slice(0, 10) : null;
      if (bd && !/^\d{4}-\d{2}-\d{2}$/.test(bd)) throw new ApiError("Date sahi nahi hai");
      person.birth_date = bd;
      if (bd) person.birth_year = cleanBirthYear(bd.slice(0, 4));
    }
    if (body.gender !== undefined) person.gender = normGender(body.gender);

    let linkChanged: Link | null = null;
    if (body.relation && body.link_id) {
      const link = store.links.find((l) => l.id === String(body.link_id));
      const rel = String(body.relation).toLowerCase();
      if (link && ["father", "mother", "spouse", "child"].includes(rel) && link.relation !== rel) {
        if (!canTouchLink(link, store, near, session)) throw new ApiError("Not allowed to change relation", 403);
        link.relation = rel as Link["relation"];
        linkChanged = link;
      }
    }

    if (isRelational) {
      const pu = uuidOf(ctx, "person", person.id);
      if (!pu) throw new ApiError("Person not found in database", 500);
      const { error } = await supabase
        .from("vanshawali_persons")
        .update({
          display_name: person.display_name,
          birth_year: person.birth_year,
          birth_date: person.birth_date,
          gender: person.gender,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pu);
      fail(error, "Saving person");
      if (linkChanged) {
        const lu = uuidOf(ctx, "link", linkChanged.id);
        if (lu) {
          const { error: lErr } = await supabase
            .from("vanshawali_relationships")
            .update({ relation: linkChanged.relation, updated_at: new Date().toISOString() })
            .eq("id", lu);
          fail(lErr, "Saving relation");
        }
      }
    }
    await persistStore(supabase, store, session.userId, isRelational);
    await audit(supabase, session.userId, "edit", "person", person.id, before, person);
    return NextResponse.json({ success: true, person });
  }

  // ACTION: ADD
  let centre: Person;
  if (body.centre_person_id) {
    const found = store.persons.find((p) => p.id === String(body.centre_person_id));
    if (!found) throw new ApiError("Centre person not found", 404);
    if (!isSA && !near.has(found.id)) throw new ApiError("Sirf apne tree me jod sakte ho", 403);
    centre = found;
  } else {
    const centreUserId = String(body.centre_user_id || session.userId);
    if (centreUserId !== session.userId && !isSA) throw new ApiError("Only own tree (or Super Admin)", 403);
    centre = await ensurePersonForUser(store, ctx, supabase, centreUserId, isRelational, session.userId);
  }

  const relation = String(body.relation || "").toLowerCase() as Link["relation"];
  if (!["father", "mother", "spouse", "child"].includes(relation)) {
    throw new ApiError("relation: father|mother|spouse|child");
  }

  // father/mother ek hi ho sakte hain
  if (relation === "father" || relation === "mother") {
    const exists = store.links.some(
      (l) => l.relation === relation && l.to_id === centre.id && l.status !== "rejected"
    );
    if (exists) throw new ApiError(relation === "father" ? "Father pehle se jod diya gaya hai" : "Mother pehle se jod di gayi hai", 409);
  }

  let other: Person;
  let createdNewPerson = false;
  if (body.member_user_id) {
    const existingP = store.persons.find(
      (p) => p.id === body.member_user_id || p.user_id === body.member_user_id
    );
    if (existingP) {
      other = existingP;
    } else {
      other = await ensurePersonForUser(store, ctx, supabase, String(body.member_user_id), isRelational, session.userId);
    }
  } else {
    const name = cleanName(body.display_name);
    const birth_date = body.birth_date ? String(body.birth_date).slice(0, 10) : null;
    if (birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) throw new ApiError("Date sahi nahi hai");
    const birth_year = birth_date ? cleanBirthYear(birth_date.slice(0, 4)) : cleanBirthYear(body.birth_year);

    // Gender: father/mother se pakka, spouse = centre ka ulta (agar pata ho), baaki form se
    let gender = normGender(body.gender);
    if (relation === "father") gender = "male";
    else if (relation === "mother") gender = "female";
    else if (relation === "spouse" && !gender) {
      if (centre.gender === "male") gender = "female";
      else if (centre.gender === "female") gender = "male";
    }

    // Apne aas-paas me same naam + same saal ka vyakti pehle se ho to duplicate rokein
    const dup = store.persons.find(
      (p) =>
        near.has(p.id) &&
        p.display_name.trim().toLowerCase() === name.toLowerCase() &&
        birth_year != null &&
        p.birth_year === birth_year
    );
    if (dup) throw new ApiError(`"${dup.display_name}" (${birth_year}) pehle se tree me hai`, 409);

    other = {
      id: uid(),
      user_id: null,
      display_name: name,
      gender,
      birth_year,
      birth_date,
      gotra: body.gotra ? String(body.gotra).trim().slice(0, 60) : null,
      created_by: session.userId,
      created_at: new Date().toISOString(),
    };
    createdNewPerson = true;
  }

  if (other.id === centre.id) throw new ApiError("Khud ko khud se nahi jod sakte");

  // Cycle + umar ki sanity (father/mother/child)
  if (relation === "father" || relation === "mother") {
    if (isAncestorOf(store, centre.id, other.id)) throw new ApiError("Ye vyakti pehle se is ki santaan hai, parent nahi ban sakta", 409);
    if (other.birth_year && centre.birth_year && other.birth_year > centre.birth_year - MIN_PARENT_GAP) {
      throw new ApiError(`Parent ki umar bachche se kam se kam ${MIN_PARENT_GAP} saal zyada honi chahiye`, 409);
    }
  } else if (relation === "child") {
    if (isAncestorOf(store, other.id, centre.id)) throw new ApiError("Ye vyakti pehle se is ka purvaj hai, santaan nahi ban sakta", 409);
    if (other.birth_year && centre.birth_year && centre.birth_year > other.birth_year - MIN_PARENT_GAP) {
      throw new ApiError(`Parent ki umar bachche se kam se kam ${MIN_PARENT_GAP} saal zyada honi chahiye`, 409);
    }
  }

  const status: Link["status"] = isVerifier ? "verified" : "pending";
  const mkLink = (from: string, to: string, rel: Link["relation"]): Link => ({
    id: uid(),
    from_id: from,
    to_id: to,
    relation: rel,
    status,
    proposed_by: session.userId,
    created_at: new Date().toISOString(),
  });

  let link: Link;
  if (relation === "father" || relation === "mother") link = mkLink(other.id, centre.id, relation);
  else if (relation === "spouse") link = mkLink(centre.id, other.id, "spouse");
  else link = mkLink(centre.id, other.id, "child");

  // same relation dobara nahi
  const dupEdge = store.links.some(
    (l) => l.from_id === link.from_id && l.to_id === link.to_id && l.relation === link.relation && l.status !== "rejected"
  );
  if (dupEdge) throw new ApiError("Ye rishta pehle se jura hua hai", 409);

  // --- DB writes (pehle person, phir links) ---
  if (createdNewPerson) {
    store.persons.push(other);
    if (isRelational) {
      const { data, error } = await supabase
        .from("vanshawali_persons")
        .insert({
          legacy_id: other.id,
          user_id: null,
          display_name: other.display_name,
          gender: other.gender,
          birth_year: other.birth_year,
          birth_date: other.birth_date,
          gotra: other.gotra,
          created_by: session.userId,
        })
        .select("id")
        .single();
      fail(error, "Saving person");
      ctx.personUuid.set(other.id, data.id);
    }
  }

  const newLinks: Link[] = [link];
  store.links.push(link);

  // Child: spouse / co-parent ko bhi parent banao
  if (relation === "child") {
    const coParentIds = new Set<string>();
    for (const l of store.links) {
      if (l.relation !== "spouse" || l.status === "rejected") continue;
      if (l.from_id !== centre.id && l.to_id !== centre.id) continue;
      coParentIds.add(l.from_id === centre.id ? l.to_id : l.from_id);
    }
    for (const l of store.links) {
      if (l.relation !== "child" || l.from_id !== centre.id || l.status === "rejected") continue;
      for (const pl of store.links) {
        if (pl.to_id !== l.to_id || pl.status === "rejected") continue;
        if ((pl.relation === "father" || pl.relation === "mother") && pl.from_id !== centre.id) coParentIds.add(pl.from_id);
      }
    }
    for (const l of store.links) {
      if ((l.relation === "father" || l.relation === "mother") && l.from_id === centre.id && l.status !== "rejected") {
        for (const pl of store.links) {
          if (pl.to_id !== l.to_id || pl.status === "rejected") continue;
          if ((pl.relation === "father" || pl.relation === "mother") && pl.from_id !== centre.id) coParentIds.add(pl.from_id);
        }
      }
    }
    for (const spouseId of Array.from(coParentIds)) {
      if (spouseId === other.id || spouseId === centre.id) continue;
      const already = store.links.some(
        (l) =>
          l.from_id === spouseId && l.to_id === other.id &&
          (l.relation === "child" || l.relation === "father" || l.relation === "mother") && l.status !== "rejected"
      );
      if (already) continue;
      const coLink = mkLink(spouseId, other.id, "child");
      store.links.push(coLink);
      newLinks.push(coLink);
    }
  }

  // Spouse: naye spouse ko centre ke existing bachchon se bhi jodo
  if (relation === "spouse") {
    const kids = store.links.filter((l) => l.relation === "child" && l.from_id === centre.id && l.status !== "rejected");
    for (const kl of kids) {
      const already = store.links.some(
        (l) => l.relation === "child" && l.from_id === other.id && l.to_id === kl.to_id && l.status !== "rejected"
      );
      if (already) continue;
      const kidLink = mkLink(other.id, kl.to_id, "child");
      store.links.push(kidLink);
      newLinks.push(kidLink);
    }
  }

  if (isRelational) {
    try {
      for (const l of newLinks) await insertLinkRow(supabase, ctx, l, session.userId);
    } catch (e) {
      // Person bana ho aur link fail ho to adhoora (ghost) person na bache
      if (createdNewPerson) {
        const pu = uuidOf(ctx, "person", other.id);
        if (pu) await supabase.from("vanshawali_persons").delete().eq("id", pu).is("user_id", null);
      }
      throw e;
    }
  }

  await persistStore(supabase, store, session.userId, isRelational);
  await audit(supabase, session.userId, "add", "link", link.id, null, { link, person: other, extra_links: newLinks.length - 1 });

  // Jis registered member ko jodha gaya use batao (approve karne ke liye)
  if (status === "pending" && other.user_id && other.user_id !== session.userId) {
    try {
      await supabase.from("notifications").insert({
        user_id: other.user_id,
        title: "वंशावली: रिश्ते की request / Vanshawali request",
        body: `${centre.display_name} ne aapko apni vanshawali me ${relation} ke roop me jodna chaha. Approve ya reject karne ke liye Vanshawali > Requests kholein.`.slice(0, 300),
        type: "vansh_request",
        ref_id: null,
        is_read: false,
      });
    } catch {
      /* optional */
    }
  }
  return NextResponse.json({ success: true, person: other, link });
}
