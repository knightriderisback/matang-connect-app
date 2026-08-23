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

/** Hyper-realistic gold tree branches — organic path, bark depth, leaves */
function GoldLeaf({
  x,
  y,
  rot = 0,
  scale = 1,
}: {
  x: number;
  y: number;
  rot?: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <ellipse
        cx="1.5"
        cy="0"
        rx="5.5"
        ry="2.8"
        fill="url(#hrLeaf)"
        stroke="#5C3B0A"
        strokeWidth="0.35"
      />
      <path
        d="M-2.5 0 Q1.5 -1.2 5.5 0"
        fill="none"
        stroke="#FFF6C8"
        strokeWidth="0.45"
        opacity="0.55"
      />
      <ellipse cx="0.5" cy="-0.6" rx="2" ry="0.7" fill="#FFF8DC" opacity="0.35" />
    </g>
  );
}

function branchDefs() {
  return (
    <defs>
      <linearGradient id="hrBark" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#3D2914" />
        <stop offset="18%" stopColor="#8B5A1A" />
        <stop offset="38%" stopColor="#D4A017" />
        <stop offset="50%" stopColor="#FFE566" />
        <stop offset="62%" stopColor="#C9A227" />
        <stop offset="82%" stopColor="#7A5210" />
        <stop offset="100%" stopColor="#2A1A0A" />
      </linearGradient>
      <linearGradient id="hrBarkV" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#2A1A0A" />
        <stop offset="22%" stopColor="#A67C1A" />
        <stop offset="45%" stopColor="#F5E6A3" />
        <stop offset="55%" stopColor="#E8C547" />
        <stop offset="78%" stopColor="#8B6914" />
        <stop offset="100%" stopColor="#1A1008" />
      </linearGradient>
      <linearGradient id="hrLeaf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFF9D6" />
        <stop offset="35%" stopColor="#F0D060" />
        <stop offset="70%" stopColor="#C9A227" />
        <stop offset="100%" stopColor="#6B4A0E" />
      </linearGradient>
      <filter id="hrSoft" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0.5" dy="1.5" stdDeviation="1.4" floodColor="#8B6914" floodOpacity="0.45" />
      </filter>
      <filter id="hrInner">
        <feGaussianBlur stdDeviation="0.4" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

/** Vertical trunk/branch — curves slightly, thick→thin, touches nodes */
function BranchVertical({ h = 40, leaves = true }: { h?: number; leaves?: boolean }) {
  const path = `M14 0 C12 ${h * 0.25}, 16 ${h * 0.5}, 14 ${h}`;
  return (
    <div
      className="relative z-[1] flex justify-center pointer-events-none"
      style={{ height: h, marginTop: -14, marginBottom: -14 }}
    >
      <svg width="36" height={h} className="overflow-visible" aria-hidden>
        {branchDefs()}
        {/* ambient depth */}
        <path
          d={path}
          fill="none"
          stroke="#1A1008"
          strokeWidth="9"
          strokeLinecap="round"
          opacity="0.25"
        />
        {/* main bark body */}
        <path
          d={path}
          fill="none"
          stroke="url(#hrBarkV)"
          strokeWidth="6.5"
          strokeLinecap="round"
          filter="url(#hrSoft)"
        />
        {/* highlight ridge */}
        <path
          d={`M12.2 2 C10.5 ${h * 0.25}, 14.5 ${h * 0.5}, 12.2 ${h - 2}`}
          fill="none"
          stroke="#FFF8D6"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.55"
        />
        {/* bark cracks */}
        <path
          d={`M15.5 ${h * 0.2} L16.2 ${h * 0.28}`}
          stroke="#3D2914"
          strokeWidth="0.6"
          opacity="0.5"
        />
        <path
          d={`M13 ${h * 0.55} L12.2 ${h * 0.62}`}
          stroke="#3D2914"
          strokeWidth="0.5"
          opacity="0.45"
        />
        {leaves && (
          <>
            <GoldLeaf x={22} y={h * 0.22} rot={-42} scale={1.05} />
            <GoldLeaf x={8} y={h * 0.4} rot={48} scale={0.95} />
            <GoldLeaf x={23} y={h * 0.58} rot={-28} scale={0.88} />
            <GoldLeaf x={9} y={h * 0.75} rot={55} scale={0.8} />
          </>
        )}
      </svg>
    </div>
  );
}

function BranchHorizontal({ w = 44 }: { w?: number }) {
  const path = `M0 14 C${w * 0.3} 10, ${w * 0.7} 18, ${w} 14`;
  return (
    <div
      className="relative z-[1] flex items-center pointer-events-none"
      style={{ width: w, marginLeft: -12, marginRight: -12 }}
    >
      <svg width={w} height="32" className="overflow-visible" aria-hidden>
        {branchDefs()}
        <path d={path} fill="none" stroke="#1A1008" strokeWidth="8" strokeLinecap="round" opacity="0.22" />
        <path
          d={path}
          fill="none"
          stroke="url(#hrBark)"
          strokeWidth="5.5"
          strokeLinecap="round"
          filter="url(#hrSoft)"
        />
        <path
          d={`M2 12.5 C${w * 0.3} 9, ${w * 0.7} 16, ${w - 2} 12.5`}
          fill="none"
          stroke="#FFF8D6"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.5"
        />
        <GoldLeaf x={w * 0.35} y={8} rot={-20} scale={0.9} />
        <GoldLeaf x={w * 0.62} y={20} rot={25} scale={0.85} />
      </svg>
    </div>
  );
}

function BranchFork({ width = 200, childCount = 3 }: { width?: number; childCount?: number }) {
  const w = Math.max(96, Math.min(width, Math.max(childCount, 1) * 76));
  const mid = w / 2;
  return (
    <div
      className="relative z-[1] flex flex-col items-center pointer-events-none"
      style={{ marginTop: -12, marginBottom: -10 }}
    >
      <BranchVertical h={24} leaves={true} />
      <svg width={w} height="48" className="overflow-visible" aria-hidden>
        {branchDefs()}
        {/* curved horizontal limb */}
        <path
          d={`M10 10 Q${mid} 4 ${w - 10} 10`}
          fill="none"
          stroke="#1A1008"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.22"
        />
        <path
          d={`M6 9 Q${mid} 3 ${w - 6} 9`}
          fill="none"
          stroke="url(#hrBark)"
          strokeWidth="5"
          strokeLinecap="round"
          filter="url(#hrSoft)"
        />
        <path
          d={`M12 7.5 Q${mid} 2 ${w - 12} 7.5`}
          fill="none"
          stroke="#FFF8D6"
          strokeWidth="1.2"
          opacity="0.45"
        />
        {Array.from({ length: childCount }).map((_, i) => {
          const x =
            childCount === 1
              ? mid
              : 18 + (i * (w - 36)) / Math.max(1, childCount - 1);
          const drop = `M${x} 9 C${x - 2} 22, ${x + 2} 30, ${x} 46`;
          return (
            <g key={i}>
              <path d={drop} fill="none" stroke="#1A1008" strokeWidth="6" strokeLinecap="round" opacity="0.2" />
              <path
                d={drop}
                fill="none"
                stroke="url(#hrBarkV)"
                strokeWidth="4.2"
                strokeLinecap="round"
              />
              <path
                d={`M${x - 1.2} 12 C${x - 2.5} 24, ${x} 32, ${x - 1} 44`}
                fill="none"
                stroke="#FFF8D6"
                strokeWidth="1"
                opacity="0.4"
              />
              <GoldLeaf x={x + 6} y={24} rot={-30} scale={0.85} />
              <GoldLeaf x={x - 6} y={34} rot={40} scale={0.75} />
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
          <div className="p-4 sm:p-6">
            <div className="flex justify-center gap-8 min-h-[88px]">
              {(tree.parents.length ? tree.parents : []).map((n) => (
                <NodeCard key={n.id} node={n} lang={lang} onFocus={focusUser} />
              ))}
              {!tree.parents.length && (
                <p className="text-[10px] text-rose-800/35 self-center">Parents —</p>
              )}
            </div>

            {(tree.parents.length > 0) && <BranchVertical h={36} />}

            <div className="relative z-[2] flex items-center justify-center gap-1 sm:gap-2">
              <NodeCard node={tree.centre} isCentre lang={lang} onFocus={focusUser} />
              {tree.spouses.map((n) => (
                <div key={n.id} className="flex items-center">
                  <BranchHorizontal w={40} />
                  <NodeCard node={n} lang={lang} onFocus={focusUser} />
                </div>
              ))}
            </div>

            {tree.children.length > 0 ? (
              <BranchFork
                width={Math.min(280, tree.children.length * 72)}
                childCount={tree.children.length}
              />
            ) : (
              <div className="h-2" />
            )}

            <div className="flex justify-center gap-3 flex-wrap min-h-[88px]">
              {tree.children.map((n) => (
                <NodeCard key={n.id} node={n} lang={lang} onFocus={focusUser} />
              ))}
              {!tree.children.length && (
                <p className="text-[10px] text-rose-800/35 self-center">Children —</p>
              )}
            </div>
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
