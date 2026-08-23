"use client";
/**
 * Vertical 2-way mind-map canvas (Samsung Notes style):
 * branches UP (parents) + DOWN (children), curved gold lines, inline + add.
 */
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Plus, Trash2, X, Focus, User } from "lucide-react";

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
};

type Tree = {
  centre: Node;
  parents: Node[];
  spouses: Node[];
  children: Node[];
};

const REL: Record<string, Record<string, string>> = {
  en: { self: "Self", father: "Father", mother: "Mother", spouse: "Spouse", child: "Child", son: "Son", daughter: "Daughter" },
  hi: { self: "स्वयं", father: "पिता", mother: "माता", spouse: "जीवनसाथी", child: "संतान", son: "पुत्र", daughter: "पुत्री" },
  mr: { self: "स्वतः", father: "वडील", mother: "आई", spouse: "जोडीदार", child: "मूल", son: "मुलगा", daughter: "मुलगी" },
};

function lbl(lang: string, key: string, gender?: string | null) {
  const L = REL[lang] || REL.en;
  if (key === "child") {
    if (gender === "female" || gender === "F") return L.daughter;
    if (gender === "male" || gender === "M") return L.son;
  }
  return L[key] || key;
}

/** Curved connector path between two points (Notes-style) */
function curve(x1: number, y1: number, x2: number, y2: number) {
  const my = (y1 + y2) / 2;
  return `M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

function VanshawaliInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { lang } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const rootId = search.get("user") || user?.id || "";

  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [selected, setSelected] = useState<Node | null>(null);
  const [draft, setDraft] = useState<{ relation: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const L = useMemo(() => REL[lang] || REL.en, [lang]);

  const load = useCallback(() => {
    if (!rootId) return;
    setLoading(true);
    fetch(`/api/vanshawali?userId=${rootId}`)
      .then((r) => r.json())
      .then((d) => {
        setTree(d.tree || null);
        setCanEdit(!!d.can_edit);
      })
      .catch(() => toast("Load failed", "error"))
      .finally(() => setLoading(false));
  }, [rootId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const saveAdd = async () => {
    if (!draft?.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          centre_user_id: rootId,
          relation: draft.relation,
          display_name: draft.name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        return;
      }
      setDraft(null);
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

  // --- Layout geometry (viewBox) ---
  const W = 360;
  const parents = tree?.parents || [];
  const spouses = tree?.spouses || [];
  const children = tree?.children || [];
  const nUp = Math.max(parents.length + (canEdit ? 1 : 0), 1);
  const nDown = Math.max(children.length + (canEdit ? 1 : 0), 1);
  const upH = 100;
  const midY = upH + 50;
  const downStart = midY + 56;
  const downH = 110;
  const H = downStart + downH + 40;
  const cx = W / 2;
  const cy = midY;

  const upXs = (count: number) => {
    if (count <= 1) return [cx];
    const span = Math.min(280, 60 * (count - 1));
    const start = cx - span / 2;
    return Array.from({ length: count }, (_, i) => start + (i * span) / (count - 1));
  };
  const downXs = upXs;

  const parentSlots = upXs(Math.max(parents.length, canEdit ? parents.length + 1 : parents.length || 1));
  const childSlots = downXs(Math.max(children.length, canEdit ? children.length + 1 : children.length || 1));

  const line = "#E8A317";
  const lineW = 2.5;

  return (
    <div className="flex flex-col min-h-[70vh] bg-[#fafafa]">
      {/* Minimal canvas chrome */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">
          {lang === "hi" || lang === "mr" ? "वंशावली" : "Vanshawali"}
        </p>
        <p className="text-[10px] text-gray-400">
          ↑ parents · ↓ children · tap node · + add
        </p>
      </div>

      {loading && <p className="text-center text-gray-400 py-20">Loading…</p>}

      {!loading && tree && (
        <div className="flex-1 overflow-auto px-1 pb-28">
          {/* CANVAS */}
          <div className="relative mx-auto" style={{ width: "100%", maxWidth: 400, minHeight: H }}>
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* UP branches — parents */}
              {parents.map((_, i) => {
                const x = parentSlots[i] ?? cx;
                const y = 36;
                return (
                  <path
                    key={`up-l-${i}`}
                    d={curve(cx, cy - 22, x, y + 18)}
                    fill="none"
                    stroke={line}
                    strokeWidth={lineW}
                    strokeLinecap="round"
                  />
                );
              })}
              {/* UP add slot line */}
              {canEdit && (
                <path
                  d={curve(
                    cx,
                    cy - 22,
                    parentSlots[parents.length] ?? cx + 40,
                    36 + 18
                  )}
                  fill="none"
                  stroke={line}
                  strokeWidth={lineW}
                  strokeLinecap="round"
                  strokeDasharray="4 4"
                  opacity={0.55}
                />
              )}

              {/* SIDE spouse */}
              {spouses.map((_, i) => {
                const x = cx + 110 + i * 20;
                return (
                  <path
                    key={`sp-${i}`}
                    d={`M${cx + 28} ${cy} C${cx + 55} ${cy - 8}, ${x - 30} ${cy + 8}, ${x - 20} ${cy}`}
                    fill="none"
                    stroke={line}
                    strokeWidth={lineW}
                    strokeLinecap="round"
                  />
                );
              })}
              {canEdit && spouses.length < 2 && (
                <path
                  d={`M${cx + 28} ${cy} C${cx + 60} ${cy - 6}, ${cx + 90} ${cy + 6}, ${cx + 105} ${cy}`}
                  fill="none"
                  stroke={line}
                  strokeWidth={lineW}
                  strokeDasharray="4 4"
                  opacity={0.55}
                />
              )}

              {/* DOWN branches — children */}
              {children.map((_, i) => {
                const x = childSlots[i] ?? cx;
                const y = downStart + 50;
                return (
                  <path
                    key={`dn-l-${i}`}
                    d={curve(cx, cy + 22, x, y - 8)}
                    fill="none"
                    stroke={line}
                    strokeWidth={lineW}
                    strokeLinecap="round"
                  />
                );
              })}
              {canEdit && (
                <path
                  d={curve(
                    cx,
                    cy + 22,
                    childSlots[children.length] ?? cx,
                    downStart + 50 - 8
                  )}
                  fill="none"
                  stroke={line}
                  strokeWidth={lineW}
                  strokeDasharray="4 4"
                  opacity={0.55}
                />
              )}
            </svg>

            {/* --- Nodes overlaid --- */}
            {/* Parents UP */}
            {parents.map((n, i) => {
              const x = parentSlots[i] ?? cx;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelected(n)}
                  className="absolute z-10 -translate-x-1/2 text-center"
                  style={{ left: `${(x / W) * 100}%`, top: 8 }}
                >
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-white border border-amber-200/80 shadow-sm text-[12px] font-semibold text-gray-800 max-w-[100px] truncate">
                    {n.display_name}
                  </span>
                  <span className="block text-[9px] text-amber-700/80 mt-0.5">
                    {lbl(lang, n.relation, n.gender)}
                    {n.age != null ? ` · ${n.age}` : ""}
                  </span>
                </button>
              );
            })}
            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    relation: parents.some((p) => p.relation === "father") ? "mother" : "father",
                    name: "",
                  })
                }
                className="absolute z-10 -translate-x-1/2 flex items-center gap-0.5"
                style={{
                  left: `${((parentSlots[parents.length] ?? cx + 50) / W) * 100}%`,
                  top: 14,
                }}
              >
                <span className="text-[11px] text-gray-400 bg-amber-50 px-2 py-0.5 rounded border border-dashed border-amber-300">
                  {L.father}/{L.mother}
                </span>
                <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center shadow">
                  <Plus size={12} strokeWidth={3} />
                </span>
              </button>
            )}

            {/* Centre */}
            <button
              type="button"
              onClick={() => setSelected(tree.centre)}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: "50%", top: `${(cy / H) * 100}%` }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-white text-[13px] font-bold shadow-md shadow-amber-200 max-w-[140px]">
                {tree.centre.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tree.centre.photo_url}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover border border-white/50"
                  />
                ) : null}
                <span className="truncate">{tree.centre.display_name}</span>
              </span>
              <span className="block text-center text-[9px] text-emerald-600 font-medium mt-0.5">
                {L.self}
                {tree.centre.age != null ? ` · ${tree.centre.age}` : ""}
              </span>
            </button>

            {/* Spouse side */}
            {spouses.map((n, i) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelected(n)}
                className="absolute z-10 -translate-y-1/2 text-left"
                style={{ left: `${((cx + 100 + i * 10) / W) * 100}%`, top: `${(cy / H) * 100}%` }}
              >
                <span className="inline-block px-2.5 py-1 rounded-lg bg-white border border-amber-200/80 shadow-sm text-[12px] font-semibold text-gray-800 max-w-[90px] truncate">
                  {n.display_name}
                </span>
                <span className="block text-[9px] text-amber-700/80">{lbl(lang, "spouse")}</span>
              </button>
            ))}
            {canEdit && spouses.length < 2 && (
              <button
                type="button"
                onClick={() => setDraft({ relation: "spouse", name: "" })}
                className="absolute z-10 -translate-y-1/2 flex items-center gap-0.5"
                style={{ left: `${((cx + 100) / W) * 100}%`, top: `${(cy / H) * 100}%` }}
              >
                <span className="text-[11px] text-gray-400 bg-amber-50 px-2 py-0.5 rounded border border-dashed border-amber-300">
                  {L.spouse}
                </span>
                <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center">
                  <Plus size={12} strokeWidth={3} />
                </span>
              </button>
            )}

            {/* Children DOWN */}
            {children.map((n, i) => {
              const x = childSlots[i] ?? cx;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelected(n)}
                  className="absolute z-10 -translate-x-1/2 text-center"
                  style={{ left: `${(x / W) * 100}%`, top: downStart + 28 }}
                >
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-white border border-amber-200/80 shadow-sm text-[12px] font-semibold text-gray-800 max-w-[100px] truncate">
                    {n.display_name}
                  </span>
                  <span className="block text-[9px] text-amber-700/80 mt-0.5">
                    {lbl(lang, n.relation, n.gender)}
                    {n.age != null ? ` · ${n.age}` : ""}
                  </span>
                </button>
              );
            })}
            {canEdit && (
              <button
                type="button"
                onClick={() => setDraft({ relation: "child", name: "" })}
                className="absolute z-10 -translate-x-1/2 flex flex-col items-center gap-0.5"
                style={{
                  left: `${((childSlots[children.length] ?? cx) / W) * 100}%`,
                  top: downStart + 32,
                }}
              >
                <span className="flex items-center gap-0.5">
                  <span className="text-[11px] text-gray-400 bg-amber-50 px-2 py-0.5 rounded border border-dashed border-amber-300">
                    {L.child}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center shadow">
                    <Plus size={12} strokeWidth={3} />
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inline draft (Notes-style enter text) */}
      {draft && (
        <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
          <div className="max-w-sm mx-auto flex items-center gap-2 bg-white rounded-2xl shadow-xl border border-amber-200 p-2">
            <input
              autoFocus
              className="flex-1 text-sm px-3 py-2 outline-none bg-amber-50/50 rounded-xl"
              placeholder={lang === "hi" ? "नाम लिखें…" : "Enter name…"}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && saveAdd()}
            />
            <button
              type="button"
              disabled={saving}
              onClick={saveAdd}
              className="w-9 h-9 rounded-full bg-amber-400 text-white flex items-center justify-center shrink-0"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
            <button type="button" onClick={() => setDraft(null)} className="p-2 text-gray-400">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Node menu */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/25 flex items-end sm:items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm mx-3 mb-8 bg-white rounded-3xl p-4 shadow-2xl space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-gray-900 px-1 mb-2">{selected.display_name}</p>
            <p className="text-xs text-gray-500 px-1 mb-2">
              {lbl(lang, selected.relation, selected.gender)}
              {selected.age != null ? ` · ${selected.age} yrs` : ""}
            </p>
            {selected.user_id && selected.relation !== "self" && (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-gray-50"
                onClick={() => {
                  router.push(`/vanshawali?user=${selected.user_id}`);
                  setSelected(null);
                }}
              >
                <Focus size={16} className="text-amber-500" /> Branch (their map)
              </button>
            )}
            {selected.user_id && (
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
