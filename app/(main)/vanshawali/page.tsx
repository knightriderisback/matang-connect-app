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

/** 3D shiny gold branch + tiny leaves — overlaps nodes so it touches profiles */
function GoldLeaf({ x, y, rot = 0, scale = 1 }: { x: number; y: number; rot?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <ellipse
        cx="0"
        cy="0"
        rx="4.2"
        ry="2.4"
        fill="url(#leafGold)"
        stroke="#8B6914"
        strokeWidth="0.35"
        opacity="0.95"
      />
      <line x1="-2" y1="0" x2="2.5" y2="0" stroke="#FFF3C4" strokeWidth="0.4" opacity="0.7" />
    </g>
  );
}

function BranchVertical({ h = 32, leaves = true }: { h?: number; leaves?: boolean }) {
  return (
    <div
      className="relative z-[1] flex justify-center pointer-events-none"
      style={{ height: h, marginTop: -10, marginBottom: -10 }}
    >
      <svg width="28" height={h} className="overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="branchGoldV" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6B4F12" />
            <stop offset="28%" stopColor="#E8C547" />
            <stop offset="50%" stopColor="#FFF1A8" />
            <stop offset="72%" stopColor="#C9A227" />
            <stop offset="100%" stopColor="#5C4210" />
          </linearGradient>
          <linearGradient id="leafGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF6C8" />
            <stop offset="45%" stopColor="#E4C04A" />
            <stop offset="100%" stopColor="#9A7B1A" />
          </linearGradient>
          <filter id="branchGlow" x="-50%" y="-20%" width="200%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#C9A227" floodOpacity="0.55" />
          </filter>
        </defs>
        {/* outer depth */}
        <line
          x1="14"
          y1="2"
          x2="14"
          y2={h - 2}
          stroke="#5C4210"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.35"
        />
        <line
          x1="14"
          y1="0"
          x2="14"
          y2={h}
          stroke="url(#branchGoldV)"
          strokeWidth="4.5"
          strokeLinecap="round"
          filter="url(#branchGlow)"
        />
        {/* shine edge */}
        <line
          x1="12.5"
          y1="2"
          x2="12.5"
          y2={h - 2}
          stroke="#FFF8D0"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.75"
        />
        {leaves && (
          <>
            <GoldLeaf x={19} y={h * 0.28} rot={-35} scale={1} />
            <GoldLeaf x={9} y={h * 0.52} rot={40} scale={0.9} />
            <GoldLeaf x={20} y={h * 0.72} rot={-25} scale={0.85} />
          </>
        )}
      </svg>
    </div>
  );
}

function BranchHorizontal({ w = 36 }: { w?: number }) {
  return (
    <div
      className="relative z-[1] flex items-center pointer-events-none"
      style={{ width: w, marginLeft: -8, marginRight: -8 }}
    >
      <svg width={w} height="28" className="overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="branchGoldH" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6B4F12" />
            <stop offset="30%" stopColor="#F0D56A" />
            <stop offset="55%" stopColor="#FFF1A8" />
            <stop offset="100%" stopColor="#8B6914" />
          </linearGradient>
          <linearGradient id="leafGoldH" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF6C8" />
            <stop offset="50%" stopColor="#E4C04A" />
            <stop offset="100%" stopColor="#9A7B1A" />
          </linearGradient>
        </defs>
        <line
          x1="2"
          y1="15"
          x2={w - 2}
          y2="15"
          stroke="#5C4210"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.3"
        />
        <line
          x1="0"
          y1="14"
          x2={w}
          y2="14"
          stroke="url(#branchGoldH)"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <line
          x1="2"
          y1="12.5"
          x2={w - 2}
          y2="12.5"
          stroke="#FFF8D0"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.7"
        />
        <g transform={`translate(${w * 0.4} 8)`}>
          <ellipse cx="0" cy="0" rx="4" ry="2.2" fill="url(#leafGoldH)" stroke="#8B6914" strokeWidth="0.3" />
        </g>
        <g transform={`translate(${w * 0.65} 18) rotate(15)`}>
          <ellipse cx="0" cy="0" rx="3.6" ry="2" fill="url(#leafGoldH)" stroke="#8B6914" strokeWidth="0.3" />
        </g>
      </svg>
    </div>
  );
}

function BranchFork({ width = 200, childCount = 3 }: { width?: number; childCount?: number }) {
  const w = Math.max(80, Math.min(width, childCount * 72));
  const mid = w / 2;
  return (
    <div className="relative z-[1] flex flex-col items-center pointer-events-none" style={{ marginTop: -8, marginBottom: -6 }}>
      <BranchVertical h={20} leaves={false} />
      <svg width={w} height="36" className="overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="forkGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8B6914" />
            <stop offset="50%" stopColor="#FFE9A0" />
            <stop offset="100%" stopColor="#8B6914" />
          </linearGradient>
        </defs>
        {/* horizontal bar touching child stems */}
        <line
          x1="8"
          y1="8"
          x2={w - 8}
          y2="8"
          stroke="#5C4210"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.3"
        />
        <line
          x1="4"
          y1="7"
          x2={w - 4}
          y2="7"
          stroke="url(#forkGold)"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <line
          x1="8"
          y1="5.5"
          x2={w - 8}
          y2="5.5"
          stroke="#FFF8D0"
          strokeWidth="1"
          opacity="0.65"
        />
        {/* drop stems toward each child slot */}
        {Array.from({ length: childCount }).map((_, i) => {
          const x =
            childCount === 1
              ? mid
              : 16 + (i * (w - 32)) / Math.max(1, childCount - 1);
          return (
            <g key={i}>
              <line
                x1={x}
                y1="7"
                x2={x}
                y2="34"
                stroke="url(#forkGold)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <line
                x1={x - 1}
                y1="10"
                x2={x - 1}
                y2="32"
                stroke="#FFF8D0"
                strokeWidth="0.9"
                opacity="0.6"
              />
              <ellipse
                cx={x + 5}
                cy={20}
                rx="3.2"
                ry="1.8"
                fill="#E8C547"
                stroke="#8B6914"
                strokeWidth="0.25"
                opacity="0.9"
                transform={`rotate(-30 ${x + 5} 20)`}
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
