"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Network, Plus, User } from "lucide-react";

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
};

type Tree = {
  centre: Node;
  parents: Node[];
  spouses: Node[];
  children: Node[];
};

const REL_LABELS: Record<string, Record<string, string>> = {
  en: {
    self: "Self",
    father: "Father",
    mother: "Mother",
    spouse: "Spouse",
    child: "Child",
    son: "Son",
    daughter: "Daughter",
  },
  hi: {
    self: "स्वयं",
    father: "पिता",
    mother: "माता",
    spouse: "जीवनसाथी",
    child: "संतान",
    son: "पुत्र",
    daughter: "पुत्री",
  },
  mr: {
    self: "स्वतः",
    father: "वडील",
    mother: "आई",
    spouse: "जोडीदार",
    child: "मूल",
    son: "मुलगा",
    daughter: "मुलगी",
  },
};

/** Soft lavender glass — matches Profile Vanshawali CTA (option C) */
const glassBg =
  "linear-gradient(135deg, rgba(252,231,243,0.5) 0%, rgba(243,232,255,0.42) 50%, rgba(237,233,254,0.38) 100%)";
const glassBorder = "border border-fuchsia-200/50";
const softGoldLine =
  "linear-gradient(90deg, rgba(201,162,39,0.15), rgba(201,162,39,0.75), rgba(201,162,39,0.15))";

/** 1B — Bare metallic gold branches (no leaves), mockup-exact feel */
function metalDefs() {
  return (
    <defs>
      <linearGradient id="metalGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B6914" />
        <stop offset="22%" stopColor="#E8C547" />
        <stop offset="45%" stopColor="#FFF8DC" />
        <stop offset="55%" stopColor="#F5D76E" />
        <stop offset="78%" stopColor="#C9A227" />
        <stop offset="100%" stopColor="#6B5210" />
      </linearGradient>
      <linearGradient id="metalGoldV" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#6B5210" />
        <stop offset="30%" stopColor="#F0D56A" />
        <stop offset="50%" stopColor="#FFFEF0" />
        <stop offset="70%" stopColor="#E8C547" />
        <stop offset="100%" stopColor="#6B5210" />
      </linearGradient>
      <filter id="metalGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#E8C547" floodOpacity="0.75" />
      </filter>
      <filter id="metalSoft" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#C9A227" floodOpacity="0.5" />
      </filter>
    </defs>
  );
}

/** Vertical metallic limb — bare, shiny, touches nodes */
function BranchVertical({ h = 40 }: { h?: number }) {
  const path = `M18 0 C15 ${h * 0.3}, 21 ${h * 0.55}, 18 ${h}`;
  return (
    <div
      className="relative z-[1] flex justify-center pointer-events-none"
      style={{ height: h, marginTop: -16, marginBottom: -16 }}
    >
      <svg width="36" height={h} className="overflow-visible" aria-hidden>
        {metalDefs()}
        <path
          d={path}
          fill="none"
          stroke="#5C4210"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.25"
        />
        <path
          d={path}
          fill="none"
          stroke="url(#metalGoldV)"
          strokeWidth="5.5"
          strokeLinecap="round"
          filter="url(#metalGlow)"
        />
        <path
          d={`M16 2 C13.5 ${h * 0.3}, 19 ${h * 0.55}, 16 ${h - 2}`}
          fill="none"
          stroke="#FFFEF0"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

function BranchHorizontal({ w = 48 }: { w?: number }) {
  const path = `M0 16 C${w * 0.35} 11, ${w * 0.65} 21, ${w} 16`;
  return (
    <div
      className="relative z-[1] flex items-center pointer-events-none"
      style={{ width: w, marginLeft: -14, marginRight: -14 }}
    >
      <svg width={w} height="32" className="overflow-visible" aria-hidden>
        {metalDefs()}
        <path d={path} fill="none" stroke="#5C4210" strokeWidth="7" strokeLinecap="round" opacity="0.22" />
        <path
          d={path}
          fill="none"
          stroke="url(#metalGold)"
          strokeWidth="5"
          strokeLinecap="round"
          filter="url(#metalGlow)"
        />
        <path
          d={`M2 14.5 C${w * 0.35} 10, ${w * 0.65} 19, ${w - 2} 14.5`}
          fill="none"
          stroke="#FFFEF0"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.65"
        />
      </svg>
    </div>
  );
}

/** Children canopy fork — metallic bare, mockup 1B style */
function BranchFork({ width = 200, childCount = 3 }: { width?: number; childCount?: number }) {
  const w = Math.max(100, Math.min(width, Math.max(childCount, 1) * 78));
  const mid = w / 2;
  return (
    <div
      className="relative z-[1] flex flex-col items-center pointer-events-none"
      style={{ marginTop: -14, marginBottom: -12 }}
    >
      <BranchVertical h={28} />
      <svg width={w} height="52" className="overflow-visible" aria-hidden>
        {metalDefs()}
        {/* wide metallic limb */}
        <path
          d={`M12 12 Q${mid} 2 ${w - 12} 12`}
          fill="none"
          stroke="#5C4210"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.2"
        />
        <path
          d={`M8 11 Q${mid} 1 ${w - 8} 11`}
          fill="none"
          stroke="url(#metalGold)"
          strokeWidth="5.2"
          strokeLinecap="round"
          filter="url(#metalGlow)"
        />
        <path
          d={`M14 9 Q${mid} 0 ${w - 14} 9`}
          fill="none"
          stroke="#FFFEF0"
          strokeWidth="1.2"
          opacity="0.55"
        />
        {Array.from({ length: childCount }).map((_, i) => {
          const x =
            childCount === 1
              ? mid
              : 20 + (i * (w - 40)) / Math.max(1, childCount - 1);
          const drop = `M${x} 11 C${x - 3} 26, ${x + 3} 36, ${x} 50`;
          return (
            <g key={i}>
              <path d={drop} fill="none" stroke="#5C4210" strokeWidth="6" strokeLinecap="round" opacity="0.18" />
              <path
                d={drop}
                fill="none"
                stroke="url(#metalGoldV)"
                strokeWidth="4.5"
                strokeLinecap="round"
                filter="url(#metalSoft)"
              />
              <path
                d={`M${x - 1.4} 14 C${x - 3} 28, ${x + 1} 38, ${x - 1} 48`}
                fill="none"
                stroke="#FFFEF0"
                strokeWidth="1.1"
                opacity="0.55"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function relLabel(lang: string, key: string, gender?: string | null) {
  const L = REL_LABELS[lang] || REL_LABELS.en;
  if (key === "child") {
    if (gender === "female" || gender === "F") return L.daughter;
    if (gender === "male" || gender === "M") return L.son;
  }
  return L[key] || key;
}

function SoftButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  if (variant === "ghost") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-rose-900/60 border border-fuchsia-200/40 active:scale-[0.98] ${className}`}
        style={{ background: "rgba(255,255,255,0.45)" }}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-2xl p-3.5 text-sm font-semibold text-rose-900/85 active:scale-[0.99] transition-all ${glassBorder} shadow-sm ${className}`}
      style={{
        background: glassBg,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {children}
    </button>
  );
}

function NodeCard({
  node,
  isCentre,
  lang,
  onFocus,
}: {
  node: Node;
  isCentre?: boolean;
  lang: string;
  onFocus?: (userId: string) => void;
}) {
  const ageStr = node.age != null ? `${node.age}` : node.birth_year ? `~${node.birth_year}` : "—";
  const rel = relLabel(lang, node.relation, node.gender);
  const pending = node.status === "pending";

  return (
    <button
      type="button"
      onClick={() => node.user_id && onFocus?.(node.user_id)}
      className={`flex flex-col items-center gap-1 max-w-[96px] ${node.user_id ? "cursor-pointer" : "cursor-default"}`}
    >
      <div
        className={`relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-2 ${
          isCentre
            ? "border-emerald-400/90 shadow-[0_0_18px_rgba(16,185,129,0.45)] ring-2 ring-emerald-200/60"
            : pending
              ? "border-amber-300/70 border-dashed"
              : "border-amber-200/80 shadow-[0_0_12px_rgba(201,162,39,0.25)]"
        }`}
        style={{ background: "rgba(255,255,255,0.65)" }}
      >
        {node.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-rose-900/70">
            {node.display_name?.[0] || <User size={20} className="text-rose-800/50" />}
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold text-rose-950/80 text-center leading-tight truncate w-full">
        {node.display_name}
      </p>
      <p className="text-[9px] text-rose-800/45 text-center leading-tight">
        {ageStr !== "—" ? `${ageStr} yrs` : "Age —"}
      </p>
      <p
        className={`text-[9px] font-medium text-center leading-tight ${
          isCentre ? "text-emerald-600/90" : "text-amber-800/70"
        }`}
      >
        {rel}
        {pending ? " · pending" : ""}
      </p>
    </button>
  );
}


/** Full-tree metallic gold limbs (1B mockup) — one SVG, organic paths, no leaves */
function TreeCanvas({
  tree,
  lang,
  onFocus,
}: {
  tree: Tree;
  lang: string;
  onFocus: (userId: string) => void;
}) {
  const parents = tree.parents || [];
  const spouses = tree.spouses || [];
  const children = tree.children || [];
  const nP = parents.length;
  const nC = Math.max(children.length, 1);

  // viewBox coordinates
  const W = 320;
  const H = 400;
  const cx = 160;
  const cy = 175; // centre avatar
  const r = 28; // avatar radius approx

  const parentPts =
    nP === 0
      ? []
      : nP === 1
        ? [{ x: 160, y: 48 }]
        : parents.map((_, i) => ({
            x: 70 + (i * 180) / Math.max(nP - 1, 1),
            y: 48,
          }));

  const spousePts = spouses.map((_, i) => ({
    x: 260 + i * 8,
    y: 175,
  }));

  const childPts =
    children.length === 0
      ? []
      : children.map((_, i) => ({
          x:
            children.length === 1
              ? 160
              : 50 + (i * 220) / Math.max(children.length - 1, 1),
          y: 330,
        }));

  const metalStroke = {
    fill: "none" as const,
    stroke: "url(#m1b)",
    strokeLinecap: "round" as const,
    filter: "url(#mglow)",
  };

  return (
    <div className="relative w-full mx-auto" style={{ minHeight: 380, maxWidth: 360 }}>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <linearGradient id="m1b" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7A5C12" />
            <stop offset="25%" stopColor="#E8C547" />
            <stop offset="48%" stopColor="#FFFCE8" />
            <stop offset="55%" stopColor="#F5D76E" />
            <stop offset="80%" stopColor="#C9A227" />
            <stop offset="100%" stopColor="#6B5210" />
          </linearGradient>
          <filter id="mglow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.4" floodColor="#E8C547" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Parent → centre organic branches */}
        {parentPts.map((pt, i) => {
          const dx = cx - pt.x;
          const dy = cy - pt.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          // stop at circle edge
          const ex = cx - (dx / len) * r;
          const ey = cy - (dy / len) * r;
          const sx = pt.x + (dx / len) * r * 0.85;
          const sy = pt.y + (dy / len) * r * 0.85;
          const c1x = pt.x + dx * 0.35 + (i % 2 === 0 ? -28 : 28);
          const c1y = pt.y + dy * 0.35;
          const c2x = cx - dx * 0.25 + (i % 2 === 0 ? 18 : -18);
          const c2y = cy - dy * 0.3;
          const d = `M${sx} ${sy} C${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
          return (
            <g key={`p-${i}`}>
              <path d={d} stroke="#5C4210" strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.2" />
              <path d={d} {...metalStroke} strokeWidth="6" />
              <path
                d={d}
                fill="none"
                stroke="#FFFEF0"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.45"
              />
            </g>
          );
        })}

        {/* Centre → spouse */}
        {spousePts.map((pt, i) => {
          const sx = cx + r;
          const sy = cy;
          const ex = pt.x - r * 0.7;
          const ey = pt.y;
          const d = `M${sx} ${sy} C${sx + 30} ${sy - 18}, ${ex - 25} ${ey + 16}, ${ex} ${ey}`;
          return (
            <g key={`s-${i}`}>
              <path d={d} stroke="#5C4210" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.18" />
              <path d={d} {...metalStroke} strokeWidth="5.5" />
              <path d={d} fill="none" stroke="#FFFEF0" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
            </g>
          );
        })}

        {/* Centre → children (tree canopy drop) */}
        {childPts.length > 0 && (
          <>
            {/* trunk down */}
            <path
              d={`M${cx} ${cy + r} C${cx - 6} ${cy + 55}, ${cx + 6} ${cy + 75}, ${cx} ${cy + 95}`}
              stroke="#5C4210"
              strokeWidth="9"
              fill="none"
              strokeLinecap="round"
              opacity="0.2"
            />
            <path
              d={`M${cx} ${cy + r} C${cx - 6} ${cy + 55}, ${cx + 6} ${cy + 75}, ${cx} ${cy + 95}`}
              {...metalStroke}
              strokeWidth="6.5"
            />
            {/* horizontal limb */}
            {childPts.length > 0 && (
              <>
                <path
                  d={`M${childPts[0].x} ${cy + 100} Q${cx} ${cy + 88} ${childPts[childPts.length - 1].x} ${cy + 100}`}
                  stroke="#5C4210"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.18"
                />
                <path
                  d={`M${childPts[0].x} ${cy + 100} Q${cx} ${cy + 88} ${childPts[childPts.length - 1].x} ${cy + 100}`}
                  {...metalStroke}
                  strokeWidth="5.5"
                />
              </>
            )}
            {childPts.map((pt, i) => {
              const d = `M${pt.x} ${cy + 100} C${pt.x - 4} ${cy + 140}, ${pt.x + 4} ${pt.y - 40}, ${pt.x} ${pt.y - r}`;
              return (
                <g key={`c-${i}`}>
                  <path d={d} stroke="#5C4210" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.18" />
                  <path d={d} {...metalStroke} strokeWidth="5" />
                  <path d={d} fill="none" stroke="#FFFEF0" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
                </g>
              );
            })}
          </>
        )}
      </svg>

      {/* Nodes overlaid at same % positions */}
      {parents.map((n, i) => {
        const pt = parentPts[i] || { x: 160, y: 48 };
        return (
          <div
            key={n.id}
            className="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(pt.x / W) * 100}%`, top: `${(pt.y / H) * 100}%` }}
          >
            <NodeCard node={n} lang={lang} onFocus={onFocus} />
          </div>
        );
      })}

      <div
        className="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${(cx / W) * 100}%`, top: `${(cy / H) * 100}%` }}
      >
        <NodeCard node={tree.centre} isCentre lang={lang} onFocus={onFocus} />
      </div>

      {spouses.map((n, i) => {
        const pt = spousePts[i] || { x: 260, y: 175 };
        return (
          <div
            key={n.id}
            className="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(pt.x / W) * 100}%`, top: `${(pt.y / H) * 100}%` }}
          >
            <NodeCard node={n} lang={lang} onFocus={onFocus} />
          </div>
        );
      })}

      {children.map((n, i) => {
        const pt = childPts[i];
        if (!pt) return null;
        return (
          <div
            key={n.id}
            className="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(pt.x / W) * 100}%`, top: `${(pt.y / H) * 100}%` }}
          >
            <NodeCard node={n} lang={lang} onFocus={onFocus} />
          </div>
        );
      })}
    </div>
  );
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
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    relation: "father",
    display_name: "",
    birth_year: "",
    gender: "",
    member_user_id: "",
  });
  const [saving, setSaving] = useState(false);

  const L = useMemo(() => REL_LABELS[lang] || REL_LABELS.en, [lang]);

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

  const focusUser = (uid: string) => {
    router.push(`/vanshawali?user=${uid}`);
  };

  const addRelative = async () => {
    if (!form.member_user_id && !form.display_name.trim()) {
      toast("Name ya member chahiye", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          centre_user_id: rootId,
          relation: form.relation,
          display_name: form.display_name,
          birth_year: form.birth_year || null,
          gender: form.gender || null,
          member_user_id: form.member_user_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        return;
      }
      toast(data.link?.status === "verified" ? "Added" : "Pending verify", "success");
      setShowAdd(false);
      setForm({ relation: "father", display_name: "", birth_year: "", gender: "", member_user_id: "" });
      load();
    } finally {
      setSaving(false);
    }
  };

  const title = lang === "hi" || lang === "mr" ? "वंशावली" : "Vanshawali";

  return (
    <div
      className="min-h-[70vh] p-4 pb-28 max-w-lg mx-auto space-y-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(252,231,243,0.35) 0%, rgba(250,245,255,0.5) 40%, rgba(255,255,255,0.9) 100%)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center ${glassBorder}`}
          style={{ background: "rgba(255,255,255,0.55)" }}
        >
          <Network className="text-amber-700/75" size={22} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-rose-950/85">{title}</h1>
          <p className="text-[11px] text-rose-800/45">
            {lang === "hi"
              ? "परिवार की जड़ें · नाम · आयु · रिश्ता"
              : "Family roots · name · age · relation"}
          </p>
        </div>
      </div>

      {loading && <p className="text-center text-rose-800/40 py-12">Loading…</p>}

      {!loading && tree && (
        <div
          className={`rounded-3xl overflow-hidden ${glassBorder} shadow-sm`}
          style={{
            background: glassBg,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div className="p-3 sm:p-4">
            <TreeCanvas tree={tree} lang={lang} onFocus={focusUser} />
          </div>
        </div>
      )}

      {canEdit && (
        <div className="space-y-2">
          {!showAdd ? (
            <SoftButton onClick={() => setShowAdd(true)}>
              <span className="inline-flex items-center justify-center gap-2">
                <Plus size={16} className="text-amber-700/80" />
                {lang === "hi" ? "रिश्तेदार जोड़ें" : "Add relative"}
              </span>
            </SoftButton>
          ) : (
            <div
              className={`rounded-2xl p-4 space-y-3 ${glassBorder}`}
              style={{
                background: glassBg,
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              <select
                className="w-full px-3 py-2.5 rounded-xl text-sm text-rose-950/80 border border-fuchsia-200/40"
                style={{ background: "rgba(255,255,255,0.55)" }}
                value={form.relation}
                onChange={(e) => setForm((f) => ({ ...f, relation: e.target.value }))}
              >
                <option value="father">{L.father}</option>
                <option value="mother">{L.mother}</option>
                <option value="spouse">{L.spouse}</option>
                <option value="child">{L.child}</option>
              </select>
              <Input
                label={lang === "hi" ? "नाम (बिन account भी)" : "Name (ghost OK)"}
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Birth year"
                  inputMode="numeric"
                  value={form.birth_year}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      birth_year: e.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                />
                <select
                  className="w-full px-3 py-2 rounded-xl text-sm border border-fuchsia-200/40 mt-6"
                  style={{ background: "rgba(255,255,255,0.55)" }}
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                >
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <p className="text-[10px] text-rose-800/40">
                Staff add = auto verified. Member add = pending verify.
              </p>
              <div className="flex gap-2">
                <SoftButton variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </SoftButton>
                <SoftButton
                  className="flex-1"
                  disabled={saving}
                  onClick={addRelative}
                >
                  {saving ? "…" : "Save"}
                </SoftButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VanshawaliPage() {
  return (
    <FeatureGate moduleKey="vanshawali">
      <Suspense fallback={<div className="p-8 text-center text-rose-800/40">Loading…</div>}>
        <VanshawaliInner />
      </Suspense>
    </FeatureGate>
  );
}
