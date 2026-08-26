"use client";
/**
 * ═══════════════════════════════════════════════════════════════
 * VANSHAWALI — LOCKED (do not break these rules)
 * ═══════════════════════════════════════════════════════════════
 * METAPHOR: Each bubble = a real person. Each line = a living
 * relationship between two people — it must NEVER float or break
 * (lines overshoot INSIDE bubbles; zero visible gap).
 *
 * CORE (mind-map):
 *   Self centre · parents up · children down · spouse side
 *   Father-side ancestors LEFT half · Mother-side RIGHT half
 *   Full names · multi-row if needed · no left/right clip
 *   Owner or Super-Admin (Edit toggle) may edit
 *
 * ADD / REMOVE UX (no floating + on canvas):
 *   • Click ANY bubble → sheet
 *   • Self: Add Father · Mother · Spouse · Child
 *   • Parent / GP: Add their parent · Remove
 *   • Child / GC: Add their child · Remove
 *   • Spouse: Remove
 *   New person links to the bubble you opened from
 *
 * LINES (blood / parent–child) — LOCKED:
 *   Start inside source · end INSIDE target (IN px overshoot)
 *   Male → left · Female → right · gender or relation
 *
 * MARRIAGE (EXTRA, does not change locked bubbles/layout):
 *   Very light green outer ring on both partners + green link
 *   between husband–wife only (same inward zero-gap rule).
 *   Pairs: self–spouse, father–mother, each GP couple (dada–dadi /
 *   nana–nani), and any child–spouse when present.
 * ═══════════════════════════════════════════════════════════════
 */
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useCallback, useEffect, useMemo, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Plus, Trash2, X, Focus, User, Pencil, Search } from "lucide-react";

type Node = {
  id: string;
  user_id?: string | null;
  display_name: string;
  gender?: string | null;
  birth_year?: number | null;
  birth_date?: string | null;
  age?: number | null;
  photo_url?: string | null;
  relation: string;
  status?: string;
  link_id?: string;
  via_id?: string;
  via_parent_id?: string;
  via_child_id?: string;
};

type Tree = {
  centre: Node;
  parents: Node[];
  spouses: Node[];
  children: Node[];
  grandparents?: Node[];
  grandchildren?: Node[];
  siblings?: Node[];
  spouses_of?: Record<string, Node[]>;
  levels_up?: Node[][];
  levels_down?: Node[][];
};

type SearchHit = {
  id: string;
  full_name: string;
  native_village?: string;
  photo_url?: string;
};

const REL: Record<string, Record<string, string>> = {
  en: {
    self: "Self",
    father: "Father",
    mother: "Mother",
    spouse: "Spouse",
    sibling: "Sibling",
    brother: "Brother",
    sister: "Sister",
    child: "Child",
    son: "Son",
    daughter: "Daughter",
    grandfather: "Grandfather",
    grandmother: "Grandmother",
    grandchild: "Grandchild",
  },
  hi: {
    self: "स्वयं",
    father: "पिता",
    mother: "माता",
    spouse: "जीवनसाथी",
    sibling: "भाई/बहन",
    brother: "भाई",
    sister: "बहन",
    child: "संतान",
    son: "पुत्र",
    daughter: "पुत्री",
    grandfather: "दादा/नाना",
    grandmother: "दादी/नानी",
    grandchild: "पोता/पोती",
  },
};

function formatBirth(n: {
  birth_date?: string | null;
  birth_year?: number | null;
}) {
  if (n.birth_date && /^\d{4}-\d{2}-\d{2}/.test(n.birth_date)) {
    const [y, m, d] = n.birth_date.split("-").map((x) => parseInt(x, 10));
    if (y && m && d) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d} ${months[m - 1]} ${y}`;
    }
  }
  if (n.birth_year && n.birth_year > 1800 && n.birth_year < 2100) return String(n.birth_year);
  return "";
}

function lbl(lang: string, key: string, gender?: string | null) {
  const L = REL[lang] || REL.en;
  if (key === "child") {
    if (gender === "female" || gender === "F") return L.daughter;
    if (gender === "male" || gender === "M") return L.son;
  }
  if (key === "father" && false) return L.father;
  return L[key] || key;
}

function curve(x1: number, y1: number, x2: number, y2: number) {
  const my = (y1 + y2) / 2;
  return `M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

/** Resolve male/female from gender field OR relation label */
function resolveSex(
  gender?: string | null,
  relation?: string | null
): "M" | "F" | null {
  const g = (gender || "").toLowerCase();
  if (g === "female" || g === "f" || g === "woman") return "F";
  if (g === "male" || g === "m" || g === "man") return "M";
  const r = (relation || "").toLowerCase();
  if (
    ["mother", "grandmother", "wife", "spouse", "daughter", "sister"].includes(r)
  )
    return "F";
  if (
    ["father", "grandfather", "husband", "son", "brother"].includes(r)
  )
    return "M";
  return null;
}

/** Measured bubble body (~px-2.5 py-1.5 + 12px text) */
const BUBBLE_H = 42;

/** Soft generation fills (transparent) + 3D shadow */
const GEN_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  self: {
    bg: "rgba(245, 185, 66, 0.42)",
    border: "rgba(217, 119, 6, 0.45)",
    text: "#78350f",
  },
  up1: {
    bg: "rgba(167, 139, 250, 0.38)",
    border: "rgba(139, 92, 246, 0.4)",
    text: "#4c1d95",
  },
  up2: {
    bg: "rgba(96, 165, 250, 0.36)",
    border: "rgba(59, 130, 246, 0.38)",
    text: "#1e3a8a",
  },
  up3: {
    bg: "rgba(45, 212, 191, 0.32)",
    border: "rgba(20, 184, 166, 0.35)",
    text: "#134e4a",
  },
  down1: {
    bg: "rgba(52, 211, 153, 0.36)",
    border: "rgba(16, 185, 129, 0.4)",
    text: "#064e3b",
  },
  down2: {
    bg: "rgba(251, 146, 60, 0.36)",
    border: "rgba(249, 115, 22, 0.38)",
    text: "#7c2d12",
  },
  spouse: {
    bg: "rgba(244, 114, 182, 0.32)",
    border: "rgba(236, 72, 153, 0.35)",
    text: "#831843",
  },
  sibling: {
    bg: "rgba(129, 140, 248, 0.34)",
    border: "rgba(99, 102, 241, 0.4)",
    text: "#312e81",
  },
};
const BUBBLE_3D =
  "0 2px 4px rgba(0,0,0,0.12), 0 6px 14px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.55)";
/** Name-plate: embossed letter feel */
const NAMEPLATE =
  "0 1px 0 rgba(255,255,255,0.65), 0 -1px 0 rgba(0,0,0,0.12)";

/** Pull line endpoints INSIDE the bubble so no hairline gap remains */
const IN = 10;

/**
 * Dock INSIDE bubble (overshoot) — 100% connected, zero visible gap.
 * dir "up"   = arrives from above → top edge, then +IN into bubble
 * dir "down" = arrives from below → bottom edge, then -IN into bubble
 * male → left third, female → right third
 */
function dock(
  cx: number,
  topY: number,
  w: number,
  dir: "up" | "down",
  gender?: string | null,
  relation?: string | null
): { x: number; y: number } {
  const sex = resolveSex(gender, relation);
  const side = Math.min(14, w * 0.28);
  let x = cx;
  if (sex === "M") x = cx - w / 2 + side;
  else if (sex === "F") x = cx + w / 2 - side;
  // go INSIDE the pill
  const y = dir === "up" ? topY + IN : topY + BUBBLE_H - IN;
  return { x, y };
}

/** Start from centre edge, also slightly inside so join is solid */
function undock(cx: number, topY: number, dir: "up" | "down"): { x: number; y: number } {
  const y = dir === "up" ? topY + IN : topY + BUBBLE_H - IN;
  return { x: cx, y };
}

function nameW(name: string, max = 148) {
  return Math.min(max, Math.max(56, Math.round(Math.max((name || "?").length, 3) * 7.4 + 24)));
}

/** Even slots inside [pad, W-pad], never outside screen */
function slotXsInView(count: number, W: number, pad = 12): number[] {
  if (count <= 0) return [];
  if (count === 1) return [W / 2];
  const usable = W - pad * 2;
  const step = usable / (count - 1);
  return Array.from({ length: count }, (_, i) => pad + i * step);
}

/** Clamp centre-x so bubble of width w stays fully inside [pad, W-pad] */
function clampX(x: number, w: number, W: number, pad = 10) {
  const half = w / 2;
  return Math.max(pad + half, Math.min(W - pad - half, x));
}

/**
 * Smart pack: real widths, zero horizontal overlap.
 * If row too wide for screen → wrap to next sub-row (upar/neeche stagger).
 * Returns { x, row } per item. Optional mild tilt only when still tight.
 */
function packSmart(
  widths: number[],
  W: number,
  pad = 10,
  gap = 10,
  preferCx?: number,
  /** optional hard bounds — pack ONLY inside [xMin, xMax] */
  xMin?: number,
  xMax?: number
): { x: number; row: number }[] {
  const n = widths.length;
  const lo = xMin ?? pad;
  const hi = xMax ?? W - pad;
  const span = Math.max(40, hi - lo);
  if (n === 0) return [];
  if (n === 1) {
    const x = Math.max(lo + widths[0] / 2, Math.min(hi - widths[0] / 2, preferCx ?? (lo + hi) / 2));
    return [{ x, row: 0 }];
  }

  const rows: number[][] = [[]];
  let rowW = 0;
  widths.forEach((w, i) => {
    const need = (rowW > 0 ? gap : 0) + w;
    if (rowW > 0 && rowW + need > span) {
      rows.push([]);
      rowW = 0;
    }
    rows[rows.length - 1].push(i);
    rowW += (rows[rows.length - 1].length > 1 ? gap : 0) + w;
  });

  const out: { x: number; row: number }[] = new Array(n);
  rows.forEach((idxs, r) => {
    const ws = idxs.map((i) => widths[i]);
    const total = ws.reduce((s, w) => s + w, 0) + gap * Math.max(0, ws.length - 1);
    const mid = preferCx ?? (lo + hi) / 2;
    let start = mid - total / 2;
    if (start < lo) start = lo;
    if (start + total > hi) start = Math.max(lo, hi - total);
    let cursor = start;
    idxs.forEach((i, j) => {
      const w = ws[j];
      out[i] = { x: cursor + w / 2, row: r };
      cursor += w + gap;
    });
  });
  return out;
}

/** Mild tilt (deg) only for visual air when 3+ on same row — optional polish */
function mildTilt(i: number, count: number) {
  if (count < 2) return 0;
  const mid = (count - 1) / 2;
  return Math.max(-8, Math.min(8, (i - mid) * 2.8));
}

function VanshawaliInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rootId = searchParams.get("user") || user?.id || "";
  const wrapRef = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(360);

  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiCanEdit, setApiCanEdit] = useState(false);
  const [isSA, setIsSA] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [saEditMode, setSaEditMode] = useState(false);
  const [selected, setSelected] = useState<Node | null>(null);

  // add form
  const [draft, setDraft] = useState<{
    relation: string;
    centre_person_id?: string;
    name: string;
    birth_year: string;
    birth_date: string;
    member_user_id: string | null;
  } | null>(null);
  const [editDraft, setEditDraft] = useState<{
    person_id: string;
    link_id?: string;
    name: string;
    birth_year: string;
    birth_date: string;
    gender: string;
    relation: string;
  } | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const L = useMemo(() => REL[lang] || REL.en, [lang]);
  const canEdit = apiCanEdit && (isOwner || (isSA && saEditMode));

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setVw(Math.max(300, el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tree]);

  const load = useCallback(() => {
    if (!rootId) return;
    setLoading(true);
    fetch(`/api/vanshawali?userId=${rootId}`)
      .then((r) => r.json())
      .then((d) => {
        setTree(d.tree || null);
        setApiCanEdit(!!d.can_edit);
        setIsSA(!!d.is_super_admin);
        setIsOwner(!!d.is_owner);
      })
      .catch(() => toast("Load failed", "error"))
      .finally(() => setLoading(false));
  }, [rootId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!draft || q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/vanshawali/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d) => setHits(d.users || []))
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => clearTimeout(t);
  }, [q, draft]);

  const saveAdd = async () => {
    if (!draft) return;
    if (!draft.member_user_id && !draft.name.trim()) {
      toast(lang === "hi" ? "Search ya name" : "Search or enter name", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          centre_user_id: draft.centre_person_id ? undefined : rootId,
          centre_person_id: draft.centre_person_id || undefined,
          root_user_id: rootId,
          relation: draft.relation,
          display_name: draft.name.trim() || undefined,
          birth_year: draft.birth_year || null,
          birth_date: draft.birth_date || null,
          member_user_id: draft.member_user_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        return;
      }
      setDraft(null);
      setQ("");
      setHits([]);
      load();
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editDraft) return;
    if (!editDraft.name.trim()) {
      toast("Name required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          person_id: editDraft.person_id,
          link_id: editDraft.link_id || undefined,
          display_name: editDraft.name.trim(),
          birth_year: editDraft.birth_year || null,
          birth_date: editDraft.birth_date || null,
          gender: editDraft.gender || null,
          relation: editDraft.relation || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Edit failed", "error");
        return;
      }
      setEditDraft(null);
      setSelected(null);
      load();
      toast(lang === "hi" ? "सेव हो गया" : "Saved", "success");
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (node: Node) => {
    if (!node.link_id) return;
    if (!confirm(lang === "hi" ? "Rishta hataayein?" : "Remove relation?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          link_id: node.link_id,
          centre_person_id: tree?.centre.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        return;
      }
      setSelected(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const openAdd = (relation: string, centrePersonId?: string) => {
    if (!canEdit) return;
    setDraft({
      relation,
      centre_person_id: centrePersonId,
      name: "",
      birth_year: "",
      birth_date: "",
      member_user_id: null,
    });
    setQ("");
    setHits([]);
  };

  // Layout — auto canvas: levels_up / levels_down extend height; no overlap
  const levelsUp: Node[][] =
    tree?.levels_up && tree.levels_up.length
      ? tree.levels_up
      : [
          ...(tree?.parents?.length ? [tree.parents] : []),
          ...(tree?.grandparents?.length ? [tree.grandparents] : []),
        ].filter((l) => l.length);
  const levelsDown: Node[][] =
    tree?.levels_down && tree.levels_down.length
      ? tree.levels_down
      : [
          ...(tree?.children?.length ? [tree.children] : []),
          ...(tree?.grandchildren?.length ? [tree.grandchildren] : []),
        ].filter((l) => l.length);

  const parents = levelsUp[0] || tree?.parents || [];
  const spouses = tree?.spouses || [];
  const children = levelsDown[0] || tree?.children || [];
  const grandparents = levelsUp[1] || tree?.grandparents || [];
  const grandchildren = levelsDown[1] || tree?.grandchildren || [];

  const W = vw;
  const pad = 10;
  const gap = 10;
  const cx = W / 2;
  const midGate = W / 2;
  const subRowH = 52;
  const levelGap = 28;

  type Placed = {
    n: Node;
    x: number;
    top: number;
    w: number;
    genKey: keyof typeof GEN_STYLE;
    side?: "L" | "R";
  };
  const placed: Placed[] = [];
  const posById = new Map<string, { x: number; top: number; w: number }>();
  const linesBlood: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];

  let yCursor = 16;

  // —— UP levels: farthest first (top of canvas) ——
  const upTops: number[] = [];
  for (let di = levelsUp.length - 1; di >= 0; di--) {
    const level = levelsUp[di];
    const genKey = (di === 0 ? "up1" : di === 1 ? "up2" : "up3") as keyof typeof GEN_STYLE;
    // sort father-side left: prefer father relation first within via groups
    const sorted = [...level].sort((a, b) => {
      const va = a.via_id || a.via_parent_id || "";
      const vb = b.via_id || b.via_parent_id || "";
      if (va !== vb) return va.localeCompare(vb);
      const ra = a.relation === "father" ? 0 : a.relation === "mother" ? 1 : 2;
      const rb = b.relation === "father" ? 0 : b.relation === "mother" ? 1 : 2;
      return ra - rb;
    });

    // For parents (di===0): father left half, mother right half
    if (di === 0) {
      const fathers = sorted.filter((n) => n.relation === "father");
      const mothers = sorted.filter((n) => n.relation === "mother");
      const other = sorted.filter((n) => n.relation !== "father" && n.relation !== "mother");
      const placeHalf = (list: Node[], side: "L" | "R") => {
        if (!list.length) return 0;
        const lo = side === "L" ? pad : midGate + 12;
        const hi = side === "L" ? midGate - 12 : W - pad;
        const widths = list.map((n) => nameW(n.display_name));
        const pack = packSmart(widths, W, pad, gap, (lo + hi) / 2, lo, hi);
        let maxR = 0;
        list.forEach((n, i) => {
          const top = yCursor + pack[i].row * subRowH;
          maxR = Math.max(maxR, pack[i].row);
          const w = widths[i];
          placed.push({ n, x: pack[i].x, top, w, genKey, side });
          posById.set(n.id, { x: pack[i].x, top, w });
        });
        return maxR;
      };
      const r1 = placeHalf(fathers, "L");
      const r2 = placeHalf(mothers, "R");
      const r3 = placeHalf(other, "L");
      const maxR = Math.max(r1, r2, r3);
      upTops[di] = yCursor;
      yCursor += (maxR + 1) * subRowH + levelGap;
    } else {
      // Higher ancestors: group by via, pack near parent column
      const byVia = new Map<string, Node[]>();
      sorted.forEach((n) => {
        const k = n.via_id || n.via_parent_id || "_";
        if (!byVia.has(k)) byVia.set(k, []);
        byVia.get(k)!.push(n);
      });
      let maxR = 0;
      // First pass: if parent not placed yet (we're going top-down farthest first),
      // parent is lower — use prefer cx; second pass after parents won't work top-down.
      // So pack full width smart for this level.
      const widths = sorted.map((n) => nameW(n.display_name));
      const pack = packSmart(widths, W, pad, gap, cx);
      sorted.forEach((n, i) => {
        const top = yCursor + pack[i].row * subRowH;
        maxR = Math.max(maxR, pack[i].row);
        const w = widths[i];
        placed.push({ n, x: pack[i].x, top, w, genKey });
        posById.set(n.id, { x: pack[i].x, top, w });
      });
      upTops[di] = yCursor;
      yCursor += (maxR + 1) * subRowH + levelGap;
    }
  }

  // Parents Y for marriage / lines compatibility
  const parentsSorted = [...parents].sort((a, b) => {
    const ra = a.relation === "father" ? 0 : a.relation === "mother" ? 1 : 2;
    const rb = b.relation === "father" ? 0 : b.relation === "mother" ? 1 : 2;
    return ra - rb;
  });
  const parXs = parentsSorted.map((p) => posById.get(p.id)?.x ?? cx);
  const parRows = parentsSorted.map(() => 0);
  const yPar = parentsSorted.length
    ? Math.min(...parentsSorted.map((p) => posById.get(p.id)?.top ?? yCursor))
    : yCursor;
  const parentXById = new Map(parentsSorted.map((p) => [p.id, posById.get(p.id)?.x ?? cx]));
  const parentRowById = new Map(parentsSorted.map((p) => [p.id, 0]));
  const parMaxRow = 0;
  const parAdd = { x: cx, row: 0 };

  // —— Centre + spouses ——
  const centreW = nameW(tree?.centre.display_name || "Self", 170);
  const spouseW0 = spouses[0] ? nameW(spouses[0].display_name) : 0;
  const yMid = yCursor + 24;
  const centreX = clampX(
    spouses.length ? cx - (spouseW0 + 16) / 2 : cx,
    centreW,
    W,
    pad
  );
  if (tree) {
    posById.set(tree.centre.id, { x: centreX, top: yMid - 20, w: centreW });
  }
  const spousePositions = spouses.map((s, i) => {
    const w = nameW(s.display_name);
    const raw = centreX + centreW / 2 + 14 + w / 2 + i * (w + 10);
    const x = clampX(raw, w, W, pad);
    posById.set(s.id, { x, top: yMid - 20, w });
    return { x, w };
  });
  yCursor = yMid + 56;

  // —— DOWN levels ——
  const downTops: number[] = [];
  for (let di = 0; di < levelsDown.length; di++) {
    const level = levelsDown[di];
    const genKey = (di === 0 ? "down1" : "down2") as keyof typeof GEN_STYLE;
    const sorted = [...level];
    // Group by via for column preference
    const byVia = new Map<string, Node[]>();
    sorted.forEach((n) => {
      const k = n.via_id || n.via_child_id || (di === 0 ? tree?.centre.id || "_" : "_");
      if (!byVia.has(k)) byVia.set(k, []);
      byVia.get(k)!.push(n);
    });
    let maxR = 0;
    const levelPlaced: { n: Node; x: number; row: number; w: number }[] = [];
    byVia.forEach((list, via) => {
      const prefer = posById.get(via)?.x ?? cx;
      const widths = list.map((n) => nameW(n.display_name));
      const pack = packSmart(widths, W, pad, gap, prefer);
      list.forEach((n, i) => {
        maxR = Math.max(maxR, pack[i].row);
        levelPlaced.push({ n, x: pack[i].x, row: pack[i].row, w: widths[i] });
      });
    });
    // Resolve horizontal overlaps across groups on same row
    const byRow = new Map<number, typeof levelPlaced>();
    levelPlaced.forEach((p) => {
      if (!byRow.has(p.row)) byRow.set(p.row, []);
      byRow.get(p.row)!.push(p);
    });
    byRow.forEach((rowItems) => {
      rowItems.sort((a, b) => a.x - b.x);
      for (let i = 1; i < rowItems.length; i++) {
        const prev = rowItems[i - 1];
        const cur = rowItems[i];
        const minX = prev.x + prev.w / 2 + gap + cur.w / 2;
        if (cur.x < minX) cur.x = minX;
      }
      // shift left if overflow
      const last = rowItems[rowItems.length - 1];
      const overflow = last.x + last.w / 2 - (W - pad);
      if (overflow > 0) {
        rowItems.forEach((it) => {
          it.x = Math.max(pad + it.w / 2, it.x - overflow);
        });
      }
    });
    levelPlaced.forEach((p) => {
      const top = yCursor + p.row * subRowH;
      placed.push({ n: p.n, x: p.x, top, w: p.w, genKey });
      posById.set(p.n.id, { x: p.x, top, w: p.w });
    });
    downTops[di] = yCursor;
    yCursor += (maxR + 1) * subRowH + levelGap;
  }

  const chXs = children.map((c) => posById.get(c.id)?.x ?? cx);
  const chRows = children.map(() => 0);
  const chMaxRow = 0;
  const yChild = children.length
    ? Math.min(...children.map((c) => posById.get(c.id)?.top ?? yCursor))
    : yCursor;
  const childXById = new Map(children.map((c) => [c.id, posById.get(c.id)?.x ?? cx]));
  const childWById = new Map(children.map((c) => [c.id, nameW(c.display_name)]));
  const chAdd = { x: cx, row: 0 };

  // GP/GC compat for marriage pairs
  const gpPositions = (levelsUp[1] || []).map((n) => {
    const p = posById.get(n.id);
    return { n, x: p?.x ?? cx, row: 0, tilt: 0 };
  });
  const yGpBase = gpPositions.length
    ? Math.min(...gpPositions.map((g) => posById.get(g.n.id)?.top ?? 20))
    : -80;
  const gpMaxRow = 0;
  const gcPositions = (levelsDown[1] || []).map((n) => {
    const p = posById.get(n.id);
    return { n, x: p?.x ?? cx, row: 0 };
  });
  const yGcBase = gcPositions.length
    ? Math.min(...gcPositions.map((g) => posById.get(g.n.id)?.top ?? yCursor))
    : -80;
  const gcMaxRow = 0;

  const H = yCursor + 48;

  // Spouses of parents / children / GP (not only centre)
  const spousesOf = tree?.spouses_of || {};
  const centreSpouseIds = new Set((tree?.spouses || []).map((s) => s.id));
  const extraSpousePlaced: Placed[] = [];
  const usedSpouseIds = new Set<string>(Array.from(centreSpouseIds).concat(tree?.centre.id || ""));

  for (const [ownerId, list] of Object.entries(spousesOf)) {
    if (ownerId === tree?.centre.id) continue; // centre spouses already placed
    const owner = posById.get(ownerId);
    if (!owner) continue;
    list.forEach((s, i) => {
      if (usedSpouseIds.has(s.id)) return;
      // skip if already in levels as blood relative
      if (posById.has(s.id)) {
        // still marriage pair via pushCouple later
        return;
      }
      usedSpouseIds.add(s.id);
      const w = nameW(s.display_name);
      // place to the right of owner, stack if multiple
      let x = owner.x + owner.w / 2 + 12 + w / 2 + i * (w + 8);
      x = clampX(x, w, W, pad);
      // if overflows, try left
      if (x + w / 2 > W - pad - 2) {
        x = clampX(owner.x - owner.w / 2 - 12 - w / 2 - i * (w + 8), w, W, pad);
      }
      const top = owner.top;
      const pl: Placed = { n: { ...s, relation: "spouse" }, x, top, w, genKey: "spouse" };
      extraSpousePlaced.push(pl);
      placed.push(pl);
      posById.set(s.id, { x, top, w });
    });
  }

  // Siblings of self — same band as centre, to the left of self
  const siblings = tree?.siblings || [];
  if (siblings.length && tree) {
    let cursorX = centreX - centreW / 2 - 14;
    siblings.forEach((s) => {
      if (posById.has(s.id)) return;
      const w = nameW(s.display_name);
      const x = clampX(cursorX - w / 2, w, W, pad);
      cursorX = x - w / 2 - 12;
      const top = yMid - 20;
      const pl: Placed = {
        n: { ...s, relation: "sibling" },
        x,
        top,
        w,
        genKey: "sibling",
      };
      placed.push(pl);
      posById.set(s.id, { x, top, w });
    });
  }

  // Blood lines: each placed node (not centre) to via parent/child
  placed.forEach((pl) => {
    const via = pl.n.via_id || pl.n.via_parent_id || pl.n.via_child_id;
    let parentPos = via ? posById.get(via) : undefined;
    // parents connect to centre
    if (!parentPos && parents.some((p) => p.id === pl.n.id) && tree) {
      parentPos = posById.get(tree.centre.id);
    }
    // children of centre
    if (!parentPos && children.some((c) => c.id === pl.n.id) && tree) {
      parentPos = posById.get(tree.centre.id);
    }
    if (!parentPos) return;
    const childIsBelow = pl.top > parentPos.top;
    if (childIsBelow) {
      // parent above → child below
      const start = undock(parentPos.x, parentPos.top, "down");
      const end = dock(pl.x, pl.top, pl.w, "up", pl.n.gender, pl.n.relation);
      linesBlood.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y, key: `b-${pl.n.id}` });
    } else {
      // ancestor above → parent below
      const start = undock(parentPos.x, parentPos.top, "up");
      const end = dock(pl.x, pl.top, pl.w, "down", pl.n.gender, pl.n.relation);
      linesBlood.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y, key: `b-${pl.n.id}` });
    }
  });

  // Spouse → centre children dual-parent visual
  spouses.forEach((sp) => {
    const spos = posById.get(sp.id);
    if (!spos) return;
    children.forEach((c) => {
      const cp = posById.get(c.id);
      if (!cp) return;
      const start = undock(spos.x, spos.top, "down");
      const end = dock(cp.x, cp.top, cp.w, "up", c.gender, c.relation);
      linesBlood.push({
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        key: `scl-${sp.id}-${c.id}`,
      });
    });
  });

  // EXTRA: marriage pairs — every husband–wife from spouses_of + centre
  type MPair = {
    ax: number; ay: number; aw: number;
    bx: number; by: number; bw: number;
    idA: string; idB: string;
  };
  const marriagePairs: MPair[] = [];
  const marriedIdSet = new Set<string>();
  const pushCouple = (
    a: { id: string; x: number; top: number; w: number },
    b: { id: string; x: number; top: number; w: number }
  ) => {
    if (a.id === b.id) return;
    const key = [a.id, b.id].sort().join("|");
    if ((pushCouple as any)._seen?.has(key)) return;
    if (!(pushCouple as any)._seen) (pushCouple as any)._seen = new Set();
    (pushCouple as any)._seen.add(key);
    marriagePairs.push({
      ax: a.x, ay: a.top, aw: a.w,
      bx: b.x, by: b.top, bw: b.w,
      idA: a.id, idB: b.id,
    });
    marriedIdSet.add(a.id);
    marriedIdSet.add(b.id);
  };

  if (tree) {
    const so = tree.spouses_of || {};
    // centre ↔ spouses (explicit)
    spouses.forEach((s) => {
      const sp = posById.get(s.id);
      const c = posById.get(tree.centre.id);
      if (sp && c) pushCouple({ id: tree.centre.id, ...c }, { id: s.id, ...sp });
    });
    // every spouses_of entry (any generation)
    for (const [ownerId, list] of Object.entries(so)) {
      const op = posById.get(ownerId);
      if (!op) continue;
      for (const s of list) {
        const sp = posById.get(s.id);
        if (!sp) continue;
        pushCouple({ id: ownerId, ...op }, { id: s.id, ...sp });
      }
    }
    // Father + Mother of same child = vivah (even without spouse link in store)
    const pairParents = (nodes: Node[]) => {
      const f = nodes.find((n) => n.relation === "father");
      const m = nodes.find((n) => n.relation === "mother");
      if (!f || !m) return;
      const fp = posById.get(f.id);
      const mp = posById.get(m.id);
      if (fp && mp) pushCouple({ id: f.id, ...fp }, { id: m.id, ...mp });
    };
    pairParents(parents);
    // each ancestor level: group by via, pair father+mother
    levelsUp.forEach((lvl) => {
      const byVia = new Map<string, Node[]>();
      lvl.forEach((n) => {
        const k = n.via_id || n.via_parent_id || "_";
        if (!byVia.has(k)) byVia.set(k, []);
        byVia.get(k)!.push(n);
      });
      byVia.forEach((list) => pairParents(list));
    });
  }

  const line = "#E8A317";
  const marryLine = "#6EE7B7"; // very light green

  const Tag = ({
    n,
    extra,
    gen = "up1",
  }: {
    n: Node;
    extra?: string;
    gen?: keyof typeof GEN_STYLE;
  }) => {
    const st = GEN_STYLE[gen] || GEN_STYLE.up1;
    const isMarried = marriedIdSet.has(n.id);
    const rel = extra || lbl(lang, n.relation, n.gender);
    const born = formatBirth(n);
    return (
      <button type="button" onClick={() => setSelected(n)} className="text-center">
        <span
          className="inline-flex flex-col items-center px-2.5 py-1 rounded-lg text-[12px] font-semibold leading-tight border whitespace-nowrap backdrop-blur-[3px]"
          style={{
            background: st.bg,
            color: st.text,
            borderColor: isMarried ? "rgba(52,211,153,0.9)" : st.border,
            borderStyle: isMarried ? "dashed" : "solid",
            borderWidth: isMarried ? 2 : 1,
            boxShadow: isMarried
              ? `${BUBBLE_3D}, 0 0 0 1px rgba(110,231,183,0.25)`
              : BUBBLE_3D,
          }}
        >
          <span style={{ textShadow: NAMEPLATE }}>{n.display_name}</span>
          <span className="text-[9px] font-medium opacity-80 mt-0.5" style={{ textShadow: NAMEPLATE }}>
            {rel}
            {born ? ` · ${born}` : ""}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col min-h-[70vh] bg-[#fafafa] relative">
      <style>{`
        @keyframes goldTravel {
          to { stroke-dashoffset: -48; }
        }
        .vansh-gold-line {
          stroke-dasharray: 10 8;
          animation: goldTravel 1.8s linear infinite;
        }
      `}</style>
      {/* SA edit toggle — left corner */}
      {isSA && !isOwner && (
        <button
          type="button"
          onClick={() => setSaEditMode((v) => !v)}
          className={`absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold shadow border ${
            saEditMode
              ? "bg-amber-400 text-white border-amber-500"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          <Pencil size={12} />
          {saEditMode ? "Edit ON" : "Edit"}
        </button>
      )}

      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800 pl-14 sm:pl-0">
          {lang === "hi" ? "वंशावली" : "Vanshawali"}
        </p>
        <p className="text-[10px] text-gray-400">
          {canEdit ? "Edit mode" : "View only"}
        </p>
      </div>

      {loading && <p className="text-center text-gray-400 py-20">Loading…</p>}

      {!loading && tree && (
        <div ref={wrapRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-36 w-full">
          <div className="relative mx-auto" style={{ width: W, height: H }}>
                        <svg className="absolute inset-0 pointer-events-none" width={W} height={H}>
              {/* EXTRA marriage bonds — light green, couples only */}
              {marriagePairs.map((mp, i) => {
                const left =
                  mp.ax <= mp.bx
                    ? { x: mp.ax, y: mp.ay, w: mp.aw }
                    : { x: mp.bx, y: mp.by, w: mp.bw };
                const right =
                  mp.ax <= mp.bx
                    ? { x: mp.bx, y: mp.by, w: mp.bw }
                    : { x: mp.ax, y: mp.ay, w: mp.aw };
                const y1 = left.y + BUBBLE_H / 2;
                const y2 = right.y + BUBBLE_H / 2;
                const x1 = left.x + left.w / 2 - IN;
                const x2 = right.x - right.w / 2 + IN;
                const midX = (x1 + x2) / 2;
                const arch = Math.min(18, Math.abs(x2 - x1) * 0.12 + 8);
                const d = `M${x1} ${y1} C${midX} ${y1 - arch}, ${midX} ${y2 - arch}, ${x2} ${y2}`;
                return (
                  <path
                    key={`marry-${i}`}
                    d={d}
                    fill="none"
                    stroke={marryLine}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeDasharray="6 5"
                    opacity={0.9}
                  />
                );
              })}
              {/* Blood / parent–child — auto for all levels */}
              {linesBlood.map((ln) => (
                <path
                  key={ln.key}
                  d={curve(ln.x1, ln.y1, ln.x2, ln.y2)}
                  fill="none"
                  stroke={line}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  className="vansh-gold-line"
                />
              ))}
            </svg>

            {/* All relative bubbles (auto levels) */}
            {placed.map((pl) => (
              <div
                key={pl.n.id}
                className="absolute z-10 -translate-x-1/2"
                style={{ left: pl.x, top: pl.top }}
              >
                <Tag n={pl.n} gen={pl.genKey} />
              </div>
            ))}

            {/* Centre */}
            <div
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: centreX, top: yMid }}
            >
              <button type="button" onClick={() => setSelected(tree.centre)} className="text-center">
                <span
                  className="inline-flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[13px] font-bold whitespace-nowrap backdrop-blur-[2px] border"
                  style={{
                    background: GEN_STYLE.self.bg,
                    color: GEN_STYLE.self.text,
                    borderColor: marriedIdSet.has(tree.centre.id)
                      ? "rgba(52,211,153,0.9)"
                      : GEN_STYLE.self.border,
                    borderStyle: marriedIdSet.has(tree.centre.id) ? "dashed" : "solid",
                    borderWidth: marriedIdSet.has(tree.centre.id) ? 2 : 1,
                    boxShadow: BUBBLE_3D,
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {tree.centre.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tree.centre.photo_url}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover shrink-0"
                      />
                    ) : null}
                    <span style={{ textShadow: NAMEPLATE }}>{tree.centre.display_name}</span>
                  </span>
                  <span
                    className="text-[9px] font-medium opacity-80"
                    style={{ textShadow: NAMEPLATE }}
                  >
                    {L.self}
                    {formatBirth(tree.centre) ? ` · ${formatBirth(tree.centre)}` : ""}
                  </span>
                </span>
              </button>
            </div>

            {/* Spouses */}
            {spouses.map((n, i) => (
              <div
                key={n.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: spousePositions[i]?.x ?? centreX, top: yMid }}
              >
                <Tag n={n} extra={L.spouse} gen="spouse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD sheet with search */}
      {draft && canEdit && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center"
          onClick={() => setDraft(null)}
        >
          <div
            className="w-full max-w-sm mx-3 mb-6 bg-white rounded-3xl p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <p className="font-bold text-gray-900">
                {lang === "hi" ? "रिश्तेदार जोड़ें" : "Add relative"}
              </p>
              <button type="button" onClick={() => setDraft(null)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">
                {lang === "hi" ? "रिश्ता (Relationship)" : "Relationship"}
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-amber-400"
                value={draft.relation}
                onChange={(e) => setDraft({ ...draft, relation: e.target.value })}
              >
                <option value="father">{L.father}</option>
                <option value="mother">{L.mother}</option>
                <option value="spouse">{L.spouse}</option>
                <option value="child">{L.child}</option>
              </select>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 outline-none focus:border-amber-400"
                placeholder={lang === "hi" ? "Member search (app)…" : "Search registered member…"}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setDraft({ ...draft, member_user_id: null });
                }}
              />
            </div>
            {searching && <p className="text-[10px] text-gray-400">Searching…</p>}
            {hits.length > 0 && (
              <ul className="max-h-36 overflow-y-auto rounded-xl border border-gray-100 divide-y">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex items-center gap-2 ${
                        draft.member_user_id === h.id ? "bg-amber-50" : ""
                      }`}
                      onClick={() => {
                        setDraft({
                          ...draft,
                          member_user_id: h.id,
                          name: h.full_name,
                        });
                        setQ(h.full_name);
                        setHits([]);
                      }}
                    >
                      <span className="font-medium truncate">{h.full_name}</span>
                      {h.native_village && (
                        <span className="text-[10px] text-gray-400 truncate">{h.native_village}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!draft.member_user_id && (
              <>
                <p className="text-[10px] text-gray-400">
                  {lang === "hi"
                    ? "App mein nahi? Neeche name / age bharo"
                    : "Not registered? Fill name & year below"}
                </p>
                <input
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  placeholder={lang === "hi" ? "नाम" : "Name"}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value, member_user_id: null })}
                />
                <label className="text-[11px] text-gray-500">Date of birth</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  value={draft.birth_date || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft({
                      ...draft,
                      birth_date: v,
                      birth_year: v ? v.slice(0, 4) : draft.birth_year,
                    });
                  }}
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  placeholder="Or birth year only"
                  inputMode="numeric"
                  value={draft.birth_date ? "" : draft.birth_year}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      birth_year: e.target.value.replace(/\D/g, "").slice(0, 4),
                      birth_date: "",
                    })
                  }
                />
              </>
            )}

            {draft.member_user_id && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5">
                ✓ Linked member — profile fetch / clickable tag
              </p>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={saveAdd}
              className="w-full py-3 rounded-2xl bg-amber-400 text-white text-sm font-bold"
            >
              {saving ? "…" : lang === "hi" ? "जोड़ें" : "Add"}
            </button>
          </div>
        </div>
      )}


      {editDraft && canEdit && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center"
          onClick={() => setEditDraft(null)}
        >
          <div
            className="w-full max-w-sm mx-3 mb-6 bg-white rounded-3xl p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <p className="font-bold">{lang === "hi" ? "एडिट" : "Edit person"}</p>
              <button type="button" onClick={() => setEditDraft(null)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <input
              className="w-full px-3 py-2.5 rounded-xl border text-sm"
              placeholder="Full name"
              value={editDraft.name}
              onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
            />
            <label className="text-[11px] text-gray-500">Date of birth</label>
            <input
              type="date"
              className="w-full px-3 py-2.5 rounded-xl border text-sm"
              value={editDraft.birth_date}
              onChange={(e) => {
                const v = e.target.value;
                setEditDraft({
                  ...editDraft,
                  birth_date: v,
                  birth_year: v ? v.slice(0, 4) : editDraft.birth_year,
                });
              }}
            />
            <input
              className="w-full px-3 py-2.5 rounded-xl border text-sm"
              placeholder="Or birth year only"
              inputMode="numeric"
              value={editDraft.birth_date ? "" : editDraft.birth_year}
              onChange={(e) =>
                setEditDraft({
                  ...editDraft,
                  birth_year: e.target.value.replace(/\D/g, "").slice(0, 4),
                  birth_date: "",
                })
              }
            />
            <select
              className="w-full px-3 py-2.5 rounded-xl border text-sm"
              value={editDraft.gender}
              onChange={(e) => setEditDraft({ ...editDraft, gender: e.target.value })}
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {editDraft.link_id && (
              <select
                className="w-full px-3 py-2.5 rounded-xl border text-sm"
                value={editDraft.relation}
                onChange={(e) => setEditDraft({ ...editDraft, relation: e.target.value })}
              >
                <option value="father">{L.father}</option>
                <option value="mother">{L.mother}</option>
                <option value="spouse">{L.spouse}</option>
                <option value="child">{L.child}</option>
              </select>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={saveEdit}
              className="w-full py-3 rounded-2xl bg-amber-400 text-white text-sm font-bold"
            >
              {saving ? "…" : lang === "hi" ? "सेव" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Node actions */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/25 flex items-end sm:items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm mx-3 mb-8 bg-white rounded-3xl p-4 shadow-2xl space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-gray-900">{selected.display_name}</p>
            <p className="text-xs text-gray-500 mb-2">
              {lbl(lang, selected.relation, selected.gender)}
              {formatBirth(selected) ? ` · ${formatBirth(selected)}` : ""}
              {selected.user_id ? " · Registered" : " · Manual"}
            </p>
            {selected.user_id && (
              <>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-gray-50"
                  onClick={() => {
                    router.push(`/vanshawali?user=${selected.user_id}`);
                    setSelected(null);
                  }}
                >
                  <Focus size={16} className="text-amber-500" /> Open their tree
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-gray-50"
                  onClick={() => {
                    router.push(`/member/${selected.user_id}`);
                    setSelected(null);
                  }}
                >
                  <User size={16} className="text-amber-500" /> Profile / info
                </button>
              </>
            )}
            {canEdit && (selected.id === tree?.centre.id || selected.relation === "self") && (
              <>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-amber-50"
                  onClick={() => {
                    openAdd("father");
                    setSelected(null);
                  }}
                >
                  <Plus size={16} className="text-amber-500" /> {L.father}
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-amber-50"
                  onClick={() => {
                    openAdd("mother");
                    setSelected(null);
                  }}
                >
                  <Plus size={16} className="text-amber-500" /> {L.mother}
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-amber-50"
                  onClick={() => {
                    openAdd("spouse");
                    setSelected(null);
                  }}
                >
                  <Plus size={16} className="text-amber-500" /> {L.spouse}
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-amber-50"
                  onClick={() => {
                    openAdd("child");
                    setSelected(null);
                  }}
                >
                  <Plus size={16} className="text-amber-500" /> {L.child}
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-amber-50"
                  onClick={() => {
                    // Sibling = another child of same parent
                    const father = (tree?.parents || []).find((x) => x.relation === "father");
                    const mother = (tree?.parents || []).find((x) => x.relation === "mother");
                    const parentId = father?.id || mother?.id;
                    if (!parentId) {
                      toast(
                        lang === "hi"
                          ? "पहले पिता/माता जोड़ें, फिर भाई-बहन"
                          : "Add father/mother first, then sibling",
                        "error"
                      );
                      return;
                    }
                    openAdd("child", parentId);
                    setSelected(null);
                  }}
                >
                  <Plus size={16} className="text-amber-500" />{" "}
                  {lang === "hi" ? "भाई / बहन" : "Brother / Sister"}
                </button>
              </>
            )}
            {canEdit &&
              !(selected.id === tree?.centre.id || selected.relation === "self") && (
                <>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-amber-50"
                    onClick={() => {
                      openAdd("spouse", selected.id);
                      setSelected(null);
                    }}
                  >
                    <Plus size={16} className="text-amber-500" /> {L.spouse}
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-amber-50"
                    onClick={() => {
                      const isAncestor =
                        selected.relation === "father" ||
                        selected.relation === "mother" ||
                        selected.relation === "grandfather" ||
                        selected.relation === "grandmother";
                      openAdd(isAncestor ? "father" : "child", selected.id);
                      setSelected(null);
                    }}
                  >
                    <Plus size={16} className="text-amber-500" />{" "}
                    {lang === "hi" ? "रिश्तेदार जोड़ें" : "Add relative"}
                  </button>
                </>
              )}
            {canEdit && selected.relation !== "self" && (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-amber-50"
                onClick={() => {
                  setEditDraft({
                    person_id: selected.id,
                    link_id: selected.link_id,
                    name: selected.display_name,
                    birth_year: selected.birth_year ? String(selected.birth_year) : "",
                    birth_date: selected.birth_date || "",
                    gender: selected.gender || "",
                    relation: selected.relation || "child",
                  });
                  setSelected(null);
                }}
              >
                <Pencil size={16} className="text-amber-500" />{" "}
                {lang === "hi" ? "एडिट" : "Edit"}
              </button>
            )}
            {canEdit && selected.relation !== "self" && selected.link_id && (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50"
                onClick={() => removeLink(selected)}
              >
                <Trash2 size={16} /> Remove
              </button>
            )}
            <button type="button" className="w-full py-2 text-sm text-gray-400" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VanshawaliPage() {
  return (
    <FeatureGate moduleKey="vanshawali">
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
        <VanshawaliInner />
      </Suspense>
    </FeatureGate>
  );
}
