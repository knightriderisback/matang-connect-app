"use client";
/**
 * Smart auto-layout mind-map: no overlap, full names, adaptive width + scroll.
 */
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
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
  return L[key] || key;
}

/** Estimate tag width in px from name (full text, no truncate) */
function estWidth(name: string) {
  const len = Math.max((name || "?").length, 4);
  // ~7.2px per char + padding; clamp
  return Math.min(200, Math.max(72, Math.round(len * 7.4 + 28)));
}

function estHeight(name: string) {
  const w = estWidth(name);
  const lines = Math.ceil(((name || "").length * 7.4) / Math.max(w - 20, 40));
  return 28 + Math.max(0, lines - 1) * 14 + 16; // tag + relation line
}

/** Pack centers so boxes [x-w/2, x+w/2] never overlap; keep order; center group */
function packCenters(widths: number[], minGap = 12, preferCx?: number): number[] {
  const n = widths.length;
  if (n === 0) return [];
  if (n === 1) return [preferCx ?? 0];

  // sequential left-to-right with gaps
  const xs: number[] = [];
  let cursor = 0;
  for (let i = 0; i < n; i++) {
    const half = widths[i] / 2;
    if (i === 0) {
      xs.push(half);
      cursor = widths[i] + minGap;
    } else {
      const x = cursor + half;
      xs.push(x);
      cursor = x + half + minGap;
    }
  }
  const total = cursor - minGap;
  const shift = (preferCx ?? total / 2) - total / 2;
  return xs.map((x) => x + shift);
}

function curve(x1: number, y1: number, x2: number, y2: number) {
  const my = (y1 + y2) / 2;
  return `M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

function VanshawaliInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rootId = searchParams.get("user") || user?.id || "";

  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiCanEdit, setApiCanEdit] = useState(false);
  const [isSA, setIsSA] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [saEditMode, setSaEditMode] = useState(false);
  const [selected, setSelected] = useState<Node | null>(null);

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

  // ——— Smart layout ———
  const layout = useMemo(() => {
    if (!tree) return null;
    const parents = tree.parents || [];
    const spouses = tree.spouses || [];
    const children = tree.children || [];
    const grandparents = tree.grandparents || [];
    const grandchildren = tree.grandchildren || [];
    const addW = canEdit ? 56 : 0;

    const gpItems = grandparents.map((n) => ({ n, w: estWidth(n.display_name), h: estHeight(n.display_name) }));
    const parItems = [
      ...parents.map((n) => ({ n, w: estWidth(n.display_name), h: estHeight(n.display_name), kind: "node" as const })),
      ...(canEdit ? [{ n: null as Node | null, w: addW, h: 40, kind: "add" as const }] : []),
    ];
    const chItems = [
      ...children.map((n) => ({ n, w: estWidth(n.display_name), h: estHeight(n.display_name) + (canEdit ? 22 : 0), kind: "node" as const })),
      ...(canEdit ? [{ n: null as Node | null, w: addW, h: 40, kind: "add" as const }] : []),
    ];
    const gcItems = grandchildren.map((n) => ({
      n,
      w: estWidth(n.display_name),
      h: estHeight(n.display_name),
    }));

    const centreW = estWidth(tree.centre.display_name) + (tree.centre.photo_url ? 28 : 0);
    const spouseItems = [
      ...spouses.map((n) => ({ n, w: estWidth(n.display_name), h: estHeight(n.display_name) })),
      ...(canEdit && spouses.length < 2 ? [{ n: null as Node | null, w: 72, h: 36 }] : []),
    ];

    // Vertical bands from content height
    const pad = 16;
    let y = pad;
    const yGp = gpItems.length ? y : -999;
    if (gpItems.length) y += Math.max(...gpItems.map((i) => i.h), 40) + 28;
    const yPar = y;
    y += Math.max(...parItems.map((i) => i.h), 40) + 36;
    const yMid = y + 8;
    y += 52;
    const yChild = y;
    y += Math.max(...chItems.map((i) => i.h), 40) + 28;
    const yGc = gcItems.length ? y : -999;
    if (gcItems.length) y += Math.max(...gcItems.map((i) => i.h), 40) + 16;
    const contentH = y + pad;

    // Provisional center X = 0, pack then shift
    const gpXs = packCenters(gpItems.map((i) => i.w), 14, 0);
    const parXs = packCenters(parItems.map((i) => i.w), 14, 0);
    const chXs = packCenters(chItems.map((i) => i.w), 14, 0);
    const gcXs = packCenters(gcItems.map((i) => i.w), 14, 0);

    // Spouse to the right of centre
    let spouseStart = centreW / 2 + 28;
    const spouseXs: number[] = [];
    spouseItems.forEach((s, i) => {
      spouseXs.push(spouseStart + s.w / 2);
      spouseStart += s.w + 14;
    });

    const allX = [
      ...gpXs,
      ...parXs,
      ...chXs,
      ...gcXs,
      0,
      ...spouseXs,
      ...gpItems.map((it, i) => gpXs[i] - it.w / 2),
      ...gpItems.map((it, i) => gpXs[i] + it.w / 2),
      ...parItems.map((it, i) => parXs[i] - it.w / 2),
      ...parItems.map((it, i) => parXs[i] + it.w / 2),
      ...chItems.map((it, i) => chXs[i] - it.w / 2),
      ...chItems.map((it, i) => chXs[i] + it.w / 2),
      ...gcItems.map((it, i) => gcXs[i] - it.w / 2),
      ...gcItems.map((it, i) => gcXs[i] + it.w / 2),
      -centreW / 2,
      centreW / 2,
      ...spouseItems.map((it, i) => spouseXs[i] + it.w / 2),
    ];
    const minX = Math.min(...allX, -80);
    const maxX = Math.max(...allX, 80);
    const margin = 24;
    const W = maxX - minX + margin * 2;
    const shift = -minX + margin;
    const cx = shift; // centre at 0 + shift

    const mapX = (x: number) => x + shift;

    return {
      W,
      H: contentH,
      cx,
      yGp,
      yPar,
      yMid,
      yChild,
      yGc,
      centreW,
      gpItems,
      parItems,
      chItems,
      gcItems,
      spouseItems,
      gpXs: gpXs.map(mapX),
      parXs: parXs.map(mapX),
      chXs: chXs.map(mapX),
      gcXs: gcXs.map(mapX),
      spouseXs: spouseXs.map(mapX),
      parents,
      children,
      grandparents,
      grandchildren,
    };
  }, [tree, canEdit]);

  const line = "#E8A317";

  const TagBtn = ({
    n,
    extra,
    style,
  }: {
    n: Node;
    extra?: string;
    style: React.CSSProperties;
  }) => (
    <button
      type="button"
      onClick={() => setSelected(n)}
      className="absolute z-10 -translate-x-1/2 text-center"
      style={style}
    >
      <span
        className={`inline-block px-2.5 py-1.5 rounded-lg shadow-sm text-[12px] font-semibold leading-snug text-center border break-words whitespace-normal ${
          n.user_id
            ? "bg-amber-400 text-white border-amber-500"
            : "bg-white text-gray-800 border-amber-200"
        }`}
        style={{ maxWidth: estWidth(n.display_name) }}
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

      <div className="px-4 pt-3 pb-1 flex items-center justify-between shrink-0">
        <p className="text-sm font-semibold text-gray-800 pl-14 sm:pl-0">
          {lang === "hi" ? "वंशावली" : "Vanshawali"}
        </p>
        <p className="text-[10px] text-gray-400">
          {canEdit ? "Edit · swipe if wide" : "View only · swipe if wide"}
        </p>
      </div>

      {loading && <p className="text-center text-gray-400 py-20">Loading…</p>}

      {!loading && tree && layout && (
        <div className="flex-1 overflow-auto pb-36">
          <div
            className="relative mx-auto"
            style={{ width: layout.W, height: layout.H, minWidth: "100%" }}
          >
            <svg
              className="absolute inset-0 pointer-events-none"
              width={layout.W}
              height={layout.H}
            >
              {layout.gpItems.map((it, i) => {
                const pi = layout.parents.findIndex((p) => p.id === it.n.via_parent_id);
                const px = pi >= 0 ? layout.parXs[pi] : layout.cx;
                return (
                  <path
                    key={`gpl-${it.n.id}`}
                    d={curve(px, layout.yPar - 4, layout.gpXs[i], layout.yGp + 20)}
                    fill="none"
                    stroke={line}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                );
              })}
              {layout.parItems.map((it, i) => {
                if (it.kind === "add") {
                  return (
                    <path
                      key="par-add-line"
                      d={curve(layout.cx, layout.yMid - 16, layout.parXs[i], layout.yPar + 12)}
                      fill="none"
                      stroke={line}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      opacity={0.45}
                    />
                  );
                }
                return (
                  <path
                    key={`pl-${it.n!.id}`}
                    d={curve(layout.cx, layout.yMid - 16, layout.parXs[i], layout.yPar + 12)}
                    fill="none"
                    stroke={line}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                  />
                );
              })}
              {layout.spouseItems.map((it, i) => (
                <path
                  key={`sl-${i}`}
                  d={`M${layout.cx + layout.centreW / 2} ${layout.yMid} C${layout.cx + layout.centreW / 2 + 20} ${layout.yMid - 8}, ${layout.spouseXs[i] - 20} ${layout.yMid + 8}, ${layout.spouseXs[i] - it.w / 2} ${layout.yMid}`}
                  fill="none"
                  stroke={line}
                  strokeWidth={2.2}
                />
              ))}
              {layout.chItems.map((it, i) => {
                if (it.kind === "add") {
                  return (
                    <path
                      key="ch-add-line"
                      d={curve(layout.cx, layout.yMid + 16, layout.chXs[i], layout.yChild - 4)}
                      fill="none"
                      stroke={line}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      opacity={0.45}
                    />
                  );
                }
                return (
                  <path
                    key={`cl-${it.n!.id}`}
                    d={curve(layout.cx, layout.yMid + 16, layout.chXs[i], layout.yChild - 4)}
                    fill="none"
                    stroke={line}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                  />
                );
              })}
              {layout.gcItems.map((it, i) => {
                const ci = layout.children.findIndex((c) => c.id === it.n.via_child_id);
                const px = ci >= 0 ? layout.chXs[ci] : layout.cx;
                return (
                  <path
                    key={`gcl-${it.n.id}`}
                    d={curve(px, layout.yChild + 24, layout.gcXs[i], layout.yGc - 4)}
                    fill="none"
                    stroke={line}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* GP */}
            {layout.gpItems.map((it, i) => (
              <TagBtn
                key={it.n.id}
                n={it.n}
                extra={
                  it.n.relation === "mother"
                    ? L.grandmother || "Grandmother"
                    : L.grandfather || "Grandfather"
                }
                style={{ left: layout.gpXs[i], top: layout.yGp }}
              />
            ))}

            {/* Parents */}
            {layout.parItems.map((it, i) =>
              it.kind === "add" ? (
                <button
                  key="par-add"
                  type="button"
                  onClick={() =>
                    openAdd(
                      (tree.parents || []).some((p) => p.relation === "father")
                        ? "mother"
                        : "father"
                    )
                  }
                  className="absolute z-10 -translate-x-1/2"
                  style={{ left: layout.parXs[i], top: layout.yPar + 4 }}
                >
                  <span className="inline-flex items-center gap-0.5 text-[11px] border border-dashed border-amber-300 bg-amber-50 px-2 py-1 rounded-lg text-gray-500">
                    <Plus size={12} /> Parent
                  </span>
                </button>
              ) : (
                <div key={it.n!.id}>
                  <TagBtn n={it.n!} style={{ left: layout.parXs[i], top: layout.yPar }} />
                  {canEdit && (
                    <button
                      type="button"
                      className="absolute z-10 w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center -translate-x-1/2"
                      style={{
                        left: layout.parXs[i],
                        top: layout.yPar + it.h - 6,
                      }}
                      title="Grandparent"
                      onClick={() => openAdd("father", it.n!.id)}
                    >
                      <Plus size={10} />
                    </button>
                  )}
                </div>
              )
            )}

            {/* Centre */}
            <button
              type="button"
              onClick={() => setSelected(tree.centre)}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: layout.cx, top: layout.yMid }}
            >
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-white text-[13px] font-bold shadow-md leading-snug text-left"
                style={{ maxWidth: layout.centreW + 8 }}
              >
                {tree.centre.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tree.centre.photo_url}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                ) : null}
                <span className="break-words whitespace-normal">{tree.centre.display_name}</span>
              </span>
              <span className="block text-[9px] text-emerald-600 font-medium mt-0.5">{L.self}</span>
            </button>

            {/* Spouses */}
            {layout.spouseItems.map((it, i) =>
              it.n ? (
                <TagBtn
                  key={it.n.id}
                  n={it.n}
                  extra={L.spouse}
                  style={{ left: layout.spouseXs[i], top: layout.yMid - 18 }}
                />
              ) : (
                <button
                  key="sp-add"
                  type="button"
                  onClick={() => openAdd("spouse")}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: layout.spouseXs[i], top: layout.yMid }}
                >
                  <span className="text-[11px] border border-dashed border-amber-300 bg-amber-50 px-2 py-1 rounded-lg text-gray-500">
                    + {L.spouse}
                  </span>
                </button>
              )
            )}

            {/* Children */}
            {layout.chItems.map((it, i) =>
              it.kind === "add" ? (
                <button
                  key="ch-add"
                  type="button"
                  onClick={() => openAdd("child")}
                  className="absolute z-10 -translate-x-1/2"
                  style={{ left: layout.chXs[i], top: layout.yChild + 4 }}
                >
                  <span className="inline-flex items-center gap-0.5 text-[11px] border border-dashed border-amber-300 bg-amber-50 px-2 py-1 rounded-lg text-gray-500">
                    <Plus size={12} /> {L.child}
                  </span>
                </button>
              ) : (
                <div key={it.n!.id}>
                  <TagBtn n={it.n!} style={{ left: layout.chXs[i], top: layout.yChild }} />
                  {canEdit && (
                    <button
                      type="button"
                      className="absolute z-10 w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center -translate-x-1/2"
                      style={{ left: layout.chXs[i], top: layout.yChild + it.h - 8 }}
                      onClick={() => openAdd("child", it.n!.id)}
                    >
                      <Plus size={10} />
                    </button>
                  )}
                </div>
              )
            )}

            {/* Grandchildren */}
            {layout.gcItems.map((it, i) => (
              <TagBtn
                key={it.n.id}
                n={it.n}
                extra={L.grandchild || "Grandchild"}
                style={{ left: layout.gcXs[i], top: layout.yGc }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ADD sheet */}
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
                {lang === "hi" ? "रिश्ता" : "Relationship"}
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
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
                placeholder={lang === "hi" ? "Member search…" : "Search registered member…"}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setDraft({ ...draft, member_user_id: null });
                }}
              />
            </div>
            {searching && <p className="text-[10px] text-gray-400">Searching…</p>}
            {hits.length > 0 && (
              <ul className="max-h-36 overflow-y-auto rounded-xl border divide-y">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 ${
                        draft.member_user_id === h.id ? "bg-amber-50" : ""
                      }`}
                      onClick={() => {
                        setDraft({ ...draft, member_user_id: h.id, name: h.full_name });
                        setQ(h.full_name);
                        setHits([]);
                      }}
                    >
                      <span className="font-medium">{h.full_name}</span>
                      {h.native_village && (
                        <span className="text-[10px] text-gray-400 ml-2">{h.native_village}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!draft.member_user_id && (
              <>
                <input
                  className="w-full px-3 py-2.5 rounded-xl border text-sm"
                  placeholder={lang === "hi" ? "नाम (full)" : "Full name"}
                  value={draft.name}
                  onChange={(e) =>
                    setDraft({ ...draft, name: e.target.value, member_user_id: null })
                  }
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl border text-sm"
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
                ✓ Linked member
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

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/25 flex items-end sm:items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm mx-3 mb-8 bg-white rounded-3xl p-4 shadow-2xl space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-gray-900 break-words">{selected.display_name}</p>
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
                  <User size={16} className="text-amber-500" /> Profile
                </button>
              </>
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
            <button
              type="button"
              className="w-full py-2 text-sm text-gray-400"
              onClick={() => setSelected(null)}
            >
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
