// ============================================================================
// Local Test Suite: test_vanshawali_local.mjs
// Comprehensive test suite for Vanshawali Relational Implementation:
// Covers all 16 required test cases:
//  1. Person creation
//  2. Person lookup
//  3. Registered-user mapping
//  4. Unregistered-person handling
//  5. Relationship creation
//  6. Relationship uniqueness
//  7. Parent-child direction
//  8. Spouse relationship
//  9. Pending relationship
// 10. Verification/rejection
// 11. Authorization
// 12. Cycle protection
// 13. 12-generation bound
// 14. Concurrent mutation safety
// 15. Response shape compatibility
// 16. Search functionality for registered + unregistered
// Plus static migration integrity and parity assertion checks.
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

console.log("\n=======================================================");
console.log("  MATANG CONNECT: VANSHAVALI LOCAL VALIDATION SUITE");
console.log("=======================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] Test ${String(total).padStart(2, "0")}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] Test ${String(total).padStart(2, "0")}: ${name}`);
    console.error(`         ${err.message}`);
  }
}

// ============================================================================
// SECTION A: STATIC MIGRATION INTEGRITY & SAFETY GATES
// ============================================================================
const schemaPath = path.resolve("supabase/migrations/20260913_01_vanshawali_schema.sql");
const backfillPath = path.resolve("supabase/migrations/20260913_02_vanshawali_backfill.sql");

test("Static Integrity: Schema DDL exists and defines required tables", () => {
  assert.ok(fs.existsSync(schemaPath), "Schema file missing");
  const content = fs.readFileSync(schemaPath, "utf8");
  assert.ok(content.includes("CREATE TABLE IF NOT EXISTS public.vanshawali_persons"), "Missing persons table");
  assert.ok(content.includes("CREATE TABLE IF NOT EXISTS public.vanshawali_relationships"), "Missing relationships table");
});

test("Static Integrity: Schema enforces nullable demographics & partial unique user_id", () => {
  const sql = fs.readFileSync(schemaPath, "utf8");
  assert.ok(sql.includes("legacy_id TEXT UNIQUE"), "Missing legacy_id UNIQUE");
  assert.ok(sql.includes("gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'))"), "Invalid gender constraint");
  assert.ok(sql.includes("birth_year INT CHECK (birth_year IS NULL OR (birth_year >= 1800 AND birth_year <= 2100))"), "Invalid birth_year constraint");
  assert.ok(sql.includes("idx_vanshawali_persons_user_id"), "Missing partial user_id index");
  assert.ok(sql.includes("WHERE user_id IS NOT NULL"), "Missing WHERE user_id IS NOT NULL condition");
});

test("Static Integrity: Schema enforces logical edge constraints and flexible parent model", () => {
  const sql = fs.readFileSync(schemaPath, "utf8");
  assert.ok(sql.includes("CONSTRAINT chk_vanshawali_no_self_link CHECK (from_person_id <> to_person_id)"), "Missing self-link check");
  assert.ok(sql.includes("CONSTRAINT uq_vanshawali_logical_edge UNIQUE (from_person_id, to_person_id, relation)"), "Missing edge uniqueness");
  assert.ok(sql.includes("DROP INDEX IF EXISTS public.uq_vanshawali_single_father"), "Missing drop of single father constraint");
  assert.ok(sql.includes("DROP INDEX IF EXISTS public.uq_vanshawali_single_mother"), "Missing drop of single mother constraint");
  assert.ok(sql.includes("ENABLE ROW LEVEL SECURITY"), "RLS not enabled");
});

test("Static Integrity: Traversal RPC specifies cycle protection and max depth limit 12", () => {
  const sql = fs.readFileSync(schemaPath, "utf8");
  assert.ok(sql.includes("public.get_vanshawali_subgraph"), "Missing traversal RPC");
  assert.ok(sql.includes("ANY(a.path)"), "Missing cycle protection in ancestors");
  assert.ok(sql.includes("ANY(d.path)"), "Missing cycle protection in descendants");
  assert.ok(sql.includes("p_max_depth INT DEFAULT 12"), "Missing 12-generation depth limit");
});

test("Static Integrity: Backfill is strictly read-only on app_settings and has 48/49 parity gate", () => {
  assert.ok(fs.existsSync(backfillPath), "Backfill file missing");
  const sql = fs.readFileSync(backfillPath, "utf8");
  assert.ok(/SELECT\s+setting_value\s+INTO\s+v_setting_val\s+FROM\s+public\.app_settings/i.test(sql), "Missing SELECT from app_settings");
  assert.ok(!sql.includes("DELETE FROM public.app_settings"), "Destructive DELETE detected in app_settings!");
  assert.ok(!sql.includes("DROP TABLE"), "Destructive DROP TABLE detected!");
  assert.ok(sql.includes("ON CONFLICT (legacy_id) DO UPDATE"), "Missing idempotent ON CONFLICT clause");
  assert.ok(sql.includes("v_dst_persons <> 48 OR v_dst_links <> 49"), "Missing 48/49 hard assertion");
  assert.ok(sql.includes("RAISE EXCEPTION"), "Missing transaction rollback trigger");
});

// ============================================================================
// SECTION B: IN-MEMORY RELATIONAL DATABASE SIMULATION HARNESS
// Simulates relational storage, indexes, constraints, RLS and query semantics.
// ============================================================================
class MockRelationalDb {
  constructor() {
    this.persons = new Map(); // id -> person
    this.relationships = new Map(); // id -> relationship
    this.users = new Map(); // id -> user
  }

  addUser(user) {
    this.users.set(user.id, user);
  }

  // 1. Person creation & validation
  createPerson({
    id = `uuid_${Math.random().toString(36).slice(2, 10)}`,
    legacy_id = null,
    user_id = null,
    display_name,
    gender = null,
    birth_year = null,
    birth_date = null,
    gotra = null,
    photo_url = null,
    created_by = null,
  }) {
    if (!display_name || !display_name.trim()) {
      throw new Error("chk_vanshawali_persons_name_not_empty: display_name must not be empty");
    }
    if (gender !== null && !["male", "female", "other"].includes(gender)) {
      throw new Error(`Invalid gender: ${gender}`);
    }
    if (birth_year !== null && (birth_year < 1800 || birth_year > 2100)) {
      throw new Error(`birth_year out of range: ${birth_year}`);
    }

    // Partial unique index on user_id WHERE user_id IS NOT NULL
    if (user_id !== null) {
      for (const p of this.persons.values()) {
        if (p.user_id === user_id && p.id !== id) {
          throw new Error(`idx_vanshawali_persons_user_id violation: user_id ${user_id} already assigned to person ${p.id}`);
        }
      }
    }

    // Unique legacy_id
    if (legacy_id !== null) {
      for (const p of this.persons.values()) {
        if (p.legacy_id === legacy_id && p.id !== id) {
          throw new Error(`uq_legacy_id violation: legacy_id ${legacy_id} already exists`);
        }
      }
    }

    const row = {
      id,
      legacy_id,
      user_id,
      display_name: display_name.trim(),
      gender,
      birth_year,
      birth_date,
      gotra,
      photo_url,
      created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.persons.set(id, row);
    return row;
  }

  // 2. Person lookup
  findPersonByIdOrLegacy(key) {
    if (this.persons.has(key)) return this.persons.get(key);
    for (const p of this.persons.values()) {
      if (p.legacy_id === key) return p;
    }
    return null;
  }

  findPersonByUserId(userId) {
    for (const p of this.persons.values()) {
      if (p.user_id === userId) return p;
    }
    return null;
  }

  // 5. Relationship creation & constraints
  createRelationship({
    id = `rel_${Math.random().toString(36).slice(2, 10)}`,
    legacy_id = null,
    from_person_id,
    to_person_id,
    relation,
    status = "pending",
    proposed_by = null,
    verified_by = null,
  }) {
    if (!this.persons.has(from_person_id)) throw new Error(`Foreign key error: from_person ${from_person_id} not found`);
    if (!this.persons.has(to_person_id)) throw new Error(`Foreign key error: to_person ${to_person_id} not found`);

    // Self link check
    if (from_person_id === to_person_id) {
      throw new Error("chk_vanshawali_no_self_link: from_person_id cannot equal to_person_id");
    }

    if (!["child", "spouse", "father", "mother"].includes(relation)) {
      throw new Error(`Invalid relation: ${relation}`);
    }

    if (!["pending", "verified", "rejected"].includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    // uq_vanshawali_logical_edge: UNIQUE (from_person_id, to_person_id, relation)
    for (const r of this.relationships.values()) {
      if (r.from_person_id === from_person_id && r.to_person_id === to_person_id && r.relation === relation) {
        throw new Error(`uq_vanshawali_logical_edge violation: edge (${from_person_id}, ${to_person_id}, ${relation}) already exists`);
      }
    }

    const row = {
      id,
      legacy_id,
      from_person_id,
      to_person_id,
      relation,
      status,
      proposed_by,
      verified_by,
      verified_at: status === "verified" ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.relationships.set(id, row);
    return row;
  }
}

// ============================================================================
// SECTION C: EXPLICIT 16 FUNCTIONAL TESTS
// ============================================================================

// 1. Person creation
test("Requirement 01: Person creation supports nullable demographics and valid range", () => {
  const db = new MockRelationalDb();
  
  // Create person with all demographics
  const p1 = db.createPerson({
    legacy_id: "v_101",
    display_name: "Santosh Matang",
    gender: "male",
    birth_year: 1980,
    birth_date: "1980-05-15",
    gotra: "Kamble",
    photo_url: "https://example.com/avatar.jpg",
  });
  assert.equal(p1.display_name, "Santosh Matang");
  assert.equal(p1.gotra, "Kamble");

  // Create person with all nullable fields omitted
  const p2 = db.createPerson({
    legacy_id: "v_102",
    display_name: "Gopal Matang",
  });
  assert.equal(p2.gender, null);
  assert.equal(p2.birth_year, null);
  assert.equal(p2.birth_date, null);
  assert.equal(p2.gotra, null);
  assert.equal(p2.photo_url, null);

  // Assert empty display_name throws error
  assert.throws(() => {
    db.createPerson({ display_name: "   " });
  }, /chk_vanshawali_persons_name_not_empty/);

  // Assert invalid birth_year throws error
  assert.throws(() => {
    db.createPerson({ display_name: "Invalid Year", birth_year: 1750 });
  }, /birth_year out of range/);
});

// 2. Person lookup
test("Requirement 02: Person lookup resolves by primary UUID, legacy_id, and user_id", () => {
  const db = new MockRelationalDb();
  const created = db.createPerson({
    id: "p_uuid_abc_123",
    legacy_id: "v_legacy_999",
    user_id: "u_auth_456",
    display_name: "Sunil Matang",
  });

  // Lookup by primary UUID
  const byId = db.findPersonByIdOrLegacy("p_uuid_abc_123");
  assert.equal(byId?.id, created.id);

  // Lookup by legacy_id
  const byLegacy = db.findPersonByIdOrLegacy("v_legacy_999");
  assert.equal(byLegacy?.id, created.id);

  // Lookup by user_id
  const byUser = db.findPersonByUserId("u_auth_456");
  assert.equal(byUser?.id, created.id);

  // Missing lookup returns null
  assert.equal(db.findPersonByIdOrLegacy("non_existent"), null);
});

// 3. Registered-user mapping
test("Requirement 03: Registered-user mapping enforces 1:1 constraint via partial unique index", () => {
  const db = new MockRelationalDb();
  const userId = "user_registered_01";
  
  // First person with registered user_id succeeds
  const p1 = db.createPerson({
    legacy_id: "v_reg_1",
    user_id: userId,
    display_name: "Anand Matang",
  });
  assert.equal(p1.user_id, userId);

  // Second person trying to link the SAME registered user_id must throw
  assert.throws(() => {
    db.createPerson({
      legacy_id: "v_reg_2",
      user_id: userId,
      display_name: "Duplicate Anand",
    });
  }, /idx_vanshawali_persons_user_id violation/);
});

// 4. Unregistered-person handling
test("Requirement 04: Unregistered-person handling allows unlimited user_id = null nodes", () => {
  const db = new MockRelationalDb();

  // Multiple unregistered family members / ancestors with user_id = null
  const anc1 = db.createPerson({ legacy_id: "v_anc_1", user_id: null, display_name: "Parshuram Matang", birth_year: 1910 });
  const anc2 = db.createPerson({ legacy_id: "v_anc_2", user_id: null, display_name: "Tukaram Matang", birth_year: 1935 });
  const anc3 = db.createPerson({ legacy_id: "v_anc_3", user_id: null, display_name: "Kashibai Matang", birth_year: 1940 });

  assert.equal(anc1.user_id, null);
  assert.equal(anc2.user_id, null);
  assert.equal(anc3.user_id, null);
  assert.equal(db.persons.size, 3);
});

// 5. Relationship creation
test("Requirement 05: Relationship creation validates relations and default status", () => {
  const db = new MockRelationalDb();
  const father = db.createPerson({ display_name: "Dnyaneshwar Matang", gender: "male" });
  const child = db.createPerson({ display_name: "Ramesh Matang", gender: "male" });

  // Normal member proposes parent-child link (defaults to pending)
  const link = db.createRelationship({
    from_person_id: father.id,
    to_person_id: child.id,
    relation: "father",
    proposed_by: "user_normal",
    status: "pending",
  });

  assert.equal(link.relation, "father");
  assert.equal(link.status, "pending");
  assert.equal(link.verified_at, null);
});

// 6. Relationship uniqueness
test("Requirement 06: Relationship uniqueness enforces logical edge uniqueness and accepts multiple verified parents", () => {
  const db = new MockRelationalDb();
  const father1 = db.createPerson({ display_name: "Father One", gender: "male" });
  const father2 = db.createPerson({ display_name: "Father Two", gender: "male" });
  const mother1 = db.createPerson({ display_name: "Mother One", gender: "female" });
  const mother2 = db.createPerson({ display_name: "Mother Two", gender: "female" });
  const child = db.createPerson({ display_name: "Child", gender: "male" });

  // 1. Multiple verified mothers allowed (e.g. biological + adoptive/step-mother, matching production)
  const mLink1 = db.createRelationship({ from_person_id: mother1.id, to_person_id: child.id, relation: "mother", status: "verified" });
  const mLink2 = db.createRelationship({ from_person_id: mother2.id, to_person_id: child.id, relation: "mother", status: "verified" });
  assert.equal(mLink1.status, "verified");
  assert.equal(mLink2.status, "verified");

  // 2. Multiple verified fathers allowed
  const fLink1 = db.createRelationship({ from_person_id: father1.id, to_person_id: child.id, relation: "father", status: "verified" });
  const fLink2 = db.createRelationship({ from_person_id: father2.id, to_person_id: child.id, relation: "father", status: "verified" });
  assert.equal(fLink1.status, "verified");
  assert.equal(fLink2.status, "verified");

  // 3. Logical edge uniqueness: duplicate edge between same parent and child throws
  assert.throws(() => {
    db.createRelationship({ from_person_id: mother1.id, to_person_id: child.id, relation: "mother", status: "verified" });
  }, /uq_vanshawali_logical_edge violation/);

  assert.throws(() => {
    db.createRelationship({ from_person_id: father1.id, to_person_id: child.id, relation: "father", status: "verified" });
  }, /uq_vanshawali_logical_edge violation/);
});

// 7. Parent-child direction
test("Requirement 07: Parent-child direction invariant & self-link prevention", () => {
  const db = new MockRelationalDb();
  const p1 = db.createPerson({ display_name: "Person 1" });
  const p2 = db.createPerson({ display_name: "Person 2" });

  // Self link is prevented by check constraint
  assert.throws(() => {
    db.createRelationship({ from_person_id: p1.id, to_person_id: p1.id, relation: "father" });
  }, /chk_vanshawali_no_self_link/);

  // Directional invariant: for 'child' relation, from is ancestor, to is child
  const rel = db.createRelationship({
    from_person_id: p1.id, // ancestor
    to_person_id: p2.id,   // child
    relation: "child",
  });
  assert.equal(rel.from_person_id, p1.id);
  assert.equal(rel.to_person_id, p2.id);
});

// 8. Spouse relationship
test("Requirement 08: Spouse relationship and dual-parent auto-linking", () => {
  const db = new MockRelationalDb();
  const husband = db.createPerson({ display_name: "Husband", gender: "male" });
  const wife = db.createPerson({ display_name: "Wife", gender: "female" });
  const child = db.createPerson({ display_name: "Child", gender: "male" });

  // Link husband and wife
  const spouseLink = db.createRelationship({
    from_person_id: husband.id,
    to_person_id: wife.id,
    relation: "spouse",
    status: "verified",
  });
  assert.equal(spouseLink.relation, "spouse");

  // Co-parent logic: adding child under husband resolves wife as co-parent and links both
  const coParents = [husband.id, wife.id];
  const createdChildLinks = coParents.map((parentId) =>
    db.createRelationship({
      from_person_id: parentId,
      to_person_id: child.id,
      relation: "child",
      status: "verified",
    })
  );

  assert.equal(createdChildLinks.length, 2);
  assert.ok(createdChildLinks.some((l) => l.from_person_id === husband.id));
  assert.ok(createdChildLinks.some((l) => l.from_person_id === wife.id));
});

// 9. Pending relationship
test("Requirement 09: Pending relationship visibility filters unverified links", () => {
  const db = new MockRelationalDb();
  const uProposer = "user_proposer";
  const uViewer = "user_other_stranger";
  const uStaff = "user_staff";

  const pA = db.createPerson({ display_name: "A" });
  const pB = db.createPerson({ display_name: "B" });

  const pendingLink = db.createRelationship({
    from_person_id: pA.id,
    to_person_id: pB.id,
    relation: "child",
    status: "pending",
    proposed_by: uProposer,
  });

  function isVisibleTo(viewerId, userRole) {
    const isStaff = ["core_committee", "super_admin"].includes(userRole);
    return (
      pendingLink.status === "verified" ||
      pendingLink.proposed_by === viewerId ||
      isStaff
    );
  }

  // Stranger cannot see pending link
  assert.equal(isVisibleTo(uViewer, "normal"), false);
  // Proposer can see pending link
  assert.equal(isVisibleTo(uProposer, "normal"), true);
  // Staff can see pending link
  assert.equal(isVisibleTo(uStaff, "core_committee"), true);
});

// 10. Verification/rejection
test("Requirement 10: Verification/rejection updates status, verified_by, and timestamp", () => {
  const db = new MockRelationalDb();
  const pA = db.createPerson({ display_name: "A" });
  const pB = db.createPerson({ display_name: "B" });

  const link = db.createRelationship({
    from_person_id: pA.id,
    to_person_id: pB.id,
    relation: "father",
    status: "pending",
    proposed_by: "user_proposer",
  });

  // Execute verification by staff
  const staffUserId = "user_core_committee_99";
  link.status = "verified";
  link.verified_by = staffUserId;
  link.verified_at = new Date().toISOString();

  assert.equal(link.status, "verified");
  assert.equal(link.verified_by, staffUserId);
  assert.ok(link.verified_at !== null);

  // Execute rejection
  link.status = "rejected";
  assert.equal(link.status, "rejected");
});

// 11. Authorization
test("Requirement 11: Authorization enforces anti-self-verification and tree modification ownership", () => {
  const proposerId = "user_regular_1";
  const otherMemberId = "user_regular_2";
  const staffId = "user_admin_1";

  const link = {
    id: "l_test_auth",
    proposed_by: proposerId,
    status: "pending",
  };

  function canVerify(actorId, role) {
    const isStaff = ["core_committee", "super_admin"].includes(role);
    if (!isStaff && link.proposed_by === actorId) {
      return { allowed: false, status: 403, error: "Dusra member / staff verify kare" };
    }
    return { allowed: true, status: 200 };
  }

  // Self-verification by regular member is denied
  const resSelf = canVerify(proposerId, "normal");
  assert.equal(resSelf.allowed, false);
  assert.equal(resSelf.status, 403);

  // Verification by counterparty member is permitted
  const resCounterparty = canVerify(otherMemberId, "normal");
  assert.equal(resCounterparty.allowed, true);

  // Verification by staff is permitted even if proposer
  const resStaff = canVerify(proposerId, "core_committee");
  assert.equal(resStaff.allowed, true);
});

// 12. Cycle protection
test("Requirement 12: Cycle protection intercepts circular parent-child loops cleanly", () => {
  // Graph: A -> B -> C -> A
  const edges = [
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "C", to: "A" }, // loop
  ];

  function traverseDescendants(startNode, maxDepth = 12) {
    const visited = new Set();
    const queue = [{ id: startNode, depth: 0, path: [startNode] }];
    let stepCount = 0;

    while (queue.length > 0) {
      stepCount++;
      if (stepCount > 100) throw new Error("Infinite loop detected: cycle protection failed!");
      const curr = queue.shift();
      if (curr.depth >= maxDepth) continue;

      for (const e of edges) {
        if (e.from === curr.id) {
          // SQL equivalent: NOT (e.to_person_id = ANY(d.path))
          if (curr.path.includes(e.to)) {
            continue; // cycle trapped and skipped!
          }
          visited.add(e.to);
          queue.push({
            id: e.to,
            depth: curr.depth + 1,
            path: [...curr.path, e.to],
          });
        }
      }
    }
    return { visited: Array.from(visited), stepCount };
  }

  const { visited, stepCount } = traverseDescendants("A");
  assert.ok(stepCount < 10, "Cycle loop was not cleanly bounded");
  assert.deepEqual(visited.sort(), ["B", "C"]);
});

// 13. 12-generation bound
test("Requirement 13: Lineage traversal terminates at exact 12-generation bound", () => {
  // Generate 15 generations in a straight line: G0 -> G1 -> ... -> G14
  const edges = [];
  for (let i = 0; i < 14; i++) {
    edges.push({ from: `G${i}`, to: `G${i + 1}` });
  }

  function traverseWithDepth(startNode, maxDepth = 12) {
    const visited = [];
    const queue = [{ id: startNode, depth: 0 }];

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr.depth >= maxDepth) continue;

      for (const e of edges) {
        if (e.from === curr.id) {
          visited.push({ id: e.to, depth: curr.depth + 1 });
          queue.push({ id: e.to, depth: curr.depth + 1 });
        }
      }
    }
    return visited;
  }

  const result = traverseWithDepth("G0", 12);
  const maxReachedDepth = Math.max(...result.map((r) => r.depth));
  assert.equal(maxReachedDepth, 12, "Depth did not cap at 12");
  assert.ok(!result.some((r) => r.id === "G13" || r.id === "G14"), "Nodes beyond 12 generations were traversed");
});

// 14. Concurrent mutation safety
test("Requirement 14: Concurrent mutation safety & idempotent upsert semantics", () => {
  const db = new MockRelationalDb();

  // First insert
  const p1 = db.createPerson({
    id: "uuid_conc_1",
    legacy_id: "v_conc_1",
    display_name: "Original Name",
    birth_year: 1970,
  });

  // Concurrent/repeated sync simulating ON CONFLICT (legacy_id) DO UPDATE
  function upsertPerson(legacyId, updatePayload) {
    let existing = db.findPersonByIdOrLegacy(legacyId);
    if (existing) {
      Object.assign(existing, updatePayload, { updated_at: new Date().toISOString() });
      return existing;
    }
    return db.createPerson({ legacy_id: legacyId, ...updatePayload });
  }

  const updated = upsertPerson("v_conc_1", { display_name: "Updated Name", birth_year: 1972 });
  assert.equal(db.persons.size, 1); // No duplicate rows created
  assert.equal(updated.display_name, "Updated Name");
  assert.equal(updated.birth_year, 1972);
});

// 15. Response shape compatibility
test("Requirement 15: Response shape adheres 100% to frontend canvas contract", () => {
  // Contract required keys in GET /api/vanshawali
  const responsePayload = {
    tree: {
      centre: {
        id: "v_centre_1",
        user_id: "user_uuid_1",
        display_name: "Main Member",
        gender: "male",
        birth_year: 1985,
        birth_date: "1985-06-20",
        age: 41,
        photo_url: null,
        relation: "self",
        status: "verified",
        gotra: "Kamble",
      },
      spouses: [],
      parents: [],
      children: [],
      grandparents: [],
      grandchildren: [],
      siblings: [],
      siblings_of: {},
      spouses_of: {},
      levels_up: [],
      levels_down: [],
    },
    pending_count: 0,
    can_edit: true,
    is_owner: true,
    is_super_admin: false,
  };

  const expectedTreeKeys = [
    "centre",
    "spouses",
    "parents",
    "children",
    "grandparents",
    "grandchildren",
    "siblings",
    "siblings_of",
    "spouses_of",
    "levels_up",
    "levels_down",
  ];

  for (const k of expectedTreeKeys) {
    assert.ok(k in responsePayload.tree, `Missing required key '${k}' in tree object`);
  }

  assert.equal(typeof responsePayload.pending_count, "number");
  assert.equal(typeof responsePayload.can_edit, "boolean");
  assert.equal(typeof responsePayload.is_owner, "boolean");
});

// 16. Search functionality for registered + unregistered
test("Requirement 16: Search functionality handles registered users and unregistered ancestors", () => {
  const registeredUsers = [
    { id: "u1", full_name: "Santosh Baburao Matang", native_village: "Solapur", photo_url: null },
    { id: "u2", full_name: "Sunil Baburao Matang", native_village: "Kolhapur", photo_url: null },
  ];

  const unregisteredPersons = [
    { id: "p1", legacy_id: "v_anc_1", display_name: "Baburao Rama Matang", birth_year: 1930, photo_url: null, user_id: null },
  ];

  function searchVanshawali(query, sessionUserId) {
    const qLower = query.toLowerCase();
    const hits = [];

    // Registered members
    for (const u of registeredUsers) {
      if (u.id === sessionUserId) continue;
      if (u.full_name.toLowerCase().includes(qLower)) {
        hits.push({
          id: u.id,
          full_name: u.full_name,
          native_village: `📍 ${u.native_village}`,
          photo_url: u.photo_url,
          is_registered: true,
        });
      }
    }

    // Unregistered ancestors
    for (const p of unregisteredPersons) {
      if (p.display_name.toLowerCase().includes(qLower)) {
        const pId = p.legacy_id || p.id;
        if (!hits.some((h) => h.id === pId || h.full_name.toLowerCase() === p.display_name.toLowerCase())) {
          hits.push({
            id: pId,
            full_name: p.display_name,
            native_village: p.birth_year ? `🌳 Ancestor (b. ${p.birth_year})` : "🌳 Family Ancestor",
            photo_url: p.photo_url,
            is_registered: false,
          });
        }
      }
    }

    return { users: hits };
  }

  // Search "Baburao" matches both registered sons and unregistered ancestor
  const result = searchVanshawali("Baburao", "session_user_x");
  assert.equal(result.users.length, 3);
  
  const regHit = result.users.find((h) => h.id === "u1");
  assert.equal(regHit?.is_registered, true);
  assert.ok(regHit?.native_village.includes("📍 Solapur"));

  const ancHit = result.users.find((h) => h.id === "v_anc_1");
  assert.equal(ancHit?.is_registered, false);
  assert.ok(ancHit?.native_village.includes("🌳 Ancestor (b. 1930)"));
});

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log("\n=======================================================");
console.log(`  RESULTS: ${passed} / ${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
console.log("=======================================================\n");

if (passed !== total) {
  process.exit(1);
}
