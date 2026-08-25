"use client";
/**
 * VANSHAWALI — LOCKED CORE (do not replace mechanism)
 * Mind-map system stays: centre · parents up · children down · spouse side ·
 * curves · add/remove/search · owner/SA edit.
 * Only allowed changes: placement polish, colours, options UI.
 * Rules: no bubble off left/right; vertical scroll OK; full names;
 * LINES LOCKED: path MUST touch target bubble 100% — zero gap.
 *   up-target  → bottom-left (male) / bottom-right (female) corner
 *   down-target → top-left (male) / top-right (female) corner
 *   fallback corners if side unclear.
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
  age?: number | null;
  photo_url?: string | null;
  relation: string;
  status?: string;
  link_id?: string;
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
    child: "संतान",
    son: "पुत्र",
    daughter: "पुत्री",
    grandfather: "दादा/नाना",
    grandmother: "दादी/नानी",
    grandchild: "पोता/पोती",
  },
};

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

const BUBBLE_H = 28; // visual bubble height (px) — line docks here, zero gap

/**
 * Dock point ON the bubble surface (100% touch, no gap).
 * dir "up"   = line arrives from below → use TOP corners
 * dir "down" = line arrives from above → use BOTTOM corners
 * male → left corner, female → right corner, unknown → centre of that edge
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
  const inset = 6; // into the corner so stroke sits on rounded rect
  let x = cx;
  if (sex === "M") x = cx - w / 2 + inset;
  else if (sex === "F") x = cx + w / 2 - inset;
  const y = dir === "up" ? topY : topY + BUBBLE_H;
  return { x, y };
}

/** Start of line from centre of a bubble edge */
function undock(cx: number, topY: number, dir: "up" | "down"): { x: number; y: number } {
  return { x: cx, y: dir === "up" ? topY : topY + BUBBLE_H };
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
    member_user_id: string | null;
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
      member_user_id: null,
    });
    setQ("");
    setHits([]);
  };

  // Layout — LOCKED mind-map; smart multi-row, no overlap, full names
  const parents = tree?.parents || [];
  const spouses = tree?.spouses || [];
  const children = tree?.children || [];
  const grandparents = tree?.grandparents || [];
  const grandchildren = tree?.grandchildren || [];

  const W = vw;
  const pad = 10;
  const gap = 10;
  const cx = W / 2;
  const midGate = W / 2; // hard split L/R — father left, mother right
  const subRowH = 48;

  const parentsSorted = [...parents].sort((a, b) => {
    const ra = a.relation === "father" ? 0 : a.relation === "mother" ? 1 : 2;
    const rb = b.relation === "father" ? 0 : b.relation === "mother" ? 1 : 2;
    return ra - rb;
  });

  // Parents: father left half, mother right half (aligned under GP sides)
  const parXs: number[] = [];
  const parRows: number[] = [];
  parentsSorted.forEach((p) => {
    const w = nameW(p.display_name);
    if (p.relation === "father") {
      const pack = packSmart([w], W, pad, gap, (pad + midGate) / 2, pad, midGate);
      parXs.push(pack[0].x);
      parRows.push(0);
    } else if (p.relation === "mother") {
      const pack = packSmart([w], W, pad, gap, (midGate + W - pad) / 2, midGate, W - pad);
      parXs.push(pack[0].x);
      parRows.push(0);
    } else {
      const pack = packSmart([w], W, pad, gap, cx);
      parXs.push(pack[0].x);
      parRows.push(0);
    }
  });
  const parAdd = canEdit
    ? { x: clampX(cx, 48, W, pad), row: 0 }
    : { x: cx, row: 0 };
  const parentXById = new Map(parentsSorted.map((p, i) => [p.id, parXs[i]]));
  const parentWById = new Map(parentsSorted.map((p) => [p.id, nameW(p.display_name)]));
  const parentRowById = new Map(parentsSorted.map((p, i) => [p.id, parRows[i]]));
  const parMaxRow = 0;

  // Grandparents STRICT: father-side ONLY left half, mother-side ONLY right half
  // Never share one full-width row (prevents cross-overlap)
  type GpPos = { n: Node; x: number; row: number; tilt: number };
  const gpPositions: GpPos[] = [];
  const midX = W / 2;
  const gutter = 14;
  if (grandparents.length) {
    const fatherId = parentsSorted.find((p) => p.relation === "father")?.id;
    const motherId = parentsSorted.find((p) => p.relation === "mother")?.id;

    const fatherSide: Node[] = [];
    const motherSide: Node[] = [];
    grandparents.forEach((g) => {
      if (fatherId && g.via_parent_id === fatherId) fatherSide.push(g);
      else if (motherId && g.via_parent_id === motherId) motherSide.push(g);
      else if (fatherSide.length <= motherSide.length) fatherSide.push(g);
      else motherSide.push(g);
    });

    const placeSide = (list: Node[], side: "L" | "R") => {
      if (!list.length) return;
      const sorted = [...list].sort((a, b) => {
        const ra = a.relation === "father" ? 0 : 1;
        const rb = b.relation === "father" ? 0 : 1;
        return ra - rb;
      });
      const gutter = 12;
      const lo = side === "L" ? pad : midGate + gutter;
      const hi = side === "L" ? midGate - gutter : W - pad;
      const prefer = side === "L" ? (lo + hi) / 2 - 8 : (lo + hi) / 2 + 8;
      const widths = sorted.map((n) => nameW(n.display_name));
      const pack = packSmart(widths, W, pad, gap, prefer, lo, hi);
      sorted.forEach((n, i) => {
        gpPositions.push({
          n,
          x: pack[i].x,
          row: pack[i].row,
          tilt: mildTilt(i, sorted.length) + (side === "L" ? -3 : 3),
        });
      });
    };

    placeSide(fatherSide, "L");
    placeSide(motherSide, "R");
  }
  const gpMaxRow = gpPositions.length
    ? Math.max(...gpPositions.map((g) => g.row))
    : -1;

  // Self = vertical visual centre: more top room for ancestors, balanced bottom
  const yGpBase = gpPositions.length ? 20 : -80;
  const gpBlockH = gpPositions.length ? (gpMaxRow + 1) * subRowH + 16 : 0;
  const yPar = gpPositions.length ? yGpBase + gpBlockH + 20 : 28;
  // Push self lower so it sits near vertical mid of the tree block
  const yMid = yPar + parMaxRow * subRowH + 120;
  const yChild = yMid + 110;

  const chWidths = children.map((c) => nameW(c.display_name));
  if (canEdit) chWidths.push(48);
  const chPack = packSmart(chWidths, W, pad, gap, cx);
  const chXs = children.map((_, i) => chPack[i].x);
  const chRows = children.map((_, i) => chPack[i].row);
  const chAdd = canEdit ? chPack[children.length] : { x: cx, row: 0 };
  const childXById = new Map(children.map((c, i) => [c.id, chXs[i]]));
  const childWById = new Map(children.map((c) => [c.id, nameW(c.display_name)]));
  const chMaxRow = Math.max(0, ...chPack.map((p) => p.row));

  type GcPos = { n: Node; x: number; row: number };
  const gcPositions: GcPos[] = [];
  if (grandchildren.length) {
    const widths = grandchildren.map((n) => nameW(n.display_name));
    // pack all GC; prefer under their parents' mean
    const prefer =
      grandchildren
        .map((g) => childXById.get(g.via_child_id || "") ?? cx)
        .reduce((s, x, _, a) => s + x / a.length, 0) || cx;
    const pack = packSmart(widths, W, pad, gap, prefer);
    grandchildren.forEach((n, i) => {
      gcPositions.push({ n, x: pack[i].x, row: pack[i].row });
    });
  }
  const gcMaxRow = gcPositions.length
    ? Math.max(...gcPositions.map((g) => g.row))
    : -1;

  const yGcBase = gcPositions.length ? yChild + chMaxRow * subRowH + 88 : -80;
  const H =
    (gcPositions.length ? yGcBase + (gcMaxRow + 1) * subRowH : yChild + chMaxRow * subRowH) +
    80;

  const centreW = nameW(tree?.centre.display_name || "Self", 170);
  const spouseW0 = spouses[0] ? nameW(spouses[0].display_name) : 0;
  const centreX = clampX(
    spouses.length ? cx - (spouseW0 + 16) / 2 : cx,
    centreW,
    W,
    pad
  );
  const spousePositions = spouses.map((s, i) => {
    const w = nameW(s.display_name);
    const raw = centreX + centreW / 2 + 14 + w / 2 + i * (w + 10);
    return { x: clampX(raw, w, W, pad), w };
  });

  const line = "#E8A317";

  const Tag = ({
    n,
    extra,
  }: {
    n: Node;
    extra?: string;
  }) => (
    <button type="button" onClick={() => setSelected(n)} className="text-center">
      <span
        className={`inline-block px-2.5 py-1.5 rounded-lg shadow-sm text-[12px] font-semibold leading-snug border whitespace-nowrap ${
          n.user_id
            ? "bg-amber-400/40 text-amber-950 border-amber-500/35"
            : "bg-white/35 text-gray-800 border-amber-200/40 backdrop-blur-[4px]"
        }`}
      >
        {n.display_name}
      </span>
      <span className="block text-[9px] text-amber-800/80 mt-0.5 leading-tight whitespace-nowrap">
        {extra || lbl(lang, n.relation, n.gender)}
        {n.age != null ? ` · ${n.age}` : ""}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col min-h-[70vh] bg-[#fafafa] relative">
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
              {gpPositions.map(({ n, x, row }) => {
                const px = parentXById.get(n.via_parent_id || "") ?? centreX;
                const pTop = yPar + (parentRowById.get(n.via_parent_id || "") ?? 0) * subRowH - 4;
                const gTop = yGpBase + row * subRowH - 4;
                const start = undock(px, pTop, "up");
                const end = dock(x, gTop, nameW(n.display_name), "down", n.gender, n.relation);
                return (
                  <path
                    key={`gpl-${n.id}`}
                    d={curve(start.x, start.y, end.x, end.y)}
                    fill="none"
                    stroke={line}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                );
              })}
              {parentsSorted.map((p, i) => {
                const pTop = yPar + parRows[i] * subRowH - 4;
                const cTop = yMid - BUBBLE_H / 2; // centre uses -translate-y-1/2 at yMid
                const start = undock(centreX, cTop, "up");
                const end = dock(
                  parXs[i],
                  pTop,
                  nameW(p.display_name),
                  "down",
                  p.gender,
                  p.relation
                );
                return (
                  <path
                    key={`pl-${p.id}`}
                    d={curve(start.x, start.y, end.x, end.y)}
                    fill="none"
                    stroke={line}
                    strokeWidth={2.3}
                    strokeLinecap="round"
                  />
                );
              })}
{spousePositions.map((sp, i) => (
                <path
                  key={`sl-${i}`}
                  d={`M${centreX + centreW / 2 - 1} ${yMid} L${sp.x - sp.w / 2 + 1} ${yMid}`}
                  fill="none"
                  stroke={line}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
              ))}
              {children.map((c, i) => {
                const cTop = yMid - BUBBLE_H / 2;
                const chTop = yChild + chRows[i] * subRowH - 4;
                const start = undock(centreX, cTop, "down");
                const end = dock(
                  chXs[i],
                  chTop,
                  nameW(c.display_name),
                  "up",
                  c.gender,
                  c.relation
                );
                return (
                  <path
                    key={`cl-${c.id}`}
                    d={curve(start.x, start.y, end.x, end.y)}
                    fill="none"
                    stroke={line}
                    strokeWidth={2.3}
                    strokeLinecap="round"
                  />
                );
              })}
{gcPositions.map(({ n, x, row }) => {
                const via = n.via_child_id || "";
                const px = childXById.get(via) ?? centreX;
                // find child row
                const ci = children.findIndex((c) => c.id === via);
                const chTop =
                  ci >= 0
                    ? yChild + chRows[ci] * subRowH - 4
                    : yChild - 4;
                const gTop = yGcBase + row * subRowH - 4;
                const start = undock(px, chTop, "down");
                const end = dock(
                  x,
                  gTop,
                  nameW(n.display_name),
                  "up",
                  n.gender,
                  n.relation
                );
                return (
                  <path
                    key={`gcl-${n.id}`}
                    d={curve(start.x, start.y, end.x, end.y)}
                    fill="none"
                    stroke={line}
                    strokeWidth={2.1}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {gpPositions.map(({ n, x, row, tilt }) => (
              <div
                key={n.id}
                className="absolute z-10 -translate-x-1/2"
                style={{
                  left: x,
                  top: yGpBase + row * subRowH - 4,
                  transform: `translateX(-50%) rotate(${tilt}deg)`,
                }}
              >
                <Tag
                  n={n}
                  extra={
                    n.relation === "mother"
                      ? L.grandmother || "Grandmother"
                      : L.grandfather || "Grandfather"
                  }
                />
              </div>
            ))}

            {parentsSorted.map((n, i) => (
              <div
                key={n.id}
                className="absolute z-10 -translate-x-1/2"
                style={{ left: parXs[i], top: yPar + parRows[i] * subRowH - 4 }}
              >
                <Tag n={n} />
</div>
            ))}
            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  openAdd(parentsSorted.some((p) => p.relation === "father") ? "mother" : "father")
                }
                className="absolute z-10 -translate-x-1/2"
                style={{ left: parAdd.x, top: yPar + parAdd.row * subRowH + 4 }}
              >
                <span className="text-[10px] border border-dashed border-amber-300 bg-amber-50 px-1.5 py-0.5 rounded">
                  +
                </span>
              </button>
            )}

            <div
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: centreX, top: yMid }}
            >
              <button type="button" onClick={() => setSelected(tree.centre)} className="text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/50 text-amber-950 text-[13px] font-bold shadow-md whitespace-nowrap backdrop-blur-[1px]">
                  {tree.centre.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tree.centre.photo_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                  ) : null}
                  {tree.centre.display_name}
                </span>
                <span className="block text-[9px] text-emerald-600 font-medium mt-0.5">{L.self}</span>
              </button>
            </div>

            {spouses.map((n, i) => (
              <div
                key={n.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: spousePositions[i]?.x ?? centreX, top: yMid }}
              >
                <Tag n={n} extra={L.spouse} />
              </div>
            ))}
{children.map((n, i) => (
              <div
                key={n.id}
                className="absolute z-10 -translate-x-1/2"
                style={{ left: chXs[i], top: yChild + chRows[i] * subRowH - 4 }}
              >
                <Tag n={n} />
</div>
            ))}
{gcPositions.map(({ n, x, row }) => (
              <div
                key={n.id}
                className="absolute z-10 -translate-x-1/2"
                style={{ left: x, top: yGcBase + row * subRowH - 4 }}
              >
                <Tag n={n} extra={L.grandchild || "Grandchild"} />
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
                <input
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  placeholder="Birth year (optional)"
                  inputMode="numeric"
                  value={draft.birth_year}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      birth_year: e.target.value.replace(/\D/g, "").slice(0, 4),
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
              {selected.age != null ? ` · ${selected.age} yrs` : ""}
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
            {canEdit && (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-amber-50"
                onClick={() => {
                  const isSelf = selected.id === tree?.centre.id || selected.relation === "self";
                  if (isSelf) {
                    openAdd("child");
                  } else {
                    // extend from this person: parent if ancestor-ish, else child
                    const rel =
                      selected.relation === "father" ||
                      selected.relation === "mother" ||
                      selected.relation === "grandfather" ||
                      selected.relation === "grandmother"
                        ? "father"
                        : "child";
                    openAdd(rel, selected.id);
                  }
                  setSelected(null);
                }}
              >
                <Plus size={16} className="text-amber-500" />{" "}
                {lang === "hi" ? "Member जोड़ें" : "Add member"}
              </button>
            )}
            {canEdit && selected.relation === "self" && (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-amber-50"
                onClick={() => {
                  openAdd("father");
                  setSelected(null);
                }}
              >
                <Plus size={16} className="text-amber-500" /> {L.father} / {L.mother}
              </button>
            )}
            {canEdit && selected.relation === "self" && (
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
