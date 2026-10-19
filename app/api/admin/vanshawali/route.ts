import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STAFF = ["core_committee", "super_admin"] as const;
const JUNK_NAMES = new Set(["father", "mother", "mother 2", "child", "child 1", "nahi pata", "unknown", "test", "a", "x"]);

type Supa = ReturnType<typeof createAdminClient>;

function isJunk(name: string) {
  const n = name.trim().toLowerCase();
  return n.length <= 2 || JUNK_NAMES.has(n);
}

async function logAudit(supabase: Supa, actor: string, action: string, entity: string, entityId: string | null, after: unknown) {
  try {
    await supabase.from("vanshawali_audit").insert({ actor_id: actor, action, entity, entity_id: entityId, after_data: after ?? null });
  } catch {
    /* best effort */
  }
}

// GET: overview (stats, pending, duplicates, isolated, junk)
export async function GET() {
  const auth = await requireAuth([...STAFF]);
  if (!auth.session) return auth.response;
  const supabase = createAdminClient();

  const [{ data: persons, error: pErr }, { data: links, error: lErr }] = await Promise.all([
    supabase.from("vanshawali_persons").select("id, display_name, user_id, gender, birth_year, created_at"),
    supabase.from("vanshawali_relationships").select("id, from_person_id, to_person_id, relation, status, proposed_by, created_at"),
  ]);
  if (pErr || lErr || !persons || !links) {
    return NextResponse.json({ error: "Could not load Vanshawali data" }, { status: 500 });
  }

  const nameOf = new Map(persons.map((p: any) => [p.id as string, p.display_name as string]));
  const active = links.filter((l: any) => l.status !== "rejected");

  // components (union-find)
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  for (const p of persons) parent.set(p.id, p.id);
  for (const l of active) {
    const a = find(l.from_person_id);
    const b = find(l.to_person_id);
    if (a !== b) parent.set(a, b);
  }
  const components = new Set(persons.map((p: any) => find(p.id))).size;

  const linked = new Set<string>();
  for (const l of active) {
    linked.add(l.from_person_id);
    linked.add(l.to_person_id);
  }

  const byName = new Map<string, any[]>();
  for (const p of persons) {
    const key = String(p.display_name).trim().toLowerCase();
    if (key.length <= 2) continue;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(p);
  }

  return NextResponse.json({
    stats: {
      persons: persons.length,
      links: links.length,
      components,
      without_gender: persons.filter((p: any) => !p.gender).length,
      without_birth_year: persons.filter((p: any) => !p.birth_year).length,
      registered: persons.filter((p: any) => p.user_id).length,
    },
    pending: links
      .filter((l: any) => l.status === "pending")
      .map((l: any) => ({
        id: l.id,
        relation: l.relation,
        from_name: nameOf.get(l.from_person_id) || "?",
        to_name: nameOf.get(l.to_person_id) || "?",
        created_at: l.created_at,
      })),
    duplicates: Array.from(byName.values())
      .filter((g) => g.length > 1)
      .map((g) => g.map((p: any) => ({ id: p.id, name: p.display_name, registered: !!p.user_id, linked: linked.has(p.id), birth_year: p.birth_year }))),
    isolated: persons
      .filter((p: any) => !p.user_id && !linked.has(p.id))
      .map((p: any) => ({ id: p.id, name: p.display_name, created_at: p.created_at })),
    junk: persons
      .filter((p: any) => isJunk(String(p.display_name)))
      .map((p: any) => ({ id: p.id, name: p.display_name, registered: !!p.user_id, linked: linked.has(p.id) })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth([...STAFF]);
  if (!auth.session) return auth.response;
  const actor = auth.session.userId;
  const supabase = createAdminClient();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // ---- delete_person: sirf bina link wala, bina registered user wala ----
  if (body.op === "delete_person") {
    const id = String(body.person_id || "");
    const { data: p } = await supabase.from("vanshawali_persons").select("id, display_name, user_id").eq("id", id).maybeSingle();
    if (!p) return NextResponse.json({ error: "Person not found" }, { status: 404 });
    if (p.user_id) return NextResponse.json({ error: "Registered member ko delete nahi kar sakte" }, { status: 409 });
    const { count } = await supabase
      .from("vanshawali_relationships")
      .select("id", { count: "exact", head: true })
      .or(`from_person_id.eq.${id},to_person_id.eq.${id}`);
    if ((count || 0) > 0) return NextResponse.json({ error: "Is person ke rishte jude hain; pehle unhe hatao ya merge karo" }, { status: 409 });
    const { error } = await supabase.from("vanshawali_persons").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    await logAudit(supabase, actor, "delete_person", "person", id, { name: p.display_name });
    return NextResponse.json({ success: true });
  }

  // ---- merge_persons: duplicate ko keep me milao ----
  if (body.op === "merge_persons") {
    let keepId = String(body.keep_id || "");
    let removeId = String(body.remove_id || "");
    if (!keepId || !removeId || keepId === removeId) return NextResponse.json({ error: "Invalid merge" }, { status: 400 });
    const { data: pair } = await supabase.from("vanshawali_persons").select("*").in("id", [keepId, removeId]);
    let keep = pair?.find((p: any) => p.id === keepId);
    let remove = pair?.find((p: any) => p.id === removeId);
    if (!keep || !remove) return NextResponse.json({ error: "Person not found" }, { status: 404 });
    if (keep.user_id && remove.user_id) return NextResponse.json({ error: "Do registered members ko merge nahi kar sakte" }, { status: 409 });
    if (remove.user_id && !keep.user_id) {
      [keep, remove] = [remove, keep];
      [keepId, removeId] = [removeId, keepId];
    }

    const { data: rels } = await supabase
      .from("vanshawali_relationships")
      .select("id, from_person_id, to_person_id, relation")
      .or(`from_person_id.eq.${removeId},to_person_id.eq.${removeId}`);
    const { data: keepRels } = await supabase
      .from("vanshawali_relationships")
      .select("from_person_id, to_person_id, relation")
      .or(`from_person_id.eq.${keepId},to_person_id.eq.${keepId}`);
    const existing = new Set((keepRels || []).map((r: any) => `${r.from_person_id}|${r.to_person_id}|${r.relation}`));

    for (const r of rels || []) {
      const from = r.from_person_id === removeId ? keepId : r.from_person_id;
      const to = r.to_person_id === removeId ? keepId : r.to_person_id;
      const key = `${from}|${to}|${r.relation}`;
      if (from === to || existing.has(key)) {
        await supabase.from("vanshawali_relationships").delete().eq("id", r.id);
      } else {
        const { error } = await supabase
          .from("vanshawali_relationships")
          .update({ from_person_id: from, to_person_id: to, updated_at: new Date().toISOString() })
          .eq("id", r.id);
        if (error) return NextResponse.json({ error: "Merge failed while moving relations" }, { status: 500 });
        existing.add(key);
      }
    }

    const patch: Record<string, unknown> = {};
    for (const f of ["gender", "birth_year", "birth_date", "gotra", "photo_url"]) {
      if (!keep[f] && remove[f]) patch[f] = remove[f];
    }
    if (Object.keys(patch).length) {
      await supabase.from("vanshawali_persons").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", keepId);
    }
    const { error: delErr } = await supabase.from("vanshawali_persons").delete().eq("id", removeId);
    if (delErr) return NextResponse.json({ error: "Merge failed while deleting duplicate" }, { status: 500 });
    await logAudit(supabase, actor, "merge_persons", "person", keepId, { merged: removeId, name: remove.display_name });
    return NextResponse.json({ success: true, kept: keepId });
  }

  // ---- seed_from_families: Parivar Form ke family members se Vanshawali jodo (idempotent) ----
  if (body.op === "seed_from_families") {
    const { data: families } = await supabase.from("families").select("id, head_of_family");
    const { data: allPersons } = await supabase.from("vanshawali_persons").select("id, legacy_id, user_id");
    const personByUser = new Map<string, string>();
    const personByLegacy = new Map<string, string>();
    for (const p of allPersons || []) {
      if (p.user_id) personByUser.set(p.user_id, p.id);
      if (p.legacy_id) personByLegacy.set(p.legacy_id, p.id);
    }

    let createdPersons = 0;
    let createdLinks = 0;
    let skipped = 0;

    const addLink = async (from: string, to: string, relation: string) => {
      const { error } = await supabase.from("vanshawali_relationships").insert({
        from_person_id: from, to_person_id: to, relation, status: "verified", proposed_by: actor, verified_by: actor, verified_at: new Date().toISOString(),
      });
      if (!error) createdLinks++;
    };

    for (const fam of families || []) {
      const { data: head } = await supabase.from("users").select("id, full_name, gender, photo_url").eq("id", fam.head_of_family).maybeSingle();
      if (!head) { skipped++; continue; }

      let headPerson: string = personByUser.get(head.id) as string;
      if (!headPerson) {
        const g = String(head.gender || "").toLowerCase();
        const { data: np, error } = await supabase.from("vanshawali_persons").insert({
          user_id: head.id, display_name: head.full_name || "Member", gender: ["male", "female", "other"].includes(g) ? g : null,
          photo_url: head.photo_url || null, created_by: actor,
        }).select("id").single();
        if (error || !np) { skipped++; continue; }
        headPerson = np.id as string;
        personByUser.set(head.id, headPerson);
        createdPersons++;
      }

      const { data: members } = await supabase.from("family_members").select("id, name, relation, gender, dob").eq("family_id", fam.id);
      const created: { id: string; relation: string }[] = [];

      for (const m of members || []) {
        const rel = String(m.relation || "");
        if (!["Wife", "Husband", "Son", "Daughter", "Father", "Mother"].includes(rel)) continue;
        const legacy = `fm_${m.id}`;
        if (personByLegacy.get(legacy)) continue; // pehle hi sync ho chuka
        const g = String(m.gender || "").toLowerCase();
        const gender = rel === "Father" || rel === "Son" || rel === "Husband" ? "male" : rel === "Mother" || rel === "Daughter" || rel === "Wife" ? "female" : (["male", "female", "other"].includes(g) ? g : null);
        const birthYear = m.dob ? parseInt(String(m.dob).slice(0, 4), 10) : null;
        const { data: np, error } = await supabase.from("vanshawali_persons").insert({
          legacy_id: legacy, user_id: null, display_name: String(m.name || "").trim() || "Member", gender,
          birth_year: birthYear && birthYear >= 1800 ? birthYear : null,
          birth_date: m.dob || null, created_by: actor,
        }).select("id").single();
        if (error || !np) { skipped++; continue; }
        const newId = np.id as string;
        personByLegacy.set(legacy, newId);
        createdPersons++;
        created.push({ id: newId, relation: rel });

        if (rel === "Wife" || rel === "Husband") await addLink(headPerson, newId, "spouse");
        else if (rel === "Son" || rel === "Daughter") await addLink(headPerson, newId, "child");
        else if (rel === "Father") await addLink(newId, headPerson, "father");
        else if (rel === "Mother") await addLink(newId, headPerson, "mother");
      }

      // bachchon ko spouse ke saath bhi jodo
      const spouse = created.find((c) => c.relation === "Wife" || c.relation === "Husband");
      if (spouse) {
        for (const c of created.filter((x) => x.relation === "Son" || x.relation === "Daughter")) {
          await addLink(spouse.id, c.id, "child");
        }
      }
    }

    await logAudit(supabase, actor, "seed_from_families", "system", null, { createdPersons, createdLinks, skipped });
    return NextResponse.json({ success: true, createdPersons, createdLinks, skipped });
  }

  return NextResponse.json({ error: "Unknown operation" }, { status: 400 });
}
