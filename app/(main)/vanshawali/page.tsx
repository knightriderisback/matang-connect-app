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
 *
 * ZOOM / PAN (LOCKED feature set):
 *   +/− · Fit · Reset · pinch · 1-finger pan · Ctrl+wheel
 *   Scale 0.5–2.0 — does not change tree layout rules.
 *
 * SIBLINGS (auto, any generation):
 *   Share ≥1 parent → neon yellow branch between them (bottom corners).
 *   Parent → child = default gold branch.
 *   New child under a parent auto-joins existing kids as siblings.
 *   Add sibling = child of same parents; API links BOTH mother & father.
 * ═══════════════════════════════════════════════════════════════
 */
import { FeatureGate } from "@/components/shared/FeatureGate";
import React, { useCallback, useEffect, useMemo, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  X,
  Focus,
  User,
  Pencil,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Home,
  Share2,
  HeartHandshake,
  TreePine,
  ListFilter,
  ChevronRight,
  Calendar,
  ShieldCheck,
  Baby,
  Users,
  Sparkles,
} from "lucide-react";

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
  gotra?: string | null;
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
  uncles_and_aunts?: Node[];
  siblings_of?: Record<string, Node[]>;
  spouses_of?: Record<string, Node[]>;
  children_of?: Record<string, Node[]>;
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
  if (g === "female" || g === "f" || g === "woman" || g === "stree" || g === "mahila") return "F";
  if (g === "male" || g === "m" || g === "man" || g === "purush") return "M";
  const r = (relation || "").toLowerCase();
  if (
    [
      "mother", "grandmother", "wife", "daughter", "sister",
      "dadi", "nani", "bhabhi", "chachi", "mami", "bua", "mausi",
      "poti", "natin", "naatin", "bahu", "vadhu", "daughter-in-law"
    ].includes(r)
  )
    return "F";
  if (
    [
      "father", "grandfather", "husband", "son", "brother",
      "dada", "nana", "chacha", "mama", "tau", "fufa", "mausa",
      "jija", "damad", "damaad", "jawai", "pota", "nati", "naati", "son-in-law"
    ].includes(r)
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
    /* acrylic yellow — self's brothers/sisters */
    bg: "rgba(255, 235, 59, 0.55)",
    border: "rgba(250, 204, 21, 0.75)",
    text: "#713f12",
  },
};
const BUBBLE_3D =
  "0 4px 6px rgba(0,0,0,0.1), 0 12px 28px rgba(0,0,0,0.14), 0 2px 0 rgba(255,255,255,0.5) inset";
/** Name-plate: embossed letter feel */
const NAMEPLATE =
  "0 1px 0 rgba(255,255,255,0.65), 0 -1px 0 rgba(0,0,0,0.12)";

/** Pull line endpoints INSIDE the bubble so no hairline gap remains */
const IN = 10;

export type RingStyle = {
  id: string;
  name: string;
  bandGradient: string;
  bandBorder: string;
  bandGradientStops: { offset: string; color: string }[];
  gemColor: string;
  sparkleColor: string;
  lineColor: string;
  shadowColor: string;
};

const COUPLE_RING_STYLES: RingStyle[] = [
  {
    id: "silver",
    name: "Sterling Silver",
    bandGradient: "from-slate-200 via-white to-slate-400",
    bandBorder: "#64748B",
    bandGradientStops: [
      { offset: "0%", color: "#94A3B8" },
      { offset: "28%", color: "#FFFFFF" },
      { offset: "62%", color: "#CBD5E1" },
      { offset: "100%", color: "#64748B" },
    ],
    // High-contrast: Silver band with Royal Sapphire Blue diamond
    gemColor: "#2563EB",
    sparkleColor: "#93C5FD",
    lineColor: "#64748B",
    shadowColor: "rgba(148, 163, 184, 0.45)",
  },
  {
    id: "gold",
    name: "24K Gold",
    bandGradient: "from-amber-300 via-yellow-100 to-amber-500",
    bandBorder: "#D97706",
    bandGradientStops: [
      { offset: "0%", color: "#D97706" },
      { offset: "28%", color: "#FEF3C7" },
      { offset: "62%", color: "#F59E0B" },
      { offset: "100%", color: "#92400E" },
    ],
    // High-contrast: Gold band with Vivid Emerald Green diamond
    gemColor: "#059669",
    sparkleColor: "#6EE7B7",
    lineColor: "#D97706",
    shadowColor: "rgba(217, 119, 6, 0.45)",
  },
  {
    id: "ruby",
    name: "Rose Ruby",
    bandGradient: "from-rose-300 via-pink-100 to-rose-500",
    bandBorder: "#E11D48",
    bandGradientStops: [
      { offset: "0%", color: "#BE123C" },
      { offset: "28%", color: "#FFE4E6" },
      { offset: "62%", color: "#FB7185" },
      { offset: "100%", color: "#881337" },
    ],
    // High-contrast: Red band with Canary Yellow diamond
    gemColor: "#FBBF24",
    sparkleColor: "#FEF9C3",
    lineColor: "#E11D48",
    shadowColor: "rgba(225, 29, 72, 0.45)",
  },
  {
    id: "sapphire",
    name: "Sapphire",
    bandGradient: "from-sky-300 via-blue-100 to-indigo-500",
    bandBorder: "#2563EB",
    bandGradientStops: [
      { offset: "0%", color: "#1D4ED8" },
      { offset: "28%", color: "#EFF6FF" },
      { offset: "62%", color: "#60A5FA" },
      { offset: "100%", color: "#1E3A8A" },
    ],
    // High-contrast: Blue band with Crimson Ruby diamond
    gemColor: "#DC2626",
    sparkleColor: "#FDA4AF",
    lineColor: "#2563EB",
    shadowColor: "rgba(37, 99, 235, 0.45)",
  },
  {
    id: "emerald",
    name: "Emerald",
    bandGradient: "from-emerald-300 via-teal-100 to-emerald-500",
    bandBorder: "#059669",
    bandGradientStops: [
      { offset: "0%", color: "#047857" },
      { offset: "28%", color: "#ECFDF5" },
      { offset: "62%", color: "#34D399" },
      { offset: "100%", color: "#064E3B" },
    ],
    // High-contrast: Green band with Sunset Coral Orange diamond
    gemColor: "#EA580C",
    sparkleColor: "#FED7AA",
    lineColor: "#059669",
    shadowColor: "rgba(5, 150, 105, 0.45)",
  },
  {
    id: "amethyst",
    name: "Amethyst",
    bandGradient: "from-purple-300 via-fuchsia-100 to-purple-600",
    bandBorder: "#7C3AED",
    bandGradientStops: [
      { offset: "0%", color: "#5B21B6" },
      { offset: "28%", color: "#FAF5FF" },
      { offset: "62%", color: "#A78BFA" },
      { offset: "100%", color: "#3B0764" },
    ],
    // High-contrast: Purple band with Aquamarine Cyan diamond
    gemColor: "#06B6D4",
    sparkleColor: "#A5F3FC",
    lineColor: "#7C3AED",
    shadowColor: "rgba(124, 58, 237, 0.45)",
  },
  {
    id: "turquoise",
    name: "Turquoise",
    bandGradient: "from-cyan-300 via-teal-100 to-cyan-600",
    bandBorder: "#0891B2",
    bandGradientStops: [
      { offset: "0%", color: "#0E7490" },
      { offset: "28%", color: "#ECFEFF" },
      { offset: "62%", color: "#22D3EE" },
      { offset: "100%", color: "#155E75" },
    ],
    // High-contrast: Teal band with Fuchsia Pink diamond
    gemColor: "#C026D3",
    sparkleColor: "#F0ABFC",
    lineColor: "#0891B2",
    shadowColor: "rgba(8, 145, 178, 0.45)",
  },
  {
    id: "coral",
    name: "Coral",
    bandGradient: "from-orange-300 via-amber-100 to-rose-500",
    bandBorder: "#EA580C",
    bandGradientStops: [
      { offset: "0%", color: "#C2410C" },
      { offset: "28%", color: "#FFF7ED" },
      { offset: "62%", color: "#FB923C" },
      { offset: "100%", color: "#7C2D12" },
    ],
    // High-contrast: Orange band with Royal Indigo Blue diamond
    gemColor: "#4F46E5",
    sparkleColor: "#C7D2FE",
    lineColor: "#EA580C",
    shadowColor: "rgba(234, 88, 12, 0.45)",
  },
  {
    id: "garnet",
    name: "Garnet",
    bandGradient: "from-slate-700 via-slate-400 to-slate-900",
    bandBorder: "#334155",
    bandGradientStops: [
      { offset: "0%", color: "#1E293B" },
      { offset: "28%", color: "#F1F5F9" },
      { offset: "62%", color: "#475569" },
      { offset: "100%", color: "#0F172A" },
    ],
    // High-contrast: Dark Rhodium band with Peridot Lime diamond
    gemColor: "#10B981",
    sparkleColor: "#A7F3D0",
    lineColor: "#334155",
    shadowColor: "rgba(51, 65, 85, 0.45)",
  },
  {
    id: "fuchsia",
    name: "Fuchsia",
    bandGradient: "from-fuchsia-300 via-pink-100 to-rose-600",
    bandBorder: "#C026D3",
    bandGradientStops: [
      { offset: "0%", color: "#A21CAF" },
      { offset: "28%", color: "#FDF4FF" },
      { offset: "62%", color: "#E879F9" },
      { offset: "100%", color: "#701A75" },
    ],
    // High-contrast: Pink band with Golden Topaz diamond
    gemColor: "#D97706",
    sparkleColor: "#FDE68A",
    lineColor: "#C026D3",
    shadowColor: "rgba(192, 38, 211, 0.45)",
  },
];

function DiamondGem({
  color = "#F59E0B",
  sparkle = "#FFFFFF",
  size = 12,
  className = "",
}: {
  color?: string;
  sparkle?: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
    >
      {/* Crown / Top table */}
      <polygon points="6,2 18,2 23,8 1,8" fill={color} />
      <polygon points="8,2 16,2 18,8 6,8" fill={sparkle} opacity="0.55" />
      {/* Pavilion / Bottom facets */}
      <polygon points="1,8 23,8 12,22" fill={color} />
      <polygon points="6,8 18,8 12,22" fill={sparkle} opacity="0.32" />
      <polygon points="10,8 14,8 12,22" fill={sparkle} opacity="0.6" />
      {/* Facet highlight */}
      <circle cx="7" cy="5" r="1.2" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

function SolitaireRingAvatar({
  node,
  ring,
  isSelf,
  isLate,
  cleanName,
  sex,
  size = 38,
}: {
  node: Node;
  ring?: RingStyle;
  isSelf?: boolean;
  isLate?: boolean;
  cleanName: string;
  sex?: string | null;
  size?: number;
}) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = (s - 7) / 2;
  const circ = 2 * Math.PI * r;
  const activeRing = ring || (isSelf ? COUPLE_RING_STYLES[0] : undefined);

  return (
    <div
      className="relative shrink-0 flex items-center justify-center select-none"
      style={{ width: s, height: s }}
    >
      {activeRing ? (
        <>
          {/* Complete Solitaire Ring rotated to the left (-38° / 10:45 o'clock) with 3D luxury specular light sheen */}
          <svg
            className="absolute inset-0 pointer-events-none z-20 overflow-visible"
            width={s}
            height={s}
            viewBox={`0 0 ${s} ${s}`}
          >
            <defs>
              <linearGradient id={`ringGrad-${activeRing.id}-${s}`} x1="0%" y1="0%" x2="100%" y2="100%">
                {activeRing.bandGradientStops.map((st, i) => (
                  <stop key={i} offset={st.offset} stopColor={st.color} />
                ))}
              </linearGradient>
            </defs>

            {/* Whole ring assembly rotated -38° to the left so diamond sits firmly on the band */}
            <g transform={`rotate(-38, ${cx}, ${cy})`}>
              {/* Metallic Base Ring Band (Outer depth contour) */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={activeRing.bandBorder}
                strokeWidth={2.8}
                opacity={0.88}
              />
              {/* 3D Tubular Metallic Gradient */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={`url(#ringGrad-${activeRing.id}-${s})`}
                strokeWidth={2.0}
              />

              {/* Ultra-tiny specular light glint (1.8% circumference) that slowly orbits 360° around the whole ring */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={1.8}
                pathLength={100}
                strokeDasharray="1.8 98.2"
                strokeLinecap="round"
                className="vansh-3d-shine"
              />

              {/* Solitaire Diamond Setting Mount seated directly ON the outer rim of the band */}
              <g transform={`translate(${cx}, ${cy - r})`}>
                {/* Setting basket base supporting the diamond */}
                <path
                  d="M -3.8 2.2 L -3 0 L 3 0 L 3.8 2.2 Z"
                  fill={activeRing.bandBorder}
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
                />
                {/* 4-Prong Setting holding the diamond */}
                <path
                  d="M -3.2 0 L -3 -3 L -2.2 -3 L -2.4 0 Z"
                  fill={activeRing.bandBorder}
                />
                <path
                  d="M 3.2 0 L 3 -3 L 2.2 -3 L 2.4 0 Z"
                  fill={activeRing.bandBorder}
                />

                {/* Static Solitaire Diamond Gem (NO animation, crisp brilliant facets) */}
                {/* Diamond Pavilion (lower V) */}
                <polygon
                  points="-3,0 3,0 0,3.2"
                  fill={activeRing.gemColor}
                />
                <polygon
                  points="-1.2,0 1.2,0 0,3.2"
                  fill={activeRing.sparkleColor}
                  opacity={0.65}
                />

                {/* Diamond Crown (upper facets) */}
                <polygon
                  points="-3,0 3,0 2.2,-3 -2.2,-3"
                  fill={activeRing.gemColor}
                />
                <polygon
                  points="-1.4,-3 1.4,-3 2,0 -2,0"
                  fill={activeRing.sparkleColor}
                  opacity={0.8}
                />
                {/* Diamond Table facet highlight */}
                <polygon
                  points="-1,-3 1,-3 0.6,-1.2 -0.6,-1.2"
                  fill="#FFFFFF"
                  opacity={0.9}
                />

                {/* Left & Right prong beads clamping diamond girdle */}
                <circle cx="-2.8" cy="-1.5" r="0.6" fill="#FFFFFF" />
                <circle cx="2.8" cy="-1.5" r="0.6" fill="#FFFFFF" />
              </g>
            </g>
          </svg>

          {/* Centered Avatar Image / Fallback inside the ring */}
          <div
            className="rounded-full overflow-hidden flex items-center justify-center z-10"
            style={{ width: s - 10, height: s - 10 }}
          >
            {node.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={node.photo_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className={cn(
                  "w-full h-full flex items-center justify-center text-xs font-bold",
                  isSelf
                    ? "bg-amber-400 text-amber-950"
                    : sex === "F"
                    ? "bg-rose-200 text-rose-800"
                    : "bg-indigo-200 text-indigo-800"
                )}
              >
                {cleanName.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Unmarried member avatar with neat border */
        <div
          className="relative rounded-full overflow-hidden flex items-center justify-center border border-gray-200 shadow-2xs"
          style={{ width: s - 6, height: s - 6 }}
        >
          {node.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={node.photo_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center text-xs font-bold",
                isSelf
                  ? "bg-amber-400 text-amber-950"
                  : sex === "F"
                  ? "bg-rose-200 text-rose-800"
                  : "bg-indigo-200 text-indigo-800"
              )}
            >
              {cleanName.charAt(0).toUpperCase() || "?"}
            </div>
          )}
        </div>
      )}

      {/* Late Candle badge at bottom-right */}
      {isLate && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-[8px] shadow-2xs z-30"
          title="स्वर्गीय"
        >
          🕯️
        </span>
      )}
    </div>
  );
}

function getDockOffset(id: string, isTop: boolean): number {
  let h = isTop ? 17 : 37;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 27) - 12;
}

function bezierCurve(p1: { x: number; y: number }, p2: { x: number; y: number }): string {
  const dx = p2.x - p1.x;
  const dy = Math.max(18, p2.y - p1.y);
  // Organic sweeping twist: lines curve naturally without stiff vertical drops or sharp corners
  const twist = (dx >= 0 ? 1 : -1) * Math.min(18, Math.max(6, Math.abs(dx) * 0.16));
  const cp1x = p1.x + twist;
  const cp1y = p1.y + dy * 0.52;
  const cp2x = p2.x - twist * 0.5;
  const cp2y = p2.y - dy * 0.48;
  return `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
}

function RopeKnot({
  x,
  y,
  isBottom = false,
  corner,
}: {
  x: number;
  y: number;
  isBottom?: boolean;
  corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  let rot = 0;
  if (corner === "top-left") rot = 30;
  else if (corner === "top-right") rot = -30;
  else if (corner === "bottom-left") rot = 150;
  else if (corner === "bottom-right") rot = -150;
  else if (isBottom) rot = 180;

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Realistic tied rope knot physically tagging ON TOP of the card corner */}
      <g transform={rot !== 0 ? `rotate(${rot})` : undefined}>
        {/* Soft shadow cast directly onto card surface */}
        <ellipse cx={0} cy={1.5} rx={7} ry={3} fill="rgba(0,0,0,0.18)" />

        {/* Outer Braided Rope Loops (Figure-eight rope knot) */}
        {/* Left Bight */}
        <path
          d="M 0,-1 C -4.5,-4 -7.5,-1.5 -6,2 C -4.5,5.5 -1.5,4 0,1.5"
          fill="none"
          stroke="#991B1B"
          strokeWidth={2.8}
          strokeLinecap="round"
        />
        <path
          d="M 0,-1 C -4.5,-4 -7.5,-1.5 -6,2 C -4.5,5.5 -1.5,4 0,1.5"
          fill="none"
          stroke="#DC2626"
          strokeWidth={2.0}
          strokeLinecap="round"
        />
        <path
          d="M -1,-0.5 C -4,-3 -6,-1 -5,1.5"
          fill="none"
          stroke="#F87171"
          strokeWidth={0.8}
          strokeLinecap="round"
        />

        {/* Right Bight */}
        <path
          d="M 0,-1 C 4.5,-4 7.5,-1.5 6,2 C 4.5,5.5 1.5,4 0,1.5"
          fill="none"
          stroke="#991B1B"
          strokeWidth={2.8}
          strokeLinecap="round"
        />
        <path
          d="M 0,-1 C 4.5,-4 7.5,-1.5 6,2 C 4.5,5.5 1.5,4 0,1.5"
          fill="none"
          stroke="#DC2626"
          strokeWidth={2.0}
          strokeLinecap="round"
        />
        <path
          d="M 1,-0.5 C 4,-3 6,-1 5,1.5"
          fill="none"
          stroke="#F87171"
          strokeWidth={0.8}
          strokeLinecap="round"
        />

        {/* Central Rope Turn */}
        <path
          d="M -3.5,0.5 Q 0,2 3.5,0.5"
          fill="none"
          stroke="#7F1D1D"
          strokeWidth={3.0}
          strokeLinecap="round"
        />
        <path
          d="M -3.5,0.5 Q 0,2 3.5,0.5"
          fill="none"
          stroke="#B91C1C"
          strokeWidth={2.2}
          strokeLinecap="round"
        />

        {/* Golden Cord Seizing Wrap (Binding the rope knot tightly) */}
        <rect
          x={-2.2}
          y={-1.2}
          width={4.4}
          height={3.2}
          rx={1.5}
          fill="#D97706"
          stroke="#78350F"
          strokeWidth={0.5}
        />
        <line x1={-1.5} y1={-0.5} x2={1.5} y2={-0.5} stroke="#FEF3C7" strokeWidth={0.6} />
        <line x1={-1.5} y1={0.8} x2={1.5} y2={0.8} stroke="#FEF3C7" strokeWidth={0.6} />

        {/* Rope Cord Tails (Frayed strand tips tagging onto the card surface) */}
        {/* Left Tail */}
        <path
          d="M -1.8,2 C -2.8,4.5 -4.2,6 -4.8,8.5"
          fill="none"
          stroke="#991B1B"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <path
          d="M -1.8,2 C -2.8,4.5 -4.2,6 -4.8,8.5"
          fill="none"
          stroke="#EF4444"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        <line x1={-4.8} y1={8.5} x2={-5.6} y2={9.6} stroke="#F87171" strokeWidth={0.6} strokeLinecap="round" />
        <line x1={-4.8} y1={8.5} x2={-4.2} y2={9.8} stroke="#FCA5A5" strokeWidth={0.6} strokeLinecap="round" />

        {/* Right Tail */}
        <path
          d="M 1.8,2 C 2.8,4.5 4.2,6 4.8,8.5"
          fill="none"
          stroke="#991B1B"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <path
          d="M 1.8,2 C 2.8,4.5 4.2,6 4.8,8.5"
          fill="none"
          stroke="#EF4444"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        <line x1={4.8} y1={8.5} x2={4.2} y2={9.8} stroke="#F87171" strokeWidth={0.6} strokeLinecap="round" />
        <line x1={4.8} y1={8.5} x2={5.6} y2={9.6} stroke="#FCA5A5" strokeWidth={0.6} strokeLinecap="round" />

        {/* Center Tag Seal Ring (Golden eyelet grommet) */}
        <circle cx={0} cy={0.4} r={1.6} fill="#F59E0B" stroke="#92400E" strokeWidth={0.4} />
        <circle cx={0} cy={0.4} r={0.6} fill="#FFFBEB" />
      </g>
    </g>
  );
}

/**
 * Sacred Golden Ring-Bottom Knot.
 * Tied directly to the bottom rim/corner of the circular metal ring band
 * (like an actual physical ring where thread loops through the metal circle at the bottom,
 * completely outside the avatar/photo face).
 */
function RingBottomKnot({
  x,
  y,
  isRightSide = false,
  ring,
}: {
  x: number;
  y: number;
  isRightSide?: boolean;
  ring?: RingStyle;
}) {
  // Angle tilt: Left ring knot tilts slightly right (angle towards partner), Right ring knot tilts slightly left
  const rot = isRightSide ? 14 : -14;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g transform={`rotate(${rot})`}>
        {/* Soft contact shadow strictly under the tied knot */}
        <ellipse cx={0} cy={3.0} rx={4.5} ry={2.2} fill="rgba(0,0,0,0.22)" />

        {/* Outer Loop wrapping around the bottom rim of the metal ring band (all y >= 0) */}
        <path
          d="M -3.2,0 C -3.5,3.2 3.5,3.2 3.2,0"
          fill="none"
          stroke="#78350F"
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <path
          d="M -3.2,0 C -3.5,3.2 3.5,3.2 3.2,0"
          fill="none"
          stroke="#D97706"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <path
          d="M -3.2,0 C -3.5,3.2 3.5,3.2 3.2,0"
          fill="none"
          stroke="#F59E0B"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        <path
          d="M -3,0 C -3,2.8 3,2.8 3,0"
          fill="none"
          stroke="#FEF3C7"
          strokeWidth={0.6}
          strokeDasharray="1.5 1.5"
          strokeLinecap="round"
        />

        {/* Central Knotted Hitch Turn (Seizing wrap securely binding the thread under the ring) */}
        <ellipse
          cx={0}
          cy={3.0}
          rx={3.0}
          ry={1.8}
          fill="#B45309"
          stroke="#78350F"
          strokeWidth={0.6}
        />
        <ellipse
          cx={0}
          cy={3.0}
          rx={2.2}
          ry={1.2}
          fill="#F59E0B"
        />
        <circle cx={-0.3} cy={2.8} r={0.6} fill="#FEF3C7" />

        {/* Small Dangling Tied Thread Tail (free end of the tied dhaga knot hanging downwards) */}
        <path
          d="M -0.6,4.5 Q -1.6,7.2 -2.2,9.5"
          fill="none"
          stroke="#78350F"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <path
          d="M -0.6,4.5 Q -1.6,7.2 -2.2,9.5"
          fill="none"
          stroke="#F59E0B"
          strokeWidth={1.0}
          strokeLinecap="round"
        />
        <line x1={-2.2} y1={9.5} x2={-2.6} y2={10.8} stroke="#FEF3C7" strokeWidth={0.6} strokeLinecap="round" />
        <line x1={-2.2} y1={9.5} x2={-1.8} y2={11.0} stroke="#FDE68A" strokeWidth={0.6} strokeLinecap="round" />
      </g>
    </g>
  );
}

/**
 * Organic, continuous curvy bloodline router:
 * 100% smooth flowing Bezier arcs with rounded twists and zero sharp edges.
 * Routes through the inter-row gap clearance so it NEVER cuts across card text.
 */
function routeTangleFreeChildLine(
  junc: { x: number; y: number },
  to: { x: number; y: number },
  cx: number,
  is2Col: boolean,
  isMultiRow: boolean,
  isLeftCol: boolean
): string {
  const dx = to.x - junc.x;
  const dy = Math.max(18, to.y - junc.y);

  if (!is2Col) {
    // Wide canvas mode: Organic sweeping cubic curve with generous rounded twist
    const twist = (dx >= 0 ? 1 : -1) * Math.min(24, Math.max(8, Math.abs(dx) * 0.16));
    const cp1x = junc.x + twist;
    const cp1y = junc.y + dy * 0.44;
    const cp2x = to.x - twist * 0.5;
    const cp2y = to.y - dy * 0.46;
    return `M ${junc.x} ${junc.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
  }

  const outDir = isLeftCol ? -1 : 1;

  if (!isMultiRow) {
    // Single-row mobile: Sweeps gracefully outward through inter-row airspace ABOVE card,
    // looping into destination corner from the outer flank so it NEVER touches card text
    const outerOvershoot = to.x + outDir * 8; // Gentle rounded twist/forward extension
    const cp1x = junc.x + outDir * Math.min(26, Math.abs(dx) * 0.35);
    const cp1y = junc.y + dy * 0.22;
    const cp2x = outerOvershoot;
    const cp2y = to.y - Math.min(22, dy * 0.45);
    return `M ${junc.x} ${junc.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
  }

  // Multi-row mobile: Travels through central clear corridor (laneX), then sweeps through
  // the empty inter-row clearance above the destination card without crossing Row 1 or card text.
  const laneX = isLeftCol ? cx - 4 : cx + 4;
  const breakY = Math.max(junc.y + 24, to.y - 18); // Inter-row gap directly above destination row

  // Part 1: Descent down central corridor with gentle organic wave
  const waveTwist = outDir * 5;
  const c1x = junc.x + waveTwist;
  const c1y = junc.y + (breakY - junc.y) * 0.4;
  const c2x = laneX - waveTwist * 0.3;
  const c2y = breakY - (breakY - junc.y) * 0.35;

  // Part 2: Outward sweep through empty inter-row gap into destination corner knot
  const outerOvershoot = to.x + outDir * 8;
  const c3x = laneX + outDir * Math.min(28, Math.abs(to.x - laneX) * 0.35);
  const c3y = breakY + 3;
  const c4x = outerOvershoot;
  const c4y = to.y - 14;

  return `M ${junc.x} ${junc.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${laneX} ${breakY} C ${c3x} ${c3y}, ${c4x} ${c4y}, ${to.x} ${to.y}`;
}

function getRelationshipStyle(relTag = "", sex?: string | null) {
  const t = relTag.toLowerCase();
  if (t.includes("पिता") || t.includes("माता") || t.includes("father") || t.includes("mother")) {
    return {
      color: "#4F46E5",
      marker: "url(#arrow-indigo)",
      bg: "#EEF2FF",
      border: "#4F46E5",
      text: "#3730A3",
    };
  }
  if (t.includes("भतीज") || t.includes("भांज") || t.includes("niece") || t.includes("nephew")) {
    return {
      color: "#0284C7",
      marker: "url(#arrow-sky)",
      bg: "#F0F9FF",
      border: "#0284C7",
      text: "#075985",
    };
  }
  if (t.includes("पोत") || t.includes("नात") || t.includes("grandchild")) {
    return {
      color: "#7C3AED",
      marker: "url(#arrow-purple)",
      bg: "#FAF5FF",
      border: "#7C3AED",
      text: "#581C87",
    };
  }
  if (t.includes("बेटी") || t.includes("पुत्री") || t.includes("daughter") || sex === "F") {
    return {
      color: "#E11D48",
      marker: "url(#arrow-rose)",
      bg: "#FFF1F2",
      border: "#E11D48",
      text: "#9F1239",
    };
  }
  return {
    color: "#D97706",
    marker: "url(#arrow-gold)",
    bg: "#FFFBEB",
    border: "#D97706",
    text: "#92400E",
  };
}

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

function nameW(name: string, max = 175) {
  const clean = (name || "?").replace(/^(स्व\.|late|sw\.)\s*/i, "");
  return Math.min(max, Math.max(140, Math.round(Math.max(clean.length, 3) * 7.4 + 65)));
}

type IndianRoleItem = {
  icon: string;
  badge: string;
  title: string;
  detail?: string;
};

type IndianRelationshipInfo = {
  shortTag: string;
  shortTagEn: string;
  subTag?: string;
  primaryTitle: string;
  primaryTitleEn: string;
  category: "self" | "spouse" | "sibling" | "parent" | "child" | "grandparent" | "grandchild" | "relative";
  generationTier: number; // 3: Great-GP, 2: GP, 1: Parents/Uncles, 0: Self/Spouse/Siblings/Bhabhi/Jija, -1: Children/Bahu/Damaad/Bhatija/Bhanja, -2: Grandchildren, -3: Great-Grandchildren
  generationLabel: string;
  multipleRoles: IndianRoleItem[];
};

function resolveIndianRelationship(
  n: Node,
  tree: Tree | null,
  lang = "hi"
): IndianRelationshipInfo {
  const isHi = lang === "hi";

  if (!tree) {
    return {
      shortTag: n.display_name,
      shortTagEn: n.display_name,
      primaryTitle: n.display_name,
      primaryTitleEn: n.display_name,
      category: "relative",
      generationTier: 0,
      generationLabel: isHi ? "परिवार सदस्य" : "Family Member",
      multipleRoles: [],
    };
  }

  // 1. Build complete indexed graph of nodes and connections
  const allNodes = new Map<string, Node>();
  allNodes.set(tree.centre.id, { ...tree.centre, relation: "self" });
  (tree.parents || []).forEach((m) => allNodes.set(m.id, m));
  (tree.spouses || []).forEach((m) => allNodes.set(m.id, m));
  (tree.siblings || []).forEach((m) => allNodes.set(m.id, m));
  (tree.children || []).forEach((m) => allNodes.set(m.id, m));
  (tree.grandparents || []).forEach((m) => allNodes.set(m.id, m));
  (tree.grandchildren || []).forEach((m) => allNodes.set(m.id, m));
  (tree.uncles_and_aunts || []).forEach((m) => allNodes.set(m.id, m));
  (tree.levels_up || []).flat().forEach((m) => allNodes.set(m.id, m));
  (tree.levels_down || []).flat().forEach((m) => allNodes.set(m.id, m));
  if (tree.spouses_of) {
    Object.values(tree.spouses_of).flat().forEach((m) => allNodes.set(m.id, m));
  }
  if (tree.siblings_of) {
    Object.values(tree.siblings_of).flat().forEach((m) => allNodes.set(m.id, m));
  }
  if (tree.children_of) {
    Object.values(tree.children_of).flat().forEach((m) => allNodes.set(m.id, m));
  }

  const spouseMap = new Map<string, Set<string>>();
  const linkSpouse = (a: string, b: string) => {
    if (!a || !b || a === b) return;
    if (!spouseMap.has(a)) spouseMap.set(a, new Set());
    if (!spouseMap.has(b)) spouseMap.set(b, new Set());
    spouseMap.get(a)!.add(b);
    spouseMap.get(b)!.add(a);
  };

  (tree.spouses || []).forEach((s) => linkSpouse(tree.centre.id, s.id));
  if (tree.spouses_of) {
    Object.entries(tree.spouses_of).forEach(([ownerId, list]) => {
      list.forEach((s) => linkSpouse(ownerId, s.id));
    });
  }
  allNodes.forEach((node) => {
    if (node.relation === "spouse" && node.via_id) {
      linkSpouse(node.via_id, node.id);
    }
  });

  const childrenMap = new Map<string, Set<string>>();
  const parentsMap = new Map<string, Set<string>>();
  const linkParentChild = (parentId: string, childId: string) => {
    if (!parentId || !childId || parentId === childId) return;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, new Set());
    if (!parentsMap.has(childId)) parentsMap.set(childId, new Set());
    childrenMap.get(parentId)!.add(childId);
    parentsMap.get(childId)!.add(parentId);
  };

  (tree.parents || []).forEach((p) => {
    linkParentChild(p.id, tree.centre.id);
    (tree.siblings || []).forEach((s) => linkParentChild(p.id, s.id));
    if (tree.siblings_of?.[tree.centre.id]) {
      tree.siblings_of[tree.centre.id].forEach((s) => linkParentChild(p.id, s.id));
    }
    (tree.children_of?.[p.id] || []).forEach((s) => {
      if (s.id !== tree.centre.id) linkParentChild(p.id, s.id);
    });
  });

  (tree.children || []).forEach((c) => {
    linkParentChild(tree.centre.id, c.id);
    (tree.spouses || []).forEach((s) => linkParentChild(s.id, c.id));
  });

  (tree.levels_up || []).forEach((lvl) => {
    lvl.forEach((node) => {
      const childId = node.via_id || node.via_parent_id;
      if (childId) linkParentChild(node.id, childId);
    });
  });

  (tree.levels_down || []).forEach((lvl) => {
    lvl.forEach((node) => {
      const parentId = node.via_id || node.via_child_id;
      if (parentId) {
        linkParentChild(parentId, node.id);
        const sps = spouseMap.get(parentId);
        if (sps) sps.forEach((spId) => linkParentChild(spId, node.id));
      }
    });
  });

  const directCentreChildren = new Set((tree.children || []).map((c) => c.id));

  if (tree.children_of) {
    Object.entries(tree.children_of).forEach(([parentId, list]) => {
      list.forEach((c) => {
        linkParentChild(parentId, c.id);
        const sps = spouseMap.get(parentId);
        if (sps) {
          sps.forEach((spId) => {
            // Only link to centre if centre actually has this child in tree.children
            if (spId === tree.centre.id) {
              if (directCentreChildren.has(c.id)) {
                linkParentChild(spId, c.id);
              }
            } else {
              linkParentChild(spId, c.id);
            }
          });
        }
      });
    });
  }

  if (tree.uncles_and_aunts) {
    tree.uncles_and_aunts.forEach((u) => {
      if (u.via_id) linkParentChild(u.via_id, u.id);
    });
  }

  const siblingsMap = new Map<string, Set<string>>();
  const linkSibling = (a: string, b: string) => {
    if (!a || !b || a === b) return;
    if (!siblingsMap.has(a)) siblingsMap.set(a, new Set());
    if (!siblingsMap.has(b)) siblingsMap.set(b, new Set());
    siblingsMap.get(a)!.add(b);
    siblingsMap.get(b)!.add(a);
  };

  (tree.siblings || []).forEach((s) => linkSibling(tree.centre.id, s.id));
  if (tree.siblings_of) {
    Object.entries(tree.siblings_of).forEach(([ownerId, list]) => {
      list.forEach((s) => linkSibling(ownerId, s.id));
    });
  }
  parentsMap.forEach((parentIds, childId) => {
    parentIds.forEach((pId) => {
      const sibs = childrenMap.get(pId);
      if (sibs) {
        sibs.forEach((otherChildId) => {
          if (otherChildId !== childId) linkSibling(childId, otherChildId);
        });
      }
    });
  });

  const centre = tree.centre;
  const targetSex = resolveSex(n.gender, n.relation);
  const centreSex = resolveSex(centre.gender, centre.relation);

  const getPartnerNames = (id: string) =>
    Array.from(spouseMap.get(id) || [])
      .map((pid) => allNodes.get(pid)?.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, ""))
      .filter(Boolean)
      .join(", ");

  const getChildNames = (id: string) => {
    // For centre, strictly return only active children present in tree.children
    if (id === tree.centre.id) {
      return (tree.children || [])
        .map((c) => c.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, ""))
        .filter(Boolean)
        .join(", ");
    }
    const isSpouseOfCentre = (tree.spouses || []).some((s) => s.id === id);
    return Array.from(childrenMap.get(id) || [])
      .filter((cid) => {
        // If spouse of centre, filter out any children that were deleted from centre
        if (isSpouseOfCentre) {
          return directCentreChildren.has(cid);
        }
        return true;
      })
      .map((cid) => allNodes.get(cid)?.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, ""))
      .filter(Boolean)
      .join(", ");
  };

  const getParentNames = (id: string) =>
    Array.from(parentsMap.get(id) || [])
      .map((pid) => allNodes.get(pid)?.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, ""))
      .filter(Boolean)
      .join(" व ");

  const getSiblingNames = (id: string) =>
    Array.from(siblingsMap.get(id) || [])
      .map((sid) => allNodes.get(sid)?.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, ""))
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");

  const father = (tree.parents || []).find(
    (p) => p.relation === "father" || resolveSex(p.gender, p.relation) === "M"
  );
  const mother = (tree.parents || []).find(
    (p) => p.relation === "mother" || resolveSex(p.gender, p.relation) === "F"
  );

  const paternalGrandfather = (tree.grandparents || []).find(
    (g) => (g.via_id === father?.id || g.via_parent_id === father?.id) && resolveSex(g.gender, g.relation) === "M"
  );
  const paternalGrandmother = (tree.grandparents || []).find(
    (g) => (g.via_id === father?.id || g.via_parent_id === father?.id) && resolveSex(g.gender, g.relation) === "F"
  );

  const maternalGrandfather = (tree.grandparents || []).find(
    (g) => (g.via_id === mother?.id || g.via_parent_id === mother?.id) && resolveSex(g.gender, g.relation) === "M"
  );
  const maternalGrandmother = (tree.grandparents || []).find(
    (g) => (g.via_id === mother?.id || g.via_parent_id === mother?.id) && resolveSex(g.gender, g.relation) === "F"
  );

  // Self direct children set
  const selfChildren = new Set<string>();
  (childrenMap.get(centre.id) || []).forEach((id) => selfChildren.add(id));
  (tree.children || []).forEach((c) => selfChildren.add(c.id));
  (tree.spouses || []).forEach((sp) => {
    (childrenMap.get(sp.id) || []).forEach((id) => selfChildren.add(id));
  });
  selfChildren.delete(centre.id);
  if (father) selfChildren.delete(father.id);
  if (mother) selfChildren.delete(mother.id);
  (tree.parents || []).forEach((p) => selfChildren.delete(p.id));
  (tree.siblings || []).forEach((s) => selfChildren.delete(s.id));
  (tree.spouses || []).forEach((s) => selfChildren.delete(s.id));

  // Self siblings set
  const selfSiblings = new Set<string>();
  (siblingsMap.get(centre.id) || []).forEach((id) => selfSiblings.add(id));
  (tree.siblings || []).forEach((s) => selfSiblings.add(s.id));
  (tree.siblings_of?.[centre.id] || []).forEach((s) => selfSiblings.add(s.id));
  if (father) {
    (childrenMap.get(father.id) || []).forEach((id) => {
      if (id !== centre.id && !selfChildren.has(id)) selfSiblings.add(id);
    });
  }
  if (mother) {
    (childrenMap.get(mother.id) || []).forEach((id) => {
      if (id !== centre.id && !selfChildren.has(id)) selfSiblings.add(id);
    });
  }
  selfSiblings.delete(centre.id);
  if (father) selfSiblings.delete(father.id);
  if (mother) selfSiblings.delete(mother.id);
  (tree.parents || []).forEach((p) => selfSiblings.delete(p.id));
  (tree.children || []).forEach((c) => selfSiblings.delete(c.id));
  (tree.spouses || []).forEach((s) => selfSiblings.delete(s.id));
  (tree.grandparents || []).forEach((g) => selfSiblings.delete(g.id));
  (tree.grandchildren || []).forEach((gc) => selfSiblings.delete(gc.id));

  // Father siblings set (Tau, Chacha, Bua)
  const fatherSiblings = new Set<string>();
  if (father) {
    (siblingsMap.get(father.id) || []).forEach((id) => fatherSiblings.add(id));
    (tree.siblings_of?.[father.id] || []).forEach((s) => fatherSiblings.add(s.id));
    if (paternalGrandfather) {
      (childrenMap.get(paternalGrandfather.id) || []).forEach((id) => {
        if (id !== father.id && id !== centre.id) fatherSiblings.add(id);
      });
    }
  }
  fatherSiblings.delete(centre.id);
  if (father) fatherSiblings.delete(father.id);
  if (mother) fatherSiblings.delete(mother.id);

  // Mother siblings set (Mama, Mausi)
  const motherSiblings = new Set<string>();
  if (mother) {
    (siblingsMap.get(mother.id) || []).forEach((id) => motherSiblings.add(id));
    (tree.siblings_of?.[mother.id] || []).forEach((s) => motherSiblings.add(s.id));
    if (maternalGrandfather) {
      (childrenMap.get(maternalGrandfather.id) || []).forEach((id) => {
        if (id !== mother.id && id !== centre.id) motherSiblings.add(id);
      });
    }
  }
  motherSiblings.delete(centre.id);
  if (father) motherSiblings.delete(father.id);
  if (mother) motherSiblings.delete(mother.id);

  // Helper to construct multiple roles
  const buildMultipleRoles = (
    primaryBadge: string,
    primaryDesc: string,
    tierLabel: string,
    tierNum: number
  ): IndianRoleItem[] => {
    const roles: IndianRoleItem[] = [];

    // 1. Primary Relation
    roles.push({
      icon: "⭐",
      badge: isHi ? "मुख्य पारिवारिक संबंध" : "Primary Relation",
      title: primaryBadge,
      detail: primaryDesc,
    });

    // 2. Marital Bond
    const partners = getPartnerNames(n.id);
    if (partners) {
      roles.push({
        icon: "💍",
        badge: isHi ? "वैवाहिक संबंध" : "Marital Bond",
        title: isHi
          ? `${partners} के ${targetSex === "F" ? "धर्मपत्नी (Wife)" : "पति (Husband)"}`
          : `${targetSex === "F" ? "Wife" : "Husband"} of ${partners}`,
        detail: isHi ? "पारिवारिक दांपत्य जीवन" : "Marital partner in the family",
      });
    }

    // 3. Parents Bond
    const parents = getParentNames(n.id);
    if (parents) {
      roles.push({
        icon: "👨‍👩‍👧",
        badge: isHi ? "संतान की भूमिका" : "Child Role",
        title: isHi
          ? `${parents} के ${targetSex === "F" ? "सुपुत्री (Daughter)" : "सुपुत्र (Son)"}`
          : `${targetSex === "F" ? "Daughter" : "Son"} of ${parents}`,
        detail: isHi ? "माता-पिता की संतान" : "Child of respected parents",
      });
    }

    // 4. Parental Role (Children)
    const children = getChildNames(n.id);
    if (children) {
      roles.push({
        icon: "👶",
        badge: isHi ? "माता/पिता की भूमिका" : "Parent Role",
        title: isHi
          ? `${children} के ${targetSex === "F" ? "माता जी (Mother)" : "पिता जी (Father)"}`
          : `${targetSex === "F" ? "Mother" : "Father"} of ${children}`,
        detail: isHi ? "संतान के पूज्य अभिभावक" : "Guardian of children",
      });
    }

    // 5. Siblings
    const siblings = getSiblingNames(n.id);
    if (siblings) {
      roles.push({
        icon: "👫",
        badge: isHi ? "सहोदर रिश्ता" : "Sibling Bond",
        title: isHi
          ? `${siblings} के ${targetSex === "F" ? "बहन (Sister)" : "भाई (Brother)"}`
          : `${targetSex === "F" ? "Sister" : "Brother"} of ${siblings}`,
        detail: isHi ? "सहोदर भाई-बहन का अटूट स्नेह" : "Sibling bond in family",
      });
    }

    // 6. Generation Tier
    roles.push({
      icon: "🏛️",
      badge: isHi ? "पीढ़ीगत स्थिति" : "Generation Tier",
      title: `${tierLabel} (${tierNum >= 0 ? `Tier +${tierNum}` : `Tier ${tierNum}`})`,
      detail: isHi
        ? "वंशावली पदानुक्रम में इस सदस्य का पीढ़ीगत स्थान"
        : "Generational standing in the family tree hierarchy",
    });

    return roles;
  };

  // -------------------------------------------------------------
  // 1. SELF (Vanshawali Center)
  // -------------------------------------------------------------
  if (n.id === centre.id || n.relation === "self") {
    const tierLabel = isHi ? "आपकी पीढ़ी (Self)" : "Your Generation (Self)";
    return {
      shortTag: isHi ? "स्वयं" : "Self",
      shortTagEn: "Self",
      primaryTitle: isHi ? "आप स्वयं (मुख्य वंशावली प्रोफाइल)" : "You (Self / Main Profile)",
      primaryTitleEn: "You (Self / Main Profile)",
      category: "self",
      generationTier: 0,
      generationLabel: tierLabel,
      multipleRoles: buildMultipleRoles(
        isHi ? "वंशावली केंद्र (Family Tree Center)" : "Family Tree Center",
        isHi ? "इस वंशावली के मुख्य आधार व केंद्र बिंदु" : "Center of this family tree",
        tierLabel,
        0
      ),
    };
  }

  // -------------------------------------------------------------
  // 2. DIRECT GRANDPARENTS (Dada / Dadi / Nana / Nani) - Tier +2
  // HIGHEST PRIORITY: Must evaluate before Direct Parents so grandparents (father/mother of parents)
  // are NEVER misclassified as direct parents of self!
  // -------------------------------------------------------------
  const relLower = (n.relation || "").toLowerCase();
  const nameLower = (n.display_name || "").toLowerCase();

  const isSiblingOfSelf =
    selfSiblings.has(n.id) ||
    (tree.siblings || []).some((s) => s.id === n.id) ||
    (tree.siblings_of?.[centre.id] || []).some((s) => s.id === n.id) ||
    relLower === "sibling" ||
    relLower === "brother" ||
    relLower === "sister" ||
    relLower.includes("bhai") ||
    relLower.includes("behan") ||
    relLower.includes("sahodhar") ||
    ((n.via_id === father?.id || n.via_id === mother?.id) &&
      (n.relation === "child" || n.relation === "sibling") &&
      n.id !== centre.id &&
      !(tree.children || []).some((c) => c.id === n.id) &&
      !selfChildren.has(n.id));

  const isDirectGrandparent =
    !isSiblingOfSelf &&
    ((tree.grandparents || []).some((g) => g.id === n.id) ||
      (tree.levels_up?.[1] || []).some((g) => g.id === n.id) ||
      n.relation === "grandfather" ||
      n.relation === "grandmother" ||
      relLower.includes("dada") ||
      relLower.includes("dadi") ||
      relLower.includes("nana") ||
      relLower.includes("nani") ||
      nameLower.includes("dada") ||
      nameLower.includes("dadi") ||
      nameLower.includes("nana") ||
      nameLower.includes("nani") ||
      (father && (parentsMap.get(father.id)?.has(n.id) || father.via_id === n.id || father.via_parent_id === n.id)) ||
      (mother && (parentsMap.get(mother.id)?.has(n.id) || mother.via_id === n.id || mother.via_parent_id === n.id)));
  const isGrandparent = isDirectGrandparent;

  if (isGrandparent) {
    const isExplicitMaternal =
      relLower.includes("nana") ||
      relLower.includes("nani") ||
      nameLower.includes("nana") ||
      nameLower.includes("nani") ||
      relLower.includes("maternal");
    const isExplicitPaternal =
      relLower.includes("dada") ||
      relLower.includes("dadi") ||
      nameLower.includes("dada") ||
      nameLower.includes("dadi") ||
      relLower.includes("paternal");

    let isMaternal = false;
    if (isExplicitMaternal) {
      isMaternal = true;
    } else if (isExplicitPaternal) {
      isMaternal = false;
    } else if (mother && (parentsMap.get(mother.id)?.has(n.id) || mother.via_id === n.id)) {
      isMaternal = true;
    } else if (father && (parentsMap.get(father.id)?.has(n.id) || father.via_id === n.id)) {
      isMaternal = false;
    } else {
      const gpAllList = [...(tree.grandparents || []), ...(tree.levels_up?.[1] || [])];
      const males = gpAllList.filter((g) => resolveSex(g.gender, g.relation) === "M");
      const females = gpAllList.filter((g) => resolveSex(g.gender, g.relation) === "F");
      if (targetSex === "M") {
        const mIdx = males.findIndex((g) => g.id === n.id);
        isMaternal = mIdx >= 1;
      } else {
        const fIdx = females.findIndex((g) => g.id === n.id);
        isMaternal = fIdx >= 1;
      }
    }

    const isFemale = targetSex === "F" || n.relation === "grandmother" || relLower.includes("dadi") || relLower.includes("nani") || nameLower.includes("dadi") || nameLower.includes("nani");

    let shortTag = "";
    let subTag = "";
    let primaryTitle = "";

    if (isMaternal) {
      shortTag = isFemale ? (isHi ? "नानी जी" : "Nani ji") : (isHi ? "नाना जी" : "Nana ji");
      subTag = isFemale ? (isHi ? "माताजी की माता" : "Mother's Mother") : (isHi ? "माताजी के पिता" : "Mother's Father");
      primaryTitle = isFemale
        ? (isHi ? "आपकी पूज्य नानी जी (माताजी की माता)" : "Your Respected Maternal Grandmother")
        : (isHi ? "आपके पूज्य नाना जी (माताजी के पिता)" : "Your Respected Maternal Grandfather");
    } else {
      shortTag = isFemale ? (isHi ? "दादी जी" : "Dadi ji") : (isHi ? "दादा जी" : "Dada ji");
      subTag = isFemale ? (isHi ? "पिताजी की माता" : "Father's Mother") : (isHi ? "पिताजी के पिता" : "Father's Father");
      primaryTitle = isFemale
        ? (isHi ? "आपकी पूज्य दादी जी (पिताजी की माता)" : "Your Respected Paternal Grandmother")
        : (isHi ? "आपके पूज्य दादा जी (पिताजी के पिता)" : "Your Respected Paternal Grandfather");
    }

    const tierLabel = isHi ? "दादा जी, दादी जी एवं नाना जी, नानी जी पीढ़ी" : "Grandparents (Dada ji - Dadi ji & Nana ji - Nani ji)";

    return {
      shortTag,
      shortTagEn: isFemale ? (isMaternal ? "Maternal Grandmother" : "Grandmother") : (isMaternal ? "Maternal Grandfather" : "Grandfather"),
      subTag,
      primaryTitle,
      primaryTitleEn: primaryTitle,
      category: "grandparent",
      generationTier: 2,
      generationLabel: tierLabel,
      multipleRoles: buildMultipleRoles(
        primaryTitle,
        isHi ? `${subTag} के रूप में परिवार के वरिष्ठतम पूज्य बुजुर्ग` : "Respected elders of family",
        tierLabel,
        2
      ),
    };
  }

  // -------------------------------------------------------------
  // 3. DIRECT PARENTS (Father / Mother) - Tier +1
  // -------------------------------------------------------------
  const isDirectParent =
    !isGrandparent &&
    !isSiblingOfSelf &&
    ((tree.parents || []).some((p) => p.id === n.id) ||
     parentsMap.get(centre.id)?.has(n.id) ||
     (tree.levels_up?.[0] || []).some((p) => p.id === n.id) ||
     ((n.relation === "father" || n.relation === "mother") && (!n.via_id || n.via_id === centre.id)));

  if (isDirectParent) {
    const isMother = targetSex === "F" || n.relation === "mother";
    const shortTag = isMother ? (isHi ? "माता जी" : "Mother") : (isHi ? "पिता जी" : "Father");
    const subTag = isMother ? (isHi ? "पूज्य माता" : "Mother") : (isHi ? "पूज्य पिता" : "Father");
    const primaryTitle = isMother
      ? (isHi ? "आपकी पूज्य माता जी (Mother)" : "Your Respected Mother")
      : (isHi ? "आपके पूज्य पिता जी (Father)" : "Your Respected Father");
    const tierLabel = isHi ? "माता-पिता की पीढ़ी (Parents)" : "Parents Generation";

    return {
      shortTag,
      shortTagEn: isMother ? "Mother" : "Father",
      subTag,
      primaryTitle,
      primaryTitleEn: primaryTitle,
      category: "parent",
      generationTier: 1,
      generationLabel: tierLabel,
      multipleRoles: buildMultipleRoles(
        primaryTitle,
        isHi ? "आपके पूज्य जन्मदाता एवं वरिष्ठ अभिभावक" : "Your respected parent and guardian",
        tierLabel,
        1
      ),
    };
  }

  // -------------------------------------------------------------
  // 3. DIRECT SPOUSE OF SELF (Wife / Husband)
  // -------------------------------------------------------------
  const isDirectSpouse =
    spouseMap.get(centre.id)?.has(n.id) ||
    (tree.spouses || []).some((s) => s.id === n.id) ||
    (n.relation === "spouse" && (!n.via_id || n.via_id === centre.id));

  if (isDirectSpouse) {
    const isWife = targetSex === "F" || centreSex === "M";
    const shortTag = isWife ? (isHi ? "धर्मपत्नी" : "Wife") : (isHi ? "पति" : "Husband");
    const primaryTitle = isWife ? (isHi ? "आपकी धर्मपत्नी (Wife)" : "Your Wife") : (isHi ? "आपके पति (Husband)" : "Your Husband");
    const tierLabel = isHi ? "आपकी पीढ़ी (जीवनसाथी)" : "Your Generation (Spouse)";

    return {
      shortTag,
      shortTagEn: isWife ? "Wife" : "Husband",
      primaryTitle,
      primaryTitleEn: isWife ? "Your Wife" : "Your Husband",
      category: "spouse",
      generationTier: 0,
      generationLabel: tierLabel,
      multipleRoles: buildMultipleRoles(
        primaryTitle,
        isHi ? "आपकी अर्धांगिनी / जीवनसाथी के रूप में समान पीढ़ी का सर्वोच्च आदरणीय संबंध" : "Your life partner in the same generation tier",
        tierLabel,
        0
      ),
    };
  }

  // -------------------------------------------------------------
  // 4. DIRECT CHILD OF SELF (Son / Daughter)
  // -------------------------------------------------------------
  const isDirectChild =
    (tree.children || []).some((c) => c.id === n.id) ||
    selfChildren.has(n.id) ||
    (n.relation === "child" && (!n.via_id || n.via_id === centre.id || (tree.spouses || []).some((s) => s.id === n.via_id)));

  if (isDirectChild) {
    const isDaughter = targetSex === "F";
    const shortTag = isDaughter ? (isHi ? "बेटी" : "Daughter") : (isHi ? "बेटा" : "Son");
    const subTag = isDaughter ? (isHi ? "सुपुत्री" : "Daughter") : (isHi ? "सुपुत्र" : "Son");
    const primaryTitle = isDaughter ? (isHi ? "आपकी बेटी / सुपुत्री (Daughter)" : "Your Daughter") : (isHi ? "आपका बेटा / सुपुत्र (Son)" : "Your Son");
    const tierLabel = isHi ? "संतान की पीढ़ी (Direct Lineage)" : "Children Generation (Direct)";

    return {
      shortTag,
      shortTagEn: isDaughter ? "Daughter" : "Son",
      subTag,
      primaryTitle,
      primaryTitleEn: primaryTitle,
      category: "child",
      generationTier: -1,
      generationLabel: tierLabel,
      multipleRoles: buildMultipleRoles(
        primaryTitle,
        isHi ? "आपकी प्रत्यक्ष संतान (प्रथम अधोगामी पीढ़ी)" : "Your direct child",
        tierLabel,
        -1
      ),
    };
  }

  // -------------------------------------------------------------
  // 5. DIRECT SIBLING OF SELF (Brother / Sister)
  // -------------------------------------------------------------
  const isDirectSibling =
    isSiblingOfSelf ||
    (tree.siblings || []).some((s) => s.id === n.id) ||
    selfSiblings.has(n.id) ||
    (n.relation === "sibling" && (!n.via_id || n.via_id === centre.id || n.via_id === father?.id || n.via_id === mother?.id)) ||
    (father && (tree.children_of?.[father.id] || []).some((s) => s.id === n.id)) ||
    (mother && (tree.children_of?.[mother.id] || []).some((s) => s.id === n.id));

  if (isDirectSibling) {
    const cBorn = centre.birth_year || (centre.birth_date ? parseInt(centre.birth_date.slice(0, 4), 10) : null);
    const nBorn = n.birth_year || (n.birth_date ? parseInt(n.birth_date.slice(0, 4), 10) : null);
    const isElder = cBorn && nBorn ? nBorn < cBorn : false;
    const isYounger = cBorn && nBorn ? nBorn > cBorn : false;

    let shortTag = "";
    let primaryTitle = "";

    if (targetSex === "F") {
      if (isElder) {
        shortTag = isHi ? "बड़ी बहन" : "Elder Sister";
        primaryTitle = isHi ? "आपकी बड़ी बहन (Elder Sister)" : "Your Elder Sister";
      } else if (isYounger) {
        shortTag = isHi ? "छोटी बहन" : "Younger Sister";
        primaryTitle = isHi ? "आपकी छोटी बहन (Younger Sister)" : "Your Younger Sister";
      } else {
        shortTag = isHi ? "बहन" : "Sister";
        primaryTitle = isHi ? "आपकी बहन (Sister)" : "Your Sister";
      }
    } else {
      if (isElder) {
        shortTag = isHi ? "बड़े भाई" : "Elder Brother";
        primaryTitle = isHi ? "आपके बड़े भाई (Elder Brother)" : "Your Elder Brother";
      } else if (isYounger) {
        shortTag = isHi ? "छोटे भाई" : "Younger Brother";
        primaryTitle = isHi ? "आपके छोटे भाई (Younger Brother)" : "Your Younger Brother";
      } else {
        shortTag = isHi ? "भाई" : "Brother";
        primaryTitle = isHi ? "आपके भाई (Brother)" : "Your Brother";
      }
    }

    const tierLabel = isHi ? "आपकी पीढ़ी (सहोदर भाई-बहन)" : "Your Generation (Sibling)";

    return {
      shortTag,
      shortTagEn: targetSex === "F" ? "Sister" : "Brother",
      primaryTitle,
      primaryTitleEn: primaryTitle,
      category: "sibling",
      generationTier: 0,
      generationLabel: tierLabel,
      multipleRoles: buildMultipleRoles(
        primaryTitle,
        isHi ? "एक ही माता-पिता की संतान के रूप में सहोदर संबंध" : "Direct blood sibling sharing parents",
        tierLabel,
        0
      ),
    };
  }



  // -------------------------------------------------------------
  // 7. DIRECT GRANDCHILDREN (Pota / Poti / Naati / Naatin)
  // -------------------------------------------------------------
  const isDirectGrandchild =
    (tree.grandchildren || []).some((g) => g.id === n.id) ||
    n.relation === "grandchild" ||
    relLower.includes("pota") ||
    relLower.includes("poti") ||
    relLower.includes("nati") ||
    relLower.includes("naati") ||
    relLower.includes("natin") ||
    (tree.levels_down?.[1] || []).some((g) => g.id === n.id);

  if (isDirectGrandchild) {
    const parNode = allNodes.get(n.via_id || n.via_child_id || "");
    const parSex = resolveSex(parNode?.gender, parNode?.relation);
    const isExplicitMaternalGc = relLower.includes("nati") || relLower.includes("naati") || relLower.includes("natin");
    const isExplicitPaternalGc = relLower.includes("pota") || relLower.includes("poti");
    const isMaternalGc = isExplicitMaternalGc || (!isExplicitPaternalGc && parSex === "F");
    const isFemale = targetSex === "F" || relLower.includes("poti") || relLower.includes("natin");

    let shortTag = "";
    let subTag = "";
    let primaryTitle = "";

    if (isMaternalGc) {
      shortTag = isFemale ? (isHi ? "नातिन" : "Naatin") : (isHi ? "नाती" : "Naati");
      subTag = isFemale ? (isHi ? "बेटी की बेटी" : "Daughter's Daughter") : (isHi ? "बेटी का बेटा" : "Daughter's Son");
      primaryTitle = isFemale ? (isHi ? "आपकी नातिन (सुपुत्री की पुत्री)" : "Your Maternal Granddaughter") : (isHi ? "आपका नाती (सुपुत्री का पुत्र)" : "Your Maternal Grandson");
    } else {
      shortTag = isFemale ? (isHi ? "पोती" : "Poti") : (isHi ? "पोता" : "Pota");
      subTag = isFemale ? (isHi ? "बेटे की बेटी" : "Son's Daughter") : (isHi ? "बेटे का बेटा" : "Son's Son");
      primaryTitle = isFemale ? (isHi ? "आपकी पोती / पौत्री" : "Your Granddaughter") : (isHi ? "आपका पोता / पौत्र" : "Your Grandson");
    }

    const tierLabel = isHi ? "पोता-पोती व नाती-नातिन पीढ़ी" : "Grandchildren Generation";

    return {
      shortTag,
      shortTagEn: isFemale ? "Granddaughter" : "Grandson",
      subTag,
      primaryTitle,
      primaryTitleEn: primaryTitle,
      category: "grandchild",
      generationTier: -2,
      generationLabel: tierLabel,
      multipleRoles: buildMultipleRoles(
        primaryTitle,
        isHi ? `${subTag} के रूप में परिवार की तीसरी पीढ़ी की संतान` : "Third generation descendant",
        tierLabel,
        -2
      ),
    };
  }

  // -------------------------------------------------------------
  // 8. SPOUSE OF DIRECT CHILD (Bahu / Damaad / Jawai)
  // -------------------------------------------------------------
  const isExplicitChildSpouse = relLower.includes("bahu") || relLower.includes("damad") || relLower.includes("damaad") || relLower.includes("jawai");
  const marriedChildId = Array.from(spouseMap.get(n.id) || []).find((pId) => selfChildren.has(pId)) ||
    (isExplicitChildSpouse && selfChildren.has(n.via_id || "") ? n.via_id : undefined);

  if ((marriedChildId || isExplicitChildSpouse) && !isDirectParent) {
    const chNode = marriedChildId ? allNodes.get(marriedChildId) : undefined;
    const chSex = resolveSex(chNode?.gender, chNode?.relation);
    const chCleanName = chNode?.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, "") || "";

    const isChildWife =
      relLower.includes("bahu") ||
      relLower.includes("vadhu") ||
      (chSex === "M" && targetSex !== "M") ||
      (targetSex === "F" && chSex !== "F");

    if (isChildWife) {
      // Son's Wife -> BAHU (Daughter-in-law)
      const shortTag = isHi ? "बहू" : "Daughter-in-law";
      const subTag = isHi ? "पुत्र-वधू" : "Son's Wife";
      const primaryTitle = isHi
        ? `आपकी बहू / पुत्र-वधू (${chCleanName ? `${chCleanName} की धर्मपत्नी` : "सुपुत्र की पत्नी"})`
        : `Your Daughter-in-law (${chCleanName ? `Wife of ${chCleanName}` : "Son's Wife"})`;
      const tierLabel = isHi ? "संतान की पीढ़ी (पुत्र-वधू)" : "Children Generation (Daughter-in-law)";

      return {
        shortTag,
        shortTagEn: "Daughter-in-law (Bahu)",
        subTag,
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "child",
        generationTier: -1,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(
          primaryTitle,
          isHi ? `आपके सुपुत्र ${chCleanName} की धर्मपत्नी होने के नाते आपके परिवार की बहू` : `Wife of your son ${chCleanName}`,
          tierLabel,
          -1
        ),
      };
    } else {
      // Daughter's Husband -> DAMAAD / JAWAI (Son-in-law)
      const shortTag = isHi ? "दामाद (जंवाई)" : "Son-in-law (Jawai)";
      const subTag = isHi ? "सुपुत्री के पति" : "Daughter's Husband";
      const primaryTitle = isHi
        ? `आपके दामाद जी / जंवाई (${chCleanName ? `${chCleanName} के पति` : "सुपुत्री के पति"})`
        : `Your Son-in-law (${chCleanName ? `Husband of ${chCleanName}` : "Daughter's Husband"})`;
      const tierLabel = isHi ? "संतान की पीढ़ी (दामाद/जंवाई)" : "Children Generation (Son-in-law)";

      return {
        shortTag,
        shortTagEn: "Son-in-law (Damaad/Jawai)",
        subTag,
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "child",
        generationTier: -1,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(
          primaryTitle,
          isHi ? `आपकी सुपुत्री ${chCleanName} के पति होने के नाते आपके परिवार के दामाद (जंवाई)` : `Husband of your daughter ${chCleanName}`,
          tierLabel,
          -1
        ),
      };
    }
  }

  // -------------------------------------------------------------
  // 9. SPOUSE OF SIBLING (Bhabhi / Jija ji) - STRICT SAFEGUARDS
  // -------------------------------------------------------------
  const marriedSiblingId = Array.from(spouseMap.get(n.id) || []).find((pId) => selfSiblings.has(pId));

  if (marriedSiblingId && !isDirectParent && !isDirectChild && !isDirectSpouse && !isDirectGrandparent && !isDirectSibling) {
    const sibNode = allNodes.get(marriedSiblingId);
    const sibSex = resolveSex(sibNode?.gender, sibNode?.relation);
    const sibCleanName = sibNode?.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, "") || "";
    const cBorn = centre.birth_year || (centre.birth_date ? parseInt(centre.birth_date.slice(0, 4), 10) : null);
    const sBorn = sibNode?.birth_year || (sibNode?.birth_date ? parseInt(sibNode.birth_date.slice(0, 4), 10) : null);
    const isElderSib = cBorn && sBorn ? sBorn < cBorn : false;

    const isSibWife =
      relLower.includes("bhabhi") ||
      relLower.includes("bhabhi_ji") ||
      (sibSex === "M" && targetSex !== "M") ||
      (targetSex === "F" && sibSex !== "F");

    if (isSibWife) {
      // Brother's Wife -> BHABHI
      const shortTag = isElderSib ? (isHi ? "बड़ी भाभी" : "Elder Bhabhi") : (isHi ? "भाभी" : "Bhabhi (Sister-in-law)");
      const primaryTitle = isHi
        ? `आपकी ${isElderSib ? "बड़ी भाभी" : "भाभी"} (${sibCleanName ? `${sibCleanName} की धर्मपत्नी` : "भाई की पत्नी"})`
        : `Your Sister-in-law (${sibCleanName ? `Wife of ${sibCleanName}` : "Brother's Wife"})`;
      const tierLabel = isHi ? "आपकी पीढ़ी (भाभी)" : "Your Generation (Sister-in-law)";

      return {
        shortTag,
        shortTagEn: "Sister-in-law (Bhabhi)",
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "spouse",
        generationTier: 0,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(
          primaryTitle,
          isHi ? `आपके भाई ${sibCleanName} की धर्मपत्नी होने के नाते परिवार में आपकी भाभी` : `Wife of your brother ${sibCleanName}`,
          tierLabel,
          0
        ),
      };
    } else {
      // Sister's Husband -> JIJA JI
      const shortTag = isHi ? "जीजा जी" : "Brother-in-law";
      const primaryTitle = isHi
        ? `आपके जीजा जी / बहनोई (${sibCleanName ? `${sibCleanName} के पति` : "बहन के पति"})`
        : `Your Brother-in-law (${sibCleanName ? `Husband of ${sibCleanName}` : "Sister's Husband"})`;
      const tierLabel = isHi ? "आपकी पीढ़ी (जीजा जी)" : "Your Generation (Brother-in-law)";

      return {
        shortTag,
        shortTagEn: "Brother-in-law (Jija ji)",
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "spouse",
        generationTier: 0,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(
          primaryTitle,
          isHi ? `आपकी बहन ${sibCleanName} के पति होने के नाते परिवार में आपके जीजा जी` : `Husband of your sister ${sibCleanName}`,
          tierLabel,
          0
        ),
      };
    }
  }

  // -------------------------------------------------------------
  // 7. NEPHEWS & NIECES (Children of Brother or Sister)
  // -------------------------------------------------------------
  const parentSibId = Array.from(parentsMap.get(n.id) || []).find((pId) => selfSiblings.has(pId)) ||
    (selfSiblings.has(n.via_id || "") ? n.via_id : undefined);

  if (parentSibId) {
    const sibNode = allNodes.get(parentSibId);
    const sibSex = resolveSex(sibNode?.gender, sibNode?.relation);
    const sibCleanName = sibNode?.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, "") || "";

    if (sibSex === "M") {
      // Brother's Child -> Bhatija / Bhatiji
      const isFemale = targetSex === "F";
      const shortTag = isFemale ? (isHi ? "भतीजी" : "Niece") : (isHi ? "भतीजा" : "Nephew");
      const primaryTitle = isFemale
        ? isHi ? `आपकी भतीजी (${sibCleanName ? `${sibCleanName} की सुपुत्री` : "भाई की पुत्री"})` : `Your Niece (Daughter of ${sibCleanName || "Brother"})`
        : isHi ? `आपका भतीजा (${sibCleanName ? `${sibCleanName} के सुपुत्र` : "भाई का पुत्र"})` : `Your Nephew (Son of ${sibCleanName || "Brother"})`;
      const tierLabel = isHi ? "भतीजे-भतीजी (भाई की संतान)" : "Next Generation (Brother's Children)";

      return {
        shortTag,
        shortTagEn: isFemale ? "Niece" : "Nephew",
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "child",
        generationTier: -1,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(
          primaryTitle,
          isHi ? `आपके भाई ${sibCleanName} की संतान` : `Child of your brother ${sibCleanName}`,
          tierLabel,
          -1
        ),
      };
    } else {
      // Sister's Child -> Bhanja / Bhanji
      const isFemale = targetSex === "F";
      const shortTag = isFemale ? (isHi ? "भांजी" : "Niece") : (isHi ? "भांजा" : "Nephew");
      const primaryTitle = isFemale
        ? isHi ? `आपकी भांजी (${sibCleanName ? `${sibCleanName} की सुपुत्री` : "बहन की पुत्री"})` : `Your Niece (Daughter of ${sibCleanName || "Sister"})`
        : isHi ? `आपका भांजा (${sibCleanName ? `${sibCleanName} के सुपुत्र` : "बहन का पुत्र"})` : `Your Nephew (Son of ${sibCleanName || "Sister"})`;
      const tierLabel = isHi ? "भांजे-भांजी (बहन की संतान)" : "Next Generation (Sister's Children)";

      return {
        shortTag,
        shortTagEn: isFemale ? "Niece" : "Nephew",
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "child",
        generationTier: -1,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(
          primaryTitle,
          isHi ? `आपकी बहन ${sibCleanName} की संतान` : `Child of your sister ${sibCleanName}`,
          tierLabel,
          -1
        ),
      };
    }
  }

  // -------------------------------------------------------------
  // 8. SPOUSE OF NEPHEW / NIECE (Bhatij-bahu, Bhatij-damaad, Bhanj-bahu, Bhanj-damaad)
  // -------------------------------------------------------------
  const nephewNiecePartnerId = Array.from(spouseMap.get(n.id) || []).find((pId) =>
    Array.from(parentsMap.get(pId) || []).some((parId) => selfSiblings.has(parId))
  );

  if (nephewNiecePartnerId) {
    const partnerNode = allNodes.get(nephewNiecePartnerId);
    const partnerParentId = Array.from(parentsMap.get(nephewNiecePartnerId) || []).find((parId) => selfSiblings.has(parId));
    const partnerParentNode = allNodes.get(partnerParentId || "");
    const parentIsBrother = resolveSex(partnerParentNode?.gender, partnerParentNode?.relation) === "M";
    const partnerSex = resolveSex(partnerNode?.gender, partnerNode?.relation);

    if (parentIsBrother) {
      if (partnerSex === "M" || targetSex === "F") {
        const shortTag = isHi ? "भतीज बहू" : "Nephew's Wife";
        const primaryTitle = isHi
          ? `आपकी भतीज बहू (${partnerNode?.display_name || "भतीजे"} की धर्मपत्नी)`
          : `Your Nephew's Wife (${partnerNode?.display_name || "Nephew"}'s Wife)`;
        return {
          shortTag,
          shortTagEn: "Nephew's Wife",
          primaryTitle,
          primaryTitleEn: primaryTitle,
          category: "child",
          generationTier: -1,
          generationLabel: isHi ? "भतीजा-बहू पीढ़ी" : "Next Generation (Nephew In-Law)",
          multipleRoles: buildMultipleRoles(primaryTitle, isHi ? "भतीजे की धर्मपत्नी" : "Wife of your nephew", isHi ? "संतान पीढ़ी" : "Generation -1", -1),
        };
      } else {
        const shortTag = isHi ? "भतीज दामाद" : "Niece's Husband";
        const primaryTitle = isHi
          ? `आपके भतीज दामाद (${partnerNode?.display_name || "भतीजी"} के पति)`
          : `Your Niece's Husband`;
        return {
          shortTag,
          shortTagEn: "Niece's Husband",
          primaryTitle,
          primaryTitleEn: primaryTitle,
          category: "child",
          generationTier: -1,
          generationLabel: isHi ? "भतीजी-दामाद पीढ़ी" : "Next Generation (Niece In-Law)",
          multipleRoles: buildMultipleRoles(primaryTitle, isHi ? "भतीजी के पति" : "Husband of your niece", isHi ? "संतान पीढ़ी" : "Generation -1", -1),
        };
      }
    } else {
      if (partnerSex === "M" || targetSex === "F") {
        const shortTag = isHi ? "भांज बहू" : "Nephew's Wife (Bhanja)";
        const primaryTitle = isHi
          ? `आपकी भांज बहू (${partnerNode?.display_name || "भांजे"} की धर्मपत्नी)`
          : `Your Nephew's Wife`;
        return {
          shortTag,
          shortTagEn: "Nephew's Wife",
          primaryTitle,
          primaryTitleEn: primaryTitle,
          category: "child",
          generationTier: -1,
          generationLabel: isHi ? "भांजा-बहू पीढ़ी" : "Next Generation",
          multipleRoles: buildMultipleRoles(primaryTitle, isHi ? "भांजे की धर्मपत्नी" : "Wife of your nephew", isHi ? "संतान पीढ़ी" : "Generation -1", -1),
        };
      } else {
        const shortTag = isHi ? "भांज दामाद" : "Niece's Husband (Bhanji)";
        const primaryTitle = isHi
          ? `आपके भांज दामाद (${partnerNode?.display_name || "भांजी"} के पति)`
          : `Your Niece's Husband`;
        return {
          shortTag,
          shortTagEn: "Niece's Husband",
          primaryTitle,
          primaryTitleEn: primaryTitle,
          category: "child",
          generationTier: -1,
          generationLabel: isHi ? "भांजी-दामाद पीढ़ी" : "Next Generation",
          multipleRoles: buildMultipleRoles(primaryTitle, isHi ? "भांजी के पति" : "Husband of your niece", isHi ? "संतान पीढ़ी" : "Generation -1", -1),
        };
      }
    }
  }

  // -------------------------------------------------------------
  // 10. SPOUSE OF GRANDCHILD (Pote ki Bahu, Nati ki Bahu, Poti Damaad, Nati Damaad)
  // -------------------------------------------------------------
  const explicitGcSpouse =
    relLower.includes("pota_bahu") ||
    relLower.includes("pote_ki_bahu") ||
    relLower.includes("nati_bahu") ||
    relLower.includes("naati_bahu") ||
    relLower.includes("poti_damad") ||
    relLower.includes("poti_damaad") ||
    relLower.includes("nati_damad") ||
    relLower.includes("natin_damad") ||
    relLower.includes("pautra_vadhu");

  const gcPartnerId =
    Array.from(spouseMap.get(n.id) || []).find((pId) =>
      Array.from(parentsMap.get(pId) || []).some((parId) => selfChildren.has(parId)) ||
      (tree.grandchildren || []).some((g) => g.id === pId) ||
      (tree.levels_down?.[1] || []).some((g) => g.id === pId)
    ) ||
    ((tree.grandchildren || []).some((g) => g.id === n.via_id) ? n.via_id : undefined) ||
    ((tree.levels_down?.[1] || []).some((g) => g.id === n.via_id) ? n.via_id : undefined);

  if (gcPartnerId || explicitGcSpouse) {
    const gcNode = gcPartnerId ? allNodes.get(gcPartnerId) : undefined;
    const gcCleanName = gcNode?.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, "") || "";
    const gcSex = resolveSex(gcNode?.gender, gcNode?.relation);
    const gcParId = gcPartnerId
      ? (Array.from(parentsMap.get(gcPartnerId) || []).find((parId) => selfChildren.has(parId)) || gcNode?.via_id || gcNode?.via_child_id)
      : undefined;
    const gcParNode = allNodes.get(gcParId || "");
    const gcParSex = resolveSex(gcParNode?.gender, gcParNode?.relation);

    const gcRelLower = (gcNode?.relation || "").toLowerCase();
    const isSonBranch =
      relLower.includes("pota") ||
      relLower.includes("poti") ||
      relLower.includes("pautra") ||
      gcRelLower.includes("pota") ||
      gcRelLower.includes("poti") ||
      gcRelLower.includes("pautra") ||
      (!relLower.includes("nati") && !relLower.includes("natin") && !gcRelLower.includes("nati") && !gcRelLower.includes("natin") && gcParSex === "M");

    // Indian Kinship Rule:
    // Poti/Naatin (Female grandchild) -> Her spouse is HUSBAND = "पोती दामाद" or "नातिन दामाद" (NEVER a wife/bahu!)
    // Pota/Naati (Male grandchild) -> His spouse is WIFE = "पोते की बहू" or "नाती की बहू"
    const isGcFemale = gcSex === "F" || gcRelLower.includes("poti") || gcRelLower.includes("natin") || gcRelLower.includes("naatin");
    const isGcMale = gcSex === "M" || gcRelLower.includes("pota") || gcRelLower.includes("nati") || gcRelLower.includes("naati");

    let isWife = false;
    if (relLower.includes("bahu") || relLower.includes("vadhu")) {
      isWife = true;
    } else if (relLower.includes("damad") || relLower.includes("damaad") || relLower.includes("jawai")) {
      isWife = false;
    } else if (targetSex === "M") {
      isWife = false;
    } else if (targetSex === "F") {
      isWife = true;
    } else if (isGcFemale) {
      isWife = false;
    } else if (isGcMale) {
      isWife = true;
    }

    if (isWife) {
      if (isSonBranch) {
        // Pote ki Bahu (Son's Son's Wife)
        const shortTag = isHi ? "पोते की बहू" : "Pote ki Bahu";
        const subTag = isHi ? "पौत्र-वधू (पोते की पत्नी)" : "Son's Son's Wife";
        const primaryTitle = isHi
          ? `आपकी पोते की बहू (${gcCleanName ? `${gcCleanName} की धर्मपत्नी` : "पोते की पत्नी"})`
          : `Your Grandson's Wife (${gcCleanName ? `Wife of ${gcCleanName}` : "Pota's Wife"})`;
        return {
          shortTag,
          shortTagEn: "Grandson's Wife (Pota Bahu)",
          subTag,
          primaryTitle,
          primaryTitleEn: primaryTitle,
          category: "grandchild",
          generationTier: -2,
          generationLabel: isHi ? "पौत्र-वधू पीढ़ी" : "Grandchild In-Law",
          multipleRoles: buildMultipleRoles(primaryTitle, isHi ? "पोते की धर्मपत्नी (पौत्र-वधू)" : "Wife of grandson", isHi ? "पौत्र पीढ़ी" : "Generation -2", -2),
        };
      } else {
        // Nati ki Bahu (Daughter's Son's Wife)
        const shortTag = isHi ? "नाती की बहू" : "Nati ki Bahu";
        const subTag = isHi ? "नाती-बहू (नाती की पत्नी)" : "Daughter's Son's Wife";
        const primaryTitle = isHi
          ? `आपकी नाती की बहू (${gcCleanName ? `${gcCleanName} की धर्मपत्नी` : "नाती की पत्नी"})`
          : `Your Maternal Grandson's Wife (${gcCleanName ? `Wife of ${gcCleanName}` : "Naati's Wife"})`;
        return {
          shortTag,
          shortTagEn: "Grandson's Wife (Naati Bahu)",
          subTag,
          primaryTitle,
          primaryTitleEn: primaryTitle,
          category: "grandchild",
          generationTier: -2,
          generationLabel: isHi ? "नाती-बहू पीढ़ी" : "Grandchild In-Law",
          multipleRoles: buildMultipleRoles(primaryTitle, isHi ? "नाती की धर्मपत्नी (नाती-बहू)" : "Wife of maternal grandson", isHi ? "पौत्र पीढ़ी" : "Generation -2", -2),
        };
      }
    } else {
      if (isSonBranch) {
        // Poti ka Damaad (Son's Daughter's Husband)
        const shortTag = isHi ? "पोती दामाद" : "Poti Damaad";
        const subTag = isHi ? "पोती के पति" : "Granddaughter's Husband";
        const primaryTitle = isHi
          ? `आपके पोती दामाद (${gcCleanName ? `${gcCleanName} के पति` : "पोती के पति"})`
          : `Your Granddaughter's Husband (${gcCleanName ? `Husband of ${gcCleanName}` : "Poti's Husband"})`;
        return {
          shortTag,
          shortTagEn: "Granddaughter's Husband (Poti Damaad)",
          subTag,
          primaryTitle,
          primaryTitleEn: primaryTitle,
          category: "grandchild",
          generationTier: -2,
          generationLabel: isHi ? "पोती दामाद पीढ़ी" : "Grandchild In-Law",
          multipleRoles: buildMultipleRoles(primaryTitle, isHi ? "पोती के पति" : "Husband of granddaughter", isHi ? "पौत्र पीढ़ी" : "Generation -2", -2),
        };
      } else {
        // Natin ka Damaad (Daughter's Daughter's Husband)
        const shortTag = isHi ? "नातिन दामाद" : "Naatin Damaad";
        const subTag = isHi ? "नातिन के पति (नाती दामाद)" : "Maternal Granddaughter's Husband";
        const primaryTitle = isHi
          ? `आपके नातिन दामाद (${gcCleanName ? `${gcCleanName} के पति` : "नातिन के पति"})`
          : `Your Maternal Granddaughter's Husband (${gcCleanName ? `Husband of ${gcCleanName}` : "Naatin's Husband"})`;
        return {
          shortTag,
          shortTagEn: "Maternal Granddaughter's Husband (Naati Damaad)",
          subTag,
          primaryTitle,
          primaryTitleEn: primaryTitle,
          category: "grandchild",
          generationTier: -2,
          generationLabel: isHi ? "नातिन दामाद पीढ़ी" : "Grandchild In-Law",
          multipleRoles: buildMultipleRoles(primaryTitle, isHi ? "नातिन के पति" : "Husband of maternal granddaughter", isHi ? "पौत्र पीढ़ी" : "Generation -2", -2),
        };
      }
    }
  }

  // -------------------------------------------------------------
  // 11. GREAT-GRANDCHILDREN (Generation -3)
  // -------------------------------------------------------------
  const isGreatGrandchild = (tree.levels_down?.[2] || []).some((g) => g.id === n.id);
  if (isGreatGrandchild) {
    const isFemale = targetSex === "F";
    const shortTag = isFemale ? (isHi ? "परपोती" : "Great-granddaughter") : (isHi ? "परपोता" : "Great-grandson");
    const primaryTitle = isFemale
      ? isHi ? "आपकी परपोती / परनातिन (Great-granddaughter)" : "Your Great-granddaughter"
      : isHi ? "आपका परपोता / परनाती (Great-grandson)" : "Your Great-grandson";
    const tierLabel = isHi ? "परपौत्र पीढ़ी (Great-grandchildren)" : "Great-grandchildren Generation";

    return {
      shortTag,
      shortTagEn: isFemale ? "Great-granddaughter" : "Great-grandson",
      primaryTitle,
      primaryTitleEn: primaryTitle,
      category: "grandchild",
      generationTier: -3,
      generationLabel: tierLabel,
      multipleRoles: buildMultipleRoles(
        primaryTitle,
        isHi ? "परिवार की चौथी पीढ़ी (परपौत्र/परनातिन)" : "Fourth generation descendant",
        tierLabel,
        -3
      ),
    };
  }

  // -------------------------------------------------------------
  // 13. FATHER'S SIBLINGS (Tau, Chacha, Bua)
  // -------------------------------------------------------------
  const isFatherSib =
    fatherSiblings.has(n.id) ||
    relLower.includes("chacha") ||
    relLower.includes("tau") ||
    relLower.includes("bua") ||
    (tree.uncles_and_aunts || []).some((u) => u.id === n.id && (!u.via_id || u.via_id === father?.id));

  if (isFatherSib) {
    const fBorn = father?.birth_year || null;
    const nBorn = n.birth_year || null;
    const isOlderThanFather = (fBorn && nBorn ? nBorn < fBorn : false) || relLower.includes("tau");

    if (targetSex === "M" || relLower.includes("chacha") || relLower.includes("tau")) {
      const shortTag = isOlderThanFather ? (isHi ? "ताऊ जी" : "Elder Uncle (Tau)") : (isHi ? "चाचा जी" : "Paternal Uncle (Chacha)");
      const subTag = isOlderThanFather ? (isHi ? "पिता के बड़े भाई" : "Father's Elder Brother") : (isHi ? "पिता के भाई" : "Father's Brother");
      const primaryTitle = isOlderThanFather
        ? isHi ? "आपके ताऊ जी / बड़े पापा (पिताजी के बड़े भाई)" : "Your Elder Paternal Uncle (Tau)"
        : isHi ? "आपके चाचा जी / काका जी (पिताजी के भाई)" : "Your Paternal Uncle (Chacha)";
      const tierLabel = isHi ? "माता-पिता की पीढ़ी (ताऊ/चाचा)" : "Parents Generation (Uncle)";

      return {
        shortTag,
        shortTagEn: isOlderThanFather ? "Elder Uncle (Tau)" : "Uncle (Chacha)",
        subTag,
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "parent",
        generationTier: 1,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(
          primaryTitle,
          isHi ? `पिताजी ${father?.display_name || ""} के सहोदर भाई` : `Brother of your father`,
          tierLabel,
          1
        ),
      };
    } else {
      const shortTag = isHi ? "बुआ जी" : "Paternal Aunt (Bua)";
      const subTag = isHi ? "पिता की बहन" : "Father's Sister";
      const primaryTitle = isHi ? "आपकी बुआ जी / फूफी (पिताजी की बहन)" : "Your Paternal Aunt (Bua)";
      const tierLabel = isHi ? "माता-पिता की पीढ़ी (बुआ जी)" : "Parents Generation (Aunt)";

      return {
        shortTag,
        shortTagEn: "Paternal Aunt (Bua)",
        subTag,
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "parent",
        generationTier: 1,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(
          primaryTitle,
          isHi ? `पिताजी ${father?.display_name || ""} की सहोदर बहन` : `Sister of your father`,
          tierLabel,
          1
        ),
      };
    }
  }

  // -------------------------------------------------------------
  // 14. SPOUSE OF FATHER'S SIBLINGS (Tai, Chachi, Fufa)
  // -------------------------------------------------------------
  const marriedFatherSibId = Array.from(spouseMap.get(n.id) || []).find((pId) => fatherSiblings.has(pId)) ||
    (fatherSiblings.has(n.via_id || "") ? n.via_id : undefined);
  const isFatherSibSpouse = marriedFatherSibId || relLower.includes("chachi") || relLower.includes("tai") || relLower.includes("fufa");

  if (isFatherSibSpouse) {
    const sibNode = marriedFatherSibId ? allNodes.get(marriedFatherSibId) : undefined;
    const sibSex = resolveSex(sibNode?.gender, sibNode?.relation);
    const sibCleanName = sibNode?.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, "") || "";
    const fBorn = father?.birth_year || null;
    const sBorn = sibNode?.birth_year || null;
    const isOlderSib = (fBorn && sBorn ? sBorn < fBorn : false) || relLower.includes("tai");

    if (sibSex === "M" || targetSex === "F" || relLower.includes("chachi") || relLower.includes("tai")) {
      // Uncle's Wife -> TAI or CHACHI
      const shortTag = isOlderSib ? (isHi ? "ताई जी" : "Tai ji") : (isHi ? "चाची जी" : "Chachi ji");
      const subTag = isOlderSib ? (isHi ? "ताऊ जी की पत्नी" : "Tau's Wife") : (isHi ? "चाचा जी की पत्नी" : "Chacha's Wife");
      const primaryTitle = isOlderSib
        ? isHi ? `आपकी ताई जी / बड़ी माँ (${sibCleanName} की धर्मपत्नी)` : `Your Elder Paternal Aunt (${sibCleanName}'s Wife)`
        : isHi ? `आपकी चाची जी / काकी जी (${sibCleanName} की धर्मपत्नी)` : `Your Paternal Aunt (${sibCleanName}'s Wife)`;
      const tierLabel = isHi ? "माता-पिता की पीढ़ी (ताई/चाची)" : "Parents Generation";

      return {
        shortTag,
        shortTagEn: isOlderSib ? "Elder Aunt (Tai)" : "Aunt (Chachi)",
        subTag,
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "parent",
        generationTier: 1,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(primaryTitle, isHi ? `${sibCleanName} की धर्मपत्नी` : `Wife of ${sibCleanName}`, tierLabel, 1),
      };
    } else {
      // Aunt's Husband -> FUFA JI
      const shortTag = isHi ? "फूफा जी" : "Fufa ji";
      const subTag = isHi ? "बुआ जी के पति" : "Bua's Husband";
      const primaryTitle = isHi
        ? `आपके फूफा जी (${sibCleanName ? `${sibCleanName} के पति` : "बुआ जी के पति"})`
        : `Your Paternal Uncle (Fufa ji)`;
      const tierLabel = isHi ? "माता-पिता की पीढ़ी (फूफा जी)" : "Parents Generation";

      return {
        shortTag,
        shortTagEn: "Uncle (Fufa ji)",
        subTag,
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "parent",
        generationTier: 1,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(primaryTitle, isHi ? `बुआ जी ${sibCleanName} के पति` : `Husband of ${sibCleanName}`, tierLabel, 1),
      };
    }
  }

  // -------------------------------------------------------------
  // 15. MOTHER'S SIBLINGS (Mama, Mausi)
  // -------------------------------------------------------------
  const isMotherSib =
    motherSiblings.has(n.id) ||
    relLower.includes("mama") ||
    relLower.includes("mausi") ||
    (tree.uncles_and_aunts || []).some((u) => u.id === n.id && u.via_id === mother?.id);

  if (isMotherSib) {
    if (targetSex === "M" || relLower.includes("mama")) {
      const shortTag = isHi ? "मामा जी" : "Maternal Uncle (Mama)";
      const subTag = isHi ? "माता के भाई" : "Mother's Brother";
      const primaryTitle = isHi ? "आपके मामा जी (माताजी के भाई)" : "Your Maternal Uncle (Mama)";
      const tierLabel = isHi ? "माता-पिता की पीढ़ी (मामा जी)" : "Parents Generation (Maternal Uncle)";

      return {
        shortTag,
        shortTagEn: "Maternal Uncle (Mama)",
        subTag,
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "parent",
        generationTier: 1,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(
          primaryTitle,
          isHi ? `माताजी ${mother?.display_name || ""} के सहोदर भाई` : `Brother of your mother`,
          tierLabel,
          1
        ),
      };
    } else {
      const shortTag = isHi ? "मौसी जी" : "Maternal Aunt (Mausi)";
      const subTag = isHi ? "माता की बहन" : "Mother's Sister";
      const primaryTitle = isHi ? "आपकी मौसी जी (माताजी की बहन)" : "Your Maternal Aunt (Mausi)";
      const tierLabel = isHi ? "माता-पिता की पीढ़ी (मौसी जी)" : "Parents Generation (Maternal Aunt)";

      return {
        shortTag,
        shortTagEn: "Maternal Aunt (Mausi)",
        subTag,
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "parent",
        generationTier: 1,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(
          primaryTitle,
          isHi ? `माताजी ${mother?.display_name || ""} की सहोदर बहन` : `Sister of your mother`,
          tierLabel,
          1
        ),
      };
    }
  }

  // -------------------------------------------------------------
  // 16. SPOUSE OF MOTHER'S SIBLINGS (Mami, Mausa)
  // -------------------------------------------------------------
  const marriedMotherSibId = Array.from(spouseMap.get(n.id) || []).find((pId) => motherSiblings.has(pId)) ||
    (motherSiblings.has(n.via_id || "") ? n.via_id : undefined);
  const isMotherSibSpouse = marriedMotherSibId || relLower.includes("mami") || relLower.includes("mausa");

  if (isMotherSibSpouse) {
    const sibNode = marriedMotherSibId ? allNodes.get(marriedMotherSibId) : undefined;
    const sibSex = resolveSex(sibNode?.gender, sibNode?.relation);
    const sibCleanName = sibNode?.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, "") || "";

    if (sibSex === "M" || targetSex === "F" || relLower.includes("mami")) {
      // Mama's Wife -> MAMI
      const shortTag = isHi ? "मामी जी" : "Mami ji";
      const subTag = isHi ? "मामा जी की पत्नी" : "Mami";
      const primaryTitle = isHi
        ? `आपकी मामी जी (${sibCleanName ? `${sibCleanName} की धर्मपत्नी` : "मामा जी की पत्नी"})`
        : `Your Maternal Aunt (${sibCleanName ? `Wife of ${sibCleanName}` : "Maternal Uncle's Wife"})`;
      const tierLabel = isHi ? "माता-पिता की पीढ़ी (मामी जी)" : "Parents Generation";

      return {
        shortTag,
        shortTagEn: "Maternal Aunt (Mami ji)",
        subTag,
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "parent",
        generationTier: 1,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(primaryTitle, isHi ? `मामा जी की धर्मपत्नी` : `Wife of maternal uncle`, tierLabel, 1),
      };
    } else {
      // Mausi's Husband -> MAUSA
      const shortTag = isHi ? "मौसा जी" : "Mausa ji";
      const subTag = isHi ? "मौसी जी के पति" : "Mausa";
      const primaryTitle = isHi
        ? `आपके मौसा जी (${sibCleanName ? `${sibCleanName} के पति` : "मौसी जी के पति"})`
        : `Your Maternal Uncle (${sibCleanName ? `Husband of ${sibCleanName}` : "Maternal Aunt's Husband"})`;
      const tierLabel = isHi ? "माता-पिता की पीढ़ी (मौसा जी)" : "Parents Generation";

      return {
        shortTag,
        shortTagEn: "Maternal Uncle (Mausa ji)",
        subTag,
        primaryTitle,
        primaryTitleEn: primaryTitle,
        category: "parent",
        generationTier: 1,
        generationLabel: tierLabel,
        multipleRoles: buildMultipleRoles(primaryTitle, isHi ? `मौसी जी के पति` : `Husband of maternal aunt`, tierLabel, 1),
      };
    }
  }

  // -------------------------------------------------------------
  // 17. COUSINS (Children of Father's Siblings or Mother's Siblings)
  // -------------------------------------------------------------
  const cousinParentId = Array.from(parentsMap.get(n.id) || []).find(
    (pId) => fatherSiblings.has(pId) || motherSiblings.has(pId)
  ) || (fatherSiblings.has(n.via_id || "") || motherSiblings.has(n.via_id || "") ? n.via_id : undefined);

  if (cousinParentId) {
    const pNode = allNodes.get(cousinParentId);
    const pName = pNode?.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, "") || "";
    const isPaternal = fatherSiblings.has(cousinParentId);
    const pSex = resolveSex(pNode?.gender, pNode?.relation);

    let shortTag = "";
    let primaryTitle = "";

    if (isPaternal) {
      if (pSex === "M") {
        // Tau / Chacha's child -> Chachera / Tautera
        const isMale = targetSex === "M";
        shortTag = isMale ? (isHi ? "चचेरे भाई" : "Cousin Brother") : (isHi ? "चचेरी बहन" : "Cousin Sister");
        primaryTitle = isMale
          ? isHi ? `आपके चचेरे भाई (${pName ? `${pName} के सुपुत्र` : "चाचा/ताऊ के पुत्र"})` : `Your Cousin Brother (Son of ${pName || "Uncle"})`
          : isHi ? `आपकी चचेरी बहन (${pName ? `${pName} की सुपुत्री` : "चाचा/ताऊ की पुत्री"})` : `Your Cousin Sister (Daughter of ${pName || "Uncle"})`;
      } else {
        // Bua's child -> Fufere
        const isMale = targetSex === "M";
        shortTag = isMale ? (isHi ? "फुफेरे भाई" : "Cousin Brother") : (isHi ? "फुफेरी बहन" : "Cousin Sister");
        primaryTitle = isMale
          ? isHi ? `आपके फुफेरे भाई (${pName ? `${pName} के सुपुत्र` : "बुआ जी के पुत्र"})` : `Your Cousin Brother (Son of ${pName || "Bua"})`
          : isHi ? `आपकी फुफेरी बहन (${pName ? `${pName} की सुपुत्री` : "बुआ जी की पुत्री"})` : `Your Cousin Sister (Daughter of ${pName || "Bua"})`;
      }
    } else {
      if (pSex === "M") {
        // Mama's child -> Mamera
        const isMale = targetSex === "M";
        shortTag = isMale ? (isHi ? "ममेरे भाई" : "Cousin Brother") : (isHi ? "ममेरी बहन" : "Cousin Sister");
        primaryTitle = isMale
          ? isHi ? `आपके ममेरे भाई (${pName ? `${pName} के सुपुत्र` : "मामा जी के पुत्र"})` : `Your Cousin Brother (Son of ${pName || "Mama"})`
          : isHi ? `आपकी ममेरी बहन (${pName ? `${pName} की सुपुत्री` : "मामा जी की पुत्री"})` : `Your Cousin Sister (Daughter of ${pName || "Mama"})`;
      } else {
        // Mausi's child -> Mausera
        const isMale = targetSex === "M";
        shortTag = isMale ? (isHi ? "मौसेरे भाई" : "Cousin Brother") : (isHi ? "मौसेरी बहन" : "Cousin Sister");
        primaryTitle = isMale
          ? isHi ? `आपके मौसेरे भाई (${pName ? `${pName} के सुपुत्र` : "मौसी जी के पुत्र"})` : `Your Cousin Brother (Son of ${pName || "Mausi"})`
          : isHi ? `आपकी मौसेरी बहन (${pName ? `${pName} की सुपुत्री` : "मौसी जी की पुत्री"})` : `Your Cousin Sister (Daughter of ${pName || "Mausi"})`;
      }
    }

    const tierLabel = isHi ? "आपकी पीढ़ी (कजिन भाई-बहन)" : "Same Generation (Cousin)";
    return {
      shortTag,
      shortTagEn: targetSex === "M" ? "Cousin Brother" : "Cousin Sister",
      primaryTitle,
      primaryTitleEn: primaryTitle,
      category: "sibling",
      generationTier: 0,
      generationLabel: tierLabel,
      multipleRoles: buildMultipleRoles(primaryTitle, isHi ? `${pName} की संतान` : `Child of ${pName}`, tierLabel, 0),
    };
  }


  // -------------------------------------------------------------
  // 19. GREAT-GRANDPARENTS (Generation 3)
  // -------------------------------------------------------------
  const isGreatGrandparent = (tree.levels_up?.[2] || []).some((g) => g.id === n.id);
  if (isGreatGrandparent) {
    const isFemale = targetSex === "F";
    const shortTag = isFemale ? (isHi ? "परदादी जी" : "Great-grandmother") : (isHi ? "परदादा जी" : "Great-grandfather");
    const primaryTitle = isFemale
      ? isHi ? "आपकी पूज्य परदादी जी / परनानी जी" : "Your Great-grandmother"
      : isHi ? "आपके पूज्य परदादा जी / परनाना जी" : "Your Great-grandfather";
    const tierLabel = isHi ? "वरिष्ठ पूर्वज (परदादा-परदादी)" : "Great-grandparents Generation";

    return {
      shortTag,
      shortTagEn: isFemale ? "Great-grandmother" : "Great-grandfather",
      primaryTitle,
      primaryTitleEn: primaryTitle,
      category: "grandparent",
      generationTier: 3,
      generationLabel: tierLabel,
      multipleRoles: buildMultipleRoles(
        primaryTitle,
        isHi ? "वंशावली के चतुर्थ पीढ़ी के वरिष्ठतम पूर्वज" : "Great-grandparent tier ancestor",
        tierLabel,
        3
      ),
    };
  }

  // -------------------------------------------------------------
  // 20. IN-LAWS (via Spouse)
  // -------------------------------------------------------------
  const isSpouseParent = Array.from(tree.spouses || []).some((sp) =>
    Array.from(parentsMap.get(sp.id) || []).includes(n.id)
  );

  if (isSpouseParent) {
    const isFemale = targetSex === "F";
    const shortTag = isFemale ? (isHi ? "सास जी" : "Mother-in-law") : (isHi ? "ससुर जी" : "Father-in-law");
    const primaryTitle = isFemale
      ? isHi ? "आपकी पूज्य सास जी (Mother-in-law)" : "Your Mother-in-law"
      : isHi ? "आपके पूज्य ससुर जी (Father-in-law)" : "Your Father-in-law";
    return {
      shortTag,
      shortTagEn: isFemale ? "Mother-in-law" : "Father-in-law",
      primaryTitle,
      primaryTitleEn: primaryTitle,
      category: "parent",
      generationTier: 1,
      generationLabel: isHi ? "ससुराल पक्ष (सास-ससुर)" : "In-Laws (Parents)",
      multipleRoles: buildMultipleRoles(primaryTitle, isHi ? "जीवनसाथी के पूज्य माता-पिता" : "Parents of your spouse", isHi ? "वरिष्ठ पीढ़ी" : "Generation +1", 1),
    };
  }

  // -------------------------------------------------------------
  // 21. SMART FALLBACK
  // -------------------------------------------------------------
  let inferredTier = 0;
  if ((tree.levels_up || []).some((lvl) => lvl.some((m) => m.id === n.id))) {
    const idx = (tree.levels_up || []).findIndex((lvl) => lvl.some((m) => m.id === n.id));
    inferredTier = idx + 1;
  } else if ((tree.levels_down || []).some((lvl) => lvl.some((m) => m.id === n.id))) {
    const idx = (tree.levels_down || []).findIndex((lvl) => lvl.some((m) => m.id === n.id));
    inferredTier = -(idx + 1);
  }

  // Fallback for spouse link when via_id exists
  if (n.relation === "spouse" && n.via_id) {
    const ownerNode = allNodes.get(n.via_id);
    const ownerName = ownerNode?.display_name?.replace(/^(स्व\.|late|sw\.)\s*/i, "") || "";
    const shortTag = targetSex === "F" ? (isHi ? "पत्नी" : "Wife") : (isHi ? "पति" : "Husband");
    const primaryTitle = isHi
      ? `${ownerName ? `${ownerName} के ` : ""}${targetSex === "F" ? "धर्मपत्नी (Wife)" : "पति (Husband)"}`
      : `${targetSex === "F" ? "Wife" : "Husband"} of ${ownerName || "Family Member"}`;
    const tierLabel = inferredTier > 0
      ? (isHi ? "वरिष्ठ पीढ़ी" : "Senior Generation")
      : inferredTier < 0
      ? (isHi ? "संतान पीढ़ी" : "Children Generation")
      : (isHi ? "आपकी पीढ़ी" : "Same Generation");

    return {
      shortTag,
      shortTagEn: targetSex === "F" ? "Wife" : "Husband",
      primaryTitle,
      primaryTitleEn: primaryTitle,
      category: "spouse",
      generationTier: inferredTier,
      generationLabel: tierLabel,
      multipleRoles: buildMultipleRoles(
        primaryTitle,
        isHi ? `${ownerName} के साथ वैवाहिक संबंध` : `Married to ${ownerName}`,
        tierLabel,
        inferredTier
      ),
    };
  }

  const rawLabel = lbl(lang, n.relation, n.gender);
  const tierLabel = inferredTier > 0
    ? (isHi ? "वरिष्ठ पीढ़ी" : "Senior Generation")
    : inferredTier < 0
    ? (isHi ? "संतान पीढ़ी" : "Children Generation")
    : (isHi ? "आपकी पीढ़ी" : "Same Generation");

  return {
    shortTag: rawLabel,
    shortTagEn: lbl("en", n.relation, n.gender),
    primaryTitle: isHi ? `परिवार सदस्य (${rawLabel})` : `Family Member (${rawLabel})`,
    primaryTitleEn: `Family Member (${lbl("en", n.relation, n.gender)})`,
    category: "relative",
    generationTier: inferredTier,
    generationLabel: tierLabel,
    multipleRoles: buildMultipleRoles(
      rawLabel,
      isHi ? "वंशावली का सम्मानीय परिवार सदस्य" : "Respected family tree member",
      tierLabel,
      inferredTier
    ),
  };
}

function getRelationshipExplanation(
  n: Node,
  tree: Tree | null,
  lang: string
): string {
  if (!tree) return n.display_name;
  return resolveIndianRelationship(n, tree, lang).primaryTitle;
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
  const selfLayoutRef = useRef({ x: 180, y: 200 });
  const canvasSizeRef = useRef({ W: 360, H: 480, cx: 180, cy: 240 });
  const placedLayoutRef = useRef<Record<string, { x: number; top: number }>>({});
  const didCenterRef = useRef(false);
  const [vw, setVw] = useState(360);
  const [vh, setVh] = useState(480);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  /** Pinned float positions (Arrange → Move → pin) */
  const [floatPos, setFloatPos] = useState<Record<string, { x: number; top: number }>>({});
  const [arrangeMode, setArrangeMode] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [movePromptId, setMovePromptId] = useState<string | null>(null);
  const bubbleDragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiCanEdit, setApiCanEdit] = useState(false);
  const [isSA, setIsSA] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // 2-card mobile stream vs wide tree toggle
  const [viewMode2Col, setViewMode2Col] = useState<boolean | null>(null);
  const is2ColActive = viewMode2Col !== null ? viewMode2Col : vw < 768;

  // Request relationship change modal states
  const [changeRelTarget, setChangeRelTarget] = useState<Node | null>(null);
  const [newProposedRel, setNewProposedRel] = useState("father");
  const [relChangeNote, setRelChangeNote] = useState("");
  const [submittingChangeRel, setSubmittingChangeRel] = useState(false);
  const [changeRelMsg, setChangeRelMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleProposeRelChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeRelTarget) return;
    setSubmittingChangeRel(true);
    setChangeRelMsg(null);
    try {
      const res = await fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "propose_relation_change",
          person_id: changeRelTarget.id,
          relation: newProposedRel,
          note: relChangeNote,
          root_user_id: rootId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setChangeRelMsg({
          text:
            lang === "hi"
              ? "रिश्ते में बदलाव का अनुरोध भेज दिया गया है! Super Admin / Core Committee द्वारा स्वीकृत (Approved) होने के बाद यह वंशावली में दिखाई देगा।"
              : "Relationship change request submitted! It will appear in Vanshawali after approval by Core Committee / Super Admin.",
          ok: true,
        });
        setTimeout(() => {
          setChangeRelTarget(null);
          setChangeRelMsg(null);
        }, 3500);
      } else {
        setChangeRelMsg({
          text: data.error || (lang === "hi" ? "अनुरोध भेजने में समस्या आई" : "Failed to submit request"),
          ok: false,
        });
      }
    } catch (err: any) {
      setChangeRelMsg({
        text: err.message || (lang === "hi" ? "नेटवर्क त्रुटि" : "Network error"),
        ok: false,
      });
    } finally {
      setSubmittingChangeRel(false);
    }
  };
  const [saEditMode, setSaEditMode] = useState(false);
  const [selected, setSelected] = useState<Node | null>(null);
  const [showAddSubmenu, setShowAddSubmenu] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // New UX: Dual view (Tree / List), Search, Highlight, Late/Deceased toggle
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [treeSearch, setTreeSearch] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [isDeceasedDraft, setIsDeceasedDraft] = useState(false);

  // add form
  const [draft, setDraft] = useState<{
    relation: string;
    centre_person_id?: string;
    name: string;
    birth_year: string;
    birth_date: string;
    gender: string;
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
  // Profile owner always full edit on own vanshawali; SA needs Edit ON for others
  const isOwnTree = isOwner || (!!user?.id && !!rootId && user.id === rootId);
  const canEdit = isOwnTree || (isSA && saEditMode);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const nextVw = Math.max(300, el.clientWidth);
      const nextVh = Math.max(200, el.clientHeight);
      setVw((prev) => (Math.abs(prev - nextVw) > 2 ? nextVw : prev));
      setVh((prev) => (Math.abs(prev - nextVh) > 2 ? nextVh : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tree]);

  const load = useCallback(() => {
    if (!rootId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/vanshawali?userId=${rootId}`)
      .then((r) => r.json())
      .then((d) => {
        setTree(d.tree || null);
        setApiCanEdit(!!d.can_edit);
        setIsSA(!!d.is_super_admin);
        setIsOwner(!!d.is_owner);
        setPendingCount(Number(d.pending_count) || 0);
        if (d.positions && Object.keys(d.positions).length > 0) {
          setFloatPos(d.positions);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`vansh-float-${rootId}`, JSON.stringify(d.positions));
            } catch (_) {}
          }
        }
      })
      .catch(() => toast("Load failed", "error"))
      .finally(() => setLoading(false));
  }, [rootId, toast]);

  useEffect(() => {
    load();
    setArrangeMode(false);
    setMoveTargetId(null);
    setMovePromptId(null);
    didCenterRef.current = false;
    if (typeof window !== "undefined" && rootId) {
      try {
        const raw = localStorage.getItem(`vansh-float-${rootId}`);
        if (raw) setFloatPos(JSON.parse(raw));
        else setFloatPos({});
      } catch {
        setFloatPos({});
      }
    } else setFloatPos({});
  }, [load, rootId]);

  // Open page → zoom out so FULL tree fits every device
  useEffect(() => {
    if (loading || !tree) {
      didCenterRef.current = false;
      return;
    }
    if (didCenterRef.current) return;
    if (vw < 40 || vh < 40) return;
    const { W: cW, H: cH } = canvasSizeRef.current;
    if (cW < 10 || cH < 10) return;
    didCenterRef.current = true;
    if (is2ColActive) {
      setZoom(1);
      setPan({
        x: Math.max(0, (vw - cW) / 2),
        y: 20,
      });
      return;
    }
    const padFit = 36;
    const zx = (vw - padFit) / Math.max(cW, 1);
    const zy = (vh - padFit) / Math.max(cH, 1);
    const z = Math.min(2.5, Math.max(0.18, Math.min(zx, zy, 1)));
    setZoom(Math.round(z * 100) / 100);
    setPan({
      x: vw / 2 - (cW / 2) * z,
      y: vh / 2 - (cH / 2) * z,
    });
  }, [loading, tree, vw, vh, is2ColActive]);

  // Auto-freeze all bubble positions — stay put until Arrange-move (survive delete/reload)
  useEffect(() => {
    if (loading || !tree || is2ColActive) return;
    const snap = placedLayoutRef.current;
    const ids = Object.keys(snap);
    if (!ids.length) return;
    setFloatPos((prev) => {
      let changed = false;
      const next = { ...prev };
      ids.forEach((id) => {
        if (!next[id] && snap[id]) {
          next[id] = snap[id];
          changed = true;
        }
      });
      // drop positions for people no longer in tree
      const live = new Set(ids);
      Object.keys(next).forEach((id) => {
        if (!live.has(id)) {
          delete next[id];
          changed = true;
        }
      });
      if (!changed) return prev;
      if (typeof window !== "undefined" && rootId) {
        try {
          localStorage.setItem(`vansh-float-${rootId}`, JSON.stringify(next));
        } catch (_) {}
      }
      return next;
    });
  }, [loading, tree, rootId]);

  /** Persist pinned positions — stay until user moves again */
  const persistFloat = (next: Record<string, { x: number; top: number }>) => {
    if (typeof window !== "undefined" && rootId) {
      try {
        localStorage.setItem(`vansh-float-${rootId}`, JSON.stringify(next));
      } catch (_) {}
    }
    // Also save to database so layout persists across devices
    if (rootId) {
      fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_positions",
          root_user_id: rootId,
          positions: next,
        }),
      }).catch(() => {});
    }
  };

  const saveArrangement = () => {
    persistFloat(floatPos);
    setArrangeMode(false);
    setMoveTargetId(null);
    setMovePromptId(null);
    toast(lang === "hi" ? "व्यवस्था सेव हो गई" : "Arrangement saved", "success");
  };

  const toggleArrange = () => {
    if (arrangeMode) {
      saveArrangement();
    } else {
      setArrangeMode(true);
      setMoveTargetId(null);
      setMovePromptId(null);
      toast(
        lang === "hi"
          ? "Arrange ON — बबल टैप → Move → खींचकर पिन"
          : "Arrange ON — tap bubble → Move → drag to pin",
        "success"
      );
    }
  };

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
    if (draft.relation === "sibling" && !draft.centre_person_id) {
      toast(
        lang === "hi"
          ? "भाई-बहन के लिए पहले माता/पिता जोड़ें"
          : "Add father/mother first for brother/sister",
        "error"
      );
      return;
    }
    const rawName = draft.name.trim();
    const finalDisplayName =
      isDeceasedDraft && rawName && !/^(स्व\.|late|sw\.)/i.test(rawName)
        ? `स्व. ${rawName}`
        : rawName;

    let targetCentrePersonId = draft.centre_person_id;
    let targetCentreUserId: string | undefined = draft.centre_person_id ? undefined : rootId;

    if (draft.relation === "sibling") {
      const f = (tree?.parents || []).find((x) => x.relation === "father");
      const m = (tree?.parents || []).find((x) => x.relation === "mother");
      const parentId = targetCentrePersonId || f?.id || m?.id;
      if (!parentId) {
        toast(
          lang === "hi"
            ? "भाई/बहन जोड़ने से पहले कृपया माता या पिता को जोड़ें"
            : "Please add Mother or Father first before adding brother/sister",
          "error"
        );
        return;
      }
      targetCentrePersonId = parentId;
      targetCentreUserId = undefined;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          centre_user_id: targetCentreUserId,
          centre_person_id: targetCentrePersonId || undefined,
          root_user_id: rootId,
          relation: draft.relation === "sibling" ? "child" : draft.relation,
          display_name: finalDisplayName || undefined,
          birth_year: draft.birth_year || null,
          birth_date: draft.birth_date || null,
          gender: draft.gender || (draft.relation === "mother" ? "female" : draft.relation === "father" ? "male" : undefined),
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
    const rawName = editDraft.name.trim();
    const finalDisplayName =
      isDeceasedDraft && rawName && !/^(स्व\.|late|sw\.)/i.test(rawName)
        ? `स्व. ${rawName}`
        : rawName;
    setSaving(true);
    try {
      const res = await fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          root_user_id: rootId,
          person_id: editDraft.person_id,
          link_id: editDraft.link_id || undefined,
          display_name: finalDisplayName,
          birth_year: editDraft.birth_year || null,
          birth_date: editDraft.birth_date || null,
          gender: editDraft.gender || null,
          relation: editDraft.relation === "sibling" ? "child" : (editDraft.relation || undefined),
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
          person_id: node.id,
          centre_person_id: tree?.centre.id,
          root_user_id: rootId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        return;
      }
      // Keep everyone else's place — only drop removed person pin
      if (node.id) {
        setFloatPos((prev) => {
          const next = { ...prev };
          delete next[node.id];
          if (typeof window !== "undefined" && rootId) {
            try {
              localStorage.setItem(`vansh-float-${rootId}`, JSON.stringify(next));
            } catch (_) {}
          }
          return next;
        });
      }
      setSelected(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const openAdd = (relation: string, centrePersonId?: string, defaultGender?: string) => {
    if (!canEdit) return;
    setIsDeceasedDraft(false);
    let g = defaultGender || "";
    if (!g) {
      if (relation === "father" || relation === "brother" || relation === "son") g = "male";
      else if (relation === "mother" || relation === "sister" || relation === "daughter") g = "female";
      else if (relation === "sibling" || relation === "child") g = "male";
    }
    const cleanRelation =
      relation === "brother" || relation === "sister"
        ? "sibling"
        : relation === "son" || relation === "daughter"
        ? "child"
        : relation;

    setDraft({
      relation: cleanRelation,
      centre_person_id: centrePersonId,
      name: "",
      birth_year: "",
      birth_date: "",
      gender: g,
      member_user_id: null,
    });
    setQ("");
    setHits([]);
  };

  // Layout — auto canvas, couple units, expand L/R, NO overlap
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

  const allNodesMap = useMemo(() => {
    const map = new Map<string, Node>();
    if (!tree) return map;
    map.set(tree.centre.id, { ...tree.centre, relation: "self" });
    (tree.parents || []).forEach((n) => map.set(n.id, n));
    (tree.spouses || []).forEach((n) => map.set(n.id, n));
    (tree.siblings || []).forEach((n) => map.set(n.id, n));
    (tree.children || []).forEach((n) => map.set(n.id, n));
    (tree.grandparents || []).forEach((n) => map.set(n.id, n));
    (tree.grandchildren || []).forEach((n) => map.set(n.id, n));
    (tree.uncles_and_aunts || []).forEach((n) => map.set(n.id, n));
    (tree.levels_up || []).flat().forEach((n) => map.set(n.id, n));
    (tree.levels_down || []).flat().forEach((n) => map.set(n.id, n));
    if (tree.spouses_of) {
      Object.values(tree.spouses_of).flat().forEach((n) => map.set(n.id, n));
    }
    if (tree.siblings_of) {
      Object.values(tree.siblings_of).flat().forEach((n) => map.set(n.id, n));
    }
    if (tree.children_of) {
      Object.values(tree.children_of).flat().forEach((n) => map.set(n.id, n));
    }
    return map;
  }, [tree]);

  const parents = levelsUp[0] || tree?.parents || [];
  const spouses = tree?.spouses || [];
  const children = levelsDown[0] || tree?.children || [];
  const grandparents = levelsUp[1] || tree?.grandparents || [];
  const grandchildren = levelsDown[1] || tree?.grandchildren || [];
  const spousesOfMap = tree?.spouses_of || {};
  const siblings = tree?.siblings || [];
  const spousesList = spouses.slice();
  const father = parents.find((p) => p.relation === "father" || resolveSex(p.gender, p.relation) === "M");
  const mother = parents.find((p) => p.relation === "mother" || resolveSex(p.gender, p.relation) === "F");

  // Universal bidirectional spouse mapping
  const spousePairs = useMemo(() => {
    const pairs = new Map<string, Set<string>>();
    const add = (idA?: string | null, idB?: string | null) => {
      if (!idA || !idB || idA === idB) return;
      if (!pairs.has(idA)) pairs.set(idA, new Set());
      if (!pairs.has(idB)) pairs.set(idB, new Set());
      pairs.get(idA)!.add(idB);
      pairs.get(idB)!.add(idA);
    };
    if (!tree) return pairs;

    // 1. Centre + spouses
    (tree.spouses || []).forEach((s) => add(tree.centre.id, s.id));

    // 2. spouses_of map in both directions
    Object.entries(tree.spouses_of || {}).forEach(([ownerId, list]) => {
      list.forEach((s) => add(ownerId, s.id));
    });

    // 3. Father & Mother of centre
    const pars = tree.parents || (tree.levels_up && tree.levels_up[0]) || [];
    const fNode = pars.find((p) => p.relation === "father" || resolveSex(p.gender, p.relation) === "M");
    const mNode = pars.find((p) => p.relation === "mother" || resolveSex(p.gender, p.relation) === "F");
    if (fNode && mNode && fNode.id !== mNode.id) {
      add(fNode.id, mNode.id);
    }

    // 4. Any node with relation === "spouse" and via_id
    allNodesMap.forEach((n) => {
      if (n.relation === "spouse" && n.via_id) {
        add(n.via_id, n.id);
      }
    });

    // 5. Grandparents (Dada + Dadi, Nana + Nani)
    const allGps = [...(tree.grandparents || []), ...(tree.levels_up?.[1] || [])];
    const pDada = allGps.find((g) => resolveSex(g.gender, g.relation) === "M" && (!g.via_id || g.via_id === fNode?.id));
    const pDadi = allGps.find((g) => resolveSex(g.gender, g.relation) === "F" && (!g.via_id || g.via_id === fNode?.id));
    if (pDada && pDadi && pDada.id !== pDadi.id) add(pDada.id, pDadi.id);

    const mNana = allGps.find((g) => g.id !== pDada?.id && resolveSex(g.gender, g.relation) === "M" && (!g.via_id || g.via_id === mNode?.id));
    const mNani = allGps.find((g) => g.id !== pDadi?.id && resolveSex(g.gender, g.relation) === "F" && (!g.via_id || g.via_id === mNode?.id));
    if (mNana && mNani && mNana.id !== mNani.id) add(mNana.id, mNani.id);

    return pairs;
  }, [tree, allNodesMap]);

  const getSpouseOf = useCallback(
    (personId: string): Node | null => {
      const set = spousePairs.get(personId);
      if (!set || set.size === 0) return null;
      for (const spId of Array.from(set)) {
        const spNode = allNodesMap.get(spId);
        if (spNode) return spNode;
      }
      return null;
    },
    [spousePairs, allNodesMap]
  );

  const orderCouple = (nodeA: Node, nodeB: Node): [Node, Node] => {
    const sexA = resolveSex(nodeA.gender, nodeA.relation);
    const sexB = resolveSex(nodeB.gender, nodeB.relation);
    // Husband on left, Wife on right
    if (sexA === "M" && sexB === "F") return [nodeA, nodeB];
    if (sexA === "F" && sexB === "M") return [nodeB, nodeA];
    if (nodeA.relation === "self") return [nodeA, nodeB];
    if (nodeB.relation === "self") return [nodeB, nodeA];
    return [nodeA, nodeB];
  };

  const pad = 24;
  const gap = 22;
  const coupleGap = 18;
  const subRowH = 76;
  const levelGap = 64;
  const BH = BUBBLE_H + 20;

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

  // EXTRA: marriage pairs — every husband–wife from spouses_of + centre
  type MPair = {
    ax: number; ay: number; aw: number;
    bx: number; by: number; bw: number;
    idA: string; idB: string;
    ring: RingStyle;
  };
  const marriagePairs: MPair[] = [];
  const marriedIdSet = new Set<string>();
  const coupleSeen = new Set<string>();
  const coupleRingMap = new Map<string, RingStyle>();
  const SILVER_RING = COUPLE_RING_STYLES[0];
  let nextRingIdx = 1; // 0 is reserved for Self (Silver)

  const registerCoupleRing = (id1?: string | null, id2?: string | null) => {
    if (!id1 || !id2 || id1 === id2) return;
    let ring = coupleRingMap.get(id1) || coupleRingMap.get(id2);
    if (!ring) {
      const isSelfCouple = (tree?.centre && (id1 === tree.centre.id || id2 === tree.centre.id));
      if (isSelfCouple) {
        ring = SILVER_RING;
      } else {
        const otherStyles = COUPLE_RING_STYLES.slice(1);
        ring = otherStyles[nextRingIdx++ % otherStyles.length];
      }
      coupleRingMap.set(id1, ring);
      coupleRingMap.set(id2, ring);
    }
  };

  // Pre-seed Self & Spouse first so Self ALWAYS has Silver ring
  if (tree?.centre) {
    coupleRingMap.set(tree.centre.id, SILVER_RING);
    spouses.forEach((s) => coupleRingMap.set(s.id, SILVER_RING));
  }

  // Pre-seed couple ring assignments across the tree with distinct metals & gems
  if (father && mother) registerCoupleRing(father.id, mother.id);
  const gpAllNodes = [...(tree?.grandparents || []), ...(tree?.levels_up?.[1] || [])];
  const pDadaPre = gpAllNodes.find((g) => resolveSex(g.gender, g.relation) === "M" && (!g.via_id || g.via_id === father?.id));
  const pDadiPre = gpAllNodes.find((g) => resolveSex(g.gender, g.relation) === "F" && (!g.via_id || g.via_id === father?.id));
  if (pDadaPre && pDadiPre) registerCoupleRing(pDadaPre.id, pDadiPre.id);
  const mNanaPre = gpAllNodes.find((g) => g.id !== pDadaPre?.id && resolveSex(g.gender, g.relation) === "M");
  const mNaniPre = gpAllNodes.find((g) => g.id !== pDadiPre?.id && resolveSex(g.gender, g.relation) === "F");
  if (mNanaPre && mNaniPre) registerCoupleRing(mNanaPre.id, mNaniPre.id);

  if (tree?.centre) {
    spouses.forEach((s) => registerCoupleRing(tree.centre.id, s.id));
  }
  Object.entries(tree?.spouses_of || {}).forEach(([ownerId, spList]) => {
    spList.forEach((sp) => registerCoupleRing(ownerId, sp.id));
  });
  spousePairs.forEach((spSet, ownerId) => {
    spSet.forEach((spId) => registerCoupleRing(ownerId, spId));
  });

  const pushCouple = (
    a: { id: string; x: number; top: number; w: number },
    b: { id: string; x: number; top: number; w: number }
  ) => {
    if (a.id === b.id) return;
    const key = [a.id, b.id].sort().join("|");
    if (coupleSeen.has(key)) return;
    coupleSeen.add(key);
    registerCoupleRing(a.id, b.id);
    const ring = coupleRingMap.get(a.id) || COUPLE_RING_STYLES[0];
    marriagePairs.push({
      ax: a.x, ay: a.top, aw: a.w,
      bx: b.x, by: b.top, bw: b.w,
      idA: a.id, idB: b.id,
      ring,
    });
    marriedIdSet.add(a.id);
    marriedIdSet.add(b.id);
  };

  const cardW = is2ColActive ? Math.min(154, Math.max(130, Math.floor((Math.max(vw, 360) - 64) / 2))) : 140;

  /** Tentative width — grows if content needs more space (L/R extend) */
  let contentW = Math.max(vw, 360);
  const cx0 = () => contentW / 2;

  const placeNode = (
    n: Node,
    x: number,
    top: number,
    genKey: keyof typeof GEN_STYLE
  ) => {
    const w = is2ColActive ? cardW : nameW(n.display_name);
    // Locked position ONLY in desktop wide mode, NEVER in 2-card stream mode
    const pinned = !is2ColActive ? floatPos[n.id] : undefined;
    const fx = pinned ? pinned.x : x;
    const ft = pinned ? pinned.top : top;
    const pl: Placed = { n, x: fx, top: ft, w, genKey };
    placed.push(pl);
    posById.set(n.id, { x: fx, top: ft, w });
    return pl;
  };

  /** Pack list left-to-right starting at startX, return next X and max height rows */
  const packRow = (
    nodes: Node[],
    startX: number,
    top: number,
    genKey: keyof typeof GEN_STYLE
  ) => {
    let x = startX;
    nodes.forEach((n) => {
      const w = nameW(n.display_name);
      const cx = x + w / 2;
      placeNode(n, cx, top, genKey);
      x += w + gap;
    });
    return x;
  };

  /** Place couple: a left, b right, return unit centre and width */
  const placeCouple = (
    a: Node,
    b: Node,
    unitCx: number,
    top: number,
    genA: keyof typeof GEN_STYLE,
    genB: keyof typeof GEN_STYLE
  ) => {
    const wa = nameW(a.display_name);
    const wb = nameW(b.display_name);
    const unitW = wa + coupleGap + wb;
    const leftCx = unitCx - unitW / 2 + wa / 2;
    const rightCx = unitCx + unitW / 2 - wb / 2;
    placeNode(a, leftCx, top, genA);
    placeNode(b, rightCx, top, genB);
    return { unitCx, unitW, leftCx, rightCx };
  };

  type GenerationSection = {
    id: string;
    top: number;
    height: number;
    title: string;
    icon: string;
    count: number;
    borderCls: string;
    bgCls: string;
    headerBgCls: string;
    badgeCls: string;
  };
  const generationSections: GenerationSection[] = [];

  let yCursor = 20;
  let centreX = cx0();
  let yMid = 180;
  let yGrandparents = 0;
  let yParents = 0;
  let ySelf = 0;
  let yChildren = 0;
  let yGrandchildren = 0;

  if (is2ColActive) {
    // -----------------------------------------------------------------
    // MOBILE / 2-MEMBERS-PER-LINE VERTICAL STREAM
    // -----------------------------------------------------------------
    contentW = Math.max(vw, 360);
    const cx = contentW / 2;
    const cGap = 18;
    const sRowH = 84;
    const lGap = 22;
    const HEADER_OFFSET = 54;
    const SEC_PAD_BOTTOM = 28;
    const SEC_MARGIN_BOTTOM = 46;

    yCursor = 20;

    const placePair = (
      nodeA: Node,
      nodeB?: Node | null,
      genA: keyof typeof GEN_STYLE = "sibling",
      genB: keyof typeof GEN_STYLE = "spouse",
      isMarriedCouple: boolean = false
    ) => {
      if (nodeB) {
        let first = nodeA;
        let second = nodeB;
        let g1 = genA;
        let g2 = genB;
        if (isMarriedCouple) {
          const [hus, wif] = orderCouple(nodeA, nodeB);
          first = hus;
          second = wif;
          g1 = hus.id === nodeA.id ? genA : genB;
          g2 = hus.id === nodeA.id ? genB : genA;
        }
        const leftCx = cx - cGap / 2 - cardW / 2;
        const rightCx = cx + cGap / 2 + cardW / 2;
        placeNode(first, leftCx, yCursor, g1);
        placeNode(second, rightCx, yCursor, g2);
        if (isMarriedCouple) {
          pushCouple(
            { id: first.id, x: leftCx, top: yCursor, w: cardW },
            { id: second.id, x: rightCx, top: yCursor, w: cardW }
          );
        }
      } else {
        placeNode(nodeA, cx, yCursor, genA);
      }
      yCursor += sRowH + lGap;
    };

    // 1. Generation +2 (Grandparents - Dada/Dadi, Nana/Nani)
    const centreSibIdSet = new Set<string>((tree?.siblings || []).map((s) => s.id));
    if (tree?.siblings_of?.[tree.centre.id]) {
      tree.siblings_of[tree.centre.id].forEach((s) => centreSibIdSet.add(s.id));
    }
    const gpList = [...(tree?.grandparents || []), ...(levelsUp[1] || [])].filter(
      (g) => !centreSibIdSet.has(g.id) && g.id !== tree?.centre.id && g.relation !== "sibling"
    );
    const gpSeen = new Set<string>();
    const gpPairs: [Node, Node | null, keyof typeof GEN_STYLE, keyof typeof GEN_STYLE, boolean][] = [];

    // Helper to check if grandparent is maternal or paternal
    const isMaternalGp = (g: Node) => {
      const r = (g.relation || "").toLowerCase();
      if (r.includes("nana") || r.includes("nani") || r.includes("maternal")) return true;
      if (mother && (g.via_id === mother.id || g.via_parent_id === mother.id)) return true;
      return false;
    };
    const isPaternalGp = (g: Node) => {
      const r = (g.relation || "").toLowerCase();
      if (r.includes("dada") || r.includes("dadi") || r.includes("paternal")) return true;
      if (father && (g.via_id === father.id || g.via_parent_id === father.id)) return true;
      return false;
    };

    // 1. Dada + Dadi (Paternal - Father's parents)
    const pDada = gpList.find((g) => isPaternalGp(g) && resolveSex(g.gender, g.relation) === "M")
      || gpList.find((g) => !isMaternalGp(g) && resolveSex(g.gender, g.relation) === "M" && (!g.via_id || g.via_id === father?.id));
    const pDadi = gpList.find((g) => isPaternalGp(g) && resolveSex(g.gender, g.relation) === "F")
      || (pDada ? getSpouseOf(pDada.id) : null)
      || gpList.find((g) => !isMaternalGp(g) && resolveSex(g.gender, g.relation) === "F" && (!g.via_id || g.via_id === father?.id));

    if (pDada && pDadi && pDada.id !== pDadi.id) {
      gpPairs.push([pDada, pDadi, "up2", "up2", true]);
      gpSeen.add(pDada.id);
      gpSeen.add(pDadi.id);
    } else {
      if (pDada) { gpPairs.push([pDada, null, "up2", "up2", false]); gpSeen.add(pDada.id); }
      if (pDadi && !gpSeen.has(pDadi.id)) { gpPairs.push([pDadi, null, "up2", "up2", false]); gpSeen.add(pDadi.id); }
    }

    // 2. Nana + Nani (Maternal - Mother's parents)
    const mNana = gpList.find((g) => !gpSeen.has(g.id) && isMaternalGp(g) && resolveSex(g.gender, g.relation) === "M")
      || gpList.find((g) => !gpSeen.has(g.id) && resolveSex(g.gender, g.relation) === "M" && g.id !== pDada?.id);
    const mNani = gpList.find((g) => !gpSeen.has(g.id) && isMaternalGp(g) && resolveSex(g.gender, g.relation) === "F")
      || (mNana ? getSpouseOf(mNana.id) : null)
      || gpList.find((g) => !gpSeen.has(g.id) && resolveSex(g.gender, g.relation) === "F" && g.id !== pDadi?.id);

    if (mNana && mNani && mNana.id !== mNani.id) {
      gpPairs.push([mNana, mNani, "up2", "up2", true]);
      gpSeen.add(mNana.id);
      gpSeen.add(mNani.id);
    } else {
      if (mNana && !gpSeen.has(mNana.id)) { gpPairs.push([mNana, null, "up2", "up2", false]); gpSeen.add(mNana.id); }
      if (mNani && !gpSeen.has(mNani.id)) { gpPairs.push([mNani, null, "up2", "up2", false]); gpSeen.add(mNani.id); }
    }

    // Other married grandparents from spousePairs
    gpList.forEach((g) => {
      if (gpSeen.has(g.id)) return;
      const sp = getSpouseOf(g.id);
      if (sp && !gpSeen.has(sp.id)) {
        gpPairs.push([g, sp, "up2", "up2", true]);
        gpSeen.add(g.id);
        gpSeen.add(sp.id);
      }
    });

    // Remaining single grandparents -> 2 per line, but NOT married!
    const otherGps = gpList.filter((g) => !gpSeen.has(g.id) && !posById.has(g.id));
    for (let i = 0; i < otherGps.length; i += 2) {
      if (i + 1 < otherGps.length) {
        gpPairs.push([otherGps[i], otherGps[i + 1], "up2", "up2", false]);
        gpSeen.add(otherGps[i].id);
        gpSeen.add(otherGps[i + 1].id);
      } else {
        gpPairs.push([otherGps[i], null, "up2", "up2", false]);
        gpSeen.add(otherGps[i].id);
      }
    }

    if (gpPairs.length > 0) {
      const secTop = yCursor;
      yCursor = secTop + HEADER_OFFSET;
      yGrandparents = yCursor;
      let gpCount = 0;
      gpPairs.forEach(([a, b, ga, gb, isMar]) => {
        if (a) {
          placePair(a, b, ga, gb, isMar);
          gpCount += (b ? 2 : 1);
        }
      });
      const secH = yCursor - secTop - lGap + SEC_PAD_BOTTOM;
      generationSections.push({
        id: "grandparents",
        top: secTop,
        height: secH,
        title: lang === "hi" ? "दादा जी, दादी जी एवं नाना जी, नानी जी" : "Grandparents (Dada ji - Dadi ji & Nana ji - Nani ji)",
        icon: "👑",
        count: gpCount,
        borderCls: "border-2 border-indigo-300/80 shadow-sm",
        bgCls: "bg-gradient-to-b from-indigo-50/90 via-indigo-50/65 to-white/95",
        headerBgCls: "bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white shadow-md border border-indigo-400/50",
        badgeCls: "bg-indigo-100 text-indigo-950 font-bold border border-indigo-300",
      });
      yCursor = secTop + secH + SEC_MARGIN_BOTTOM;
    }

    // 2. Generation +1 (Parents & Uncles/Aunts)
    const parList = [...parents, ...(tree?.uncles_and_aunts || [])];
    const parSeen = new Set<string>();
    const parPairs: [Node, Node | null, keyof typeof GEN_STYLE, keyof typeof GEN_STYLE, boolean][] = [];

    // Father + Mother ALWAYS together!
    if (father && mother && father.id !== mother.id) {
      parPairs.push([father, mother, "up1", "up1", true]);
      parSeen.add(father.id);
      parSeen.add(mother.id);
    } else {
      if (father) { parPairs.push([father, null, "up1", "up1", false]); parSeen.add(father.id); }
      if (mother) { parPairs.push([mother, null, "up1", "up1", false]); parSeen.add(mother.id); }
    }

    // Uncles / Aunts with their spouses in couples
    parList.forEach((n) => {
      if (parSeen.has(n.id) || posById.has(n.id)) return;
      const sp = getSpouseOf(n.id) || (spousesOfMap[n.id] || []).find((s) => !parSeen.has(s.id) && !posById.has(s.id));
      if (sp && !parSeen.has(sp.id) && !posById.has(sp.id)) {
        parSeen.add(n.id);
        parSeen.add(sp.id);
        parPairs.push([n, sp, "up1", "spouse", true]);
      }
    });

    // Remaining single uncles / aunts -> pair two-by-two in lines of 2, NOT married!
    const singlePars: Node[] = [];
    parList.forEach((n) => {
      if (!parSeen.has(n.id) && !posById.has(n.id)) {
        parSeen.add(n.id);
        singlePars.push(n);
      }
    });
    for (let i = 0; i < singlePars.length; i += 2) {
      if (i + 1 < singlePars.length) {
        parPairs.push([singlePars[i], singlePars[i + 1], "up1", "up1", false]);
      } else {
        parPairs.push([singlePars[i], null, "up1", "up1", false]);
      }
    }

    if (parPairs.length > 0) {
      const secTop = yCursor;
      yCursor = secTop + HEADER_OFFSET;
      yParents = yCursor;
      let parCount = 0;
      parPairs.forEach(([a, b, ga, gb, isMar]) => {
        if (a) {
          placePair(a, b, ga, gb, isMar);
          parCount += (b ? 2 : 1);
        }
      });
      const secH = yCursor - secTop - lGap + SEC_PAD_BOTTOM;
      generationSections.push({
        id: "parents",
        top: secTop,
        height: secH,
        title: lang === "hi" ? "माता-पिता, चाचा-चाची व बुआ" : "Parents, Chacha-Chachi, Bua",
        icon: "🌻",
        count: parCount,
        borderCls: "border-2 border-amber-300/90 shadow-sm",
        bgCls: "bg-gradient-to-b from-amber-50/90 via-amber-50/65 to-white/95",
        headerBgCls: "bg-gradient-to-r from-amber-800 via-yellow-700 to-amber-900 text-amber-50 shadow-md border border-amber-400/50",
        badgeCls: "bg-amber-100 text-amber-950 font-bold border border-amber-300",
      });
      yCursor = secTop + secH + SEC_MARGIN_BOTTOM;
    }

    // 3. Generation 0 (Self & Same Generation)
    const secTopSelf = yCursor;
    yCursor = secTopSelf + HEADER_OFFSET;
    ySelf = yCursor;
    yMid = yCursor;
    centreX = cx;

    let selfSibCount = 1;
    const primarySpouse = spouses.find((s) => !posById.has(s.id)) || getSpouseOf(tree?.centre.id || "");
    const selfNode = tree?.centre
      ? { ...tree.centre, relation: "self" }
      : { id: "self", display_name: "Self", relation: "self" };
    if (primarySpouse && primarySpouse.id !== selfNode.id) {
      placePair(selfNode, primarySpouse, "self", "spouse", true);
      selfSibCount++;
    } else {
      placePair(selfNode, null, "self");
    }

    // Deduplicate all siblings of centre
    const centreSiblingMap = new Map<string, Node>();
    (tree?.siblings || []).forEach((s) => centreSiblingMap.set(s.id, s));
    if (tree?.centre) {
      (tree?.siblings_of?.[tree.centre.id] || []).forEach((s) => centreSiblingMap.set(s.id, s));
    }
    if (father?.id) {
      (tree?.children_of?.[father.id] || []).forEach((s) => {
        if (s.id !== tree?.centre.id) {
          centreSiblingMap.set(s.id, { ...s, relation: "sibling", via_id: father.id });
        }
      });
    }
    if (mother?.id) {
      (tree?.children_of?.[mother.id] || []).forEach((s) => {
        if (s.id !== tree?.centre.id) {
          centreSiblingMap.set(s.id, { ...s, relation: "sibling", via_id: mother.id });
        }
      });
    }
    const allSiblingsList = Array.from(centreSiblingMap.values());
    const sibSeen = new Set<string>();
    const sibPairs: [Node, Node | null, keyof typeof GEN_STYLE, keyof typeof GEN_STYLE, boolean][] = [];

    // Siblings with spouses (Bhabhi / Jija ji)
    allSiblingsList.forEach((s) => {
      if (sibSeen.has(s.id) || posById.has(s.id)) return;
      const sp = getSpouseOf(s.id) || (spousesOfMap[s.id] || []).find((x) => !sibSeen.has(x.id) && !posById.has(x.id) && x.id !== tree?.centre.id);
      if (sp && sp.id !== tree?.centre.id && !sibSeen.has(sp.id)) {
        sibSeen.add(s.id);
        sibSeen.add(sp.id);
        sibPairs.push([{ ...s, relation: "sibling" }, { ...sp, relation: "spouse", via_id: s.id }, "sibling", "spouse", true]);
      }
    });

    // Remaining single siblings -> pair two-by-two in lines of 2, NOT married!
    const singleSibs: Node[] = [];
    allSiblingsList.forEach((s) => {
      if (!sibSeen.has(s.id) && !posById.has(s.id)) {
        sibSeen.add(s.id);
        singleSibs.push(s);
      }
    });
    for (let i = 0; i < singleSibs.length; i += 2) {
      if (i + 1 < singleSibs.length) {
        sibPairs.push([{ ...singleSibs[i], relation: "sibling" }, { ...singleSibs[i + 1], relation: "sibling" }, "sibling", "sibling", false]);
      } else {
        sibPairs.push([{ ...singleSibs[i], relation: "sibling" }, null, "sibling", "sibling", false]);
      }
    }

    sibPairs.forEach(([a, b, ga, gb, isMar]) => {
      if (a) {
        placePair(a, b, ga, gb, isMar);
        selfSibCount += (b ? 2 : 1);
      }
    });

    const secHSelf = yCursor - secTopSelf - lGap + SEC_PAD_BOTTOM;
    generationSections.push({
      id: "self_siblings",
      top: secTopSelf,
      height: secHSelf,
      title: lang === "hi" ? "स्वयं, जीवनसाथी व भाई-बहन" : "Self, Spouse & Siblings",
      icon: "⭐",
      count: selfSibCount,
      borderCls: "border-2 border-amber-400 shadow-md ring-2 ring-amber-300/40",
      bgCls: "bg-gradient-to-b from-amber-100/85 via-yellow-50/65 to-white/95",
      headerBgCls: "bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-amber-950 font-black shadow-md border border-yellow-300",
      badgeCls: "bg-amber-950 text-amber-100 font-bold border border-amber-800",
    });
    yCursor = secTopSelf + secHSelf + SEC_MARGIN_BOTTOM;

    // 4. Generation -1 (Children & Nephews/Nieces)
    const allGenMinus1: Node[] = [];
    const gen1Seen = new Set<string>();
    const addGen1M = (c: Node) => {
      if (!c || !c.id || gen1Seen.has(c.id) || posById.has(c.id)) return;
      gen1Seen.add(c.id);
      allGenMinus1.push(c);
    };
    (tree?.children || []).forEach(addGen1M);
    (levelsDown[0] || []).forEach(addGen1M);
    if (tree?.centre) {
      (tree?.children_of?.[tree.centre.id] || []).forEach(addGen1M);
    }
    allSiblingsList.forEach((s) => {
      (tree?.children_of?.[s.id] || []).forEach((c) => addGen1M({ ...c, relation: "child", via_id: s.id }));
    });

    const chSeen = new Set<string>();
    const chPairs: [Node, Node | null, keyof typeof GEN_STYLE, keyof typeof GEN_STYLE, boolean][] = [];

    // Children with spouses (Bahu / Damaad)
    allGenMinus1.forEach((c) => {
      if (chSeen.has(c.id) || posById.has(c.id)) return;
      const sp = getSpouseOf(c.id) || (spousesOfMap[c.id] || []).find((s) => !chSeen.has(s.id) && !posById.has(s.id));
      if (sp && !chSeen.has(sp.id) && !posById.has(sp.id)) {
        chSeen.add(c.id);
        chSeen.add(sp.id);
        chPairs.push([c, { ...sp, relation: "spouse", via_id: c.id }, "down1", "spouse", true]);
      }
    });

    // Single children & nephews -> pair two-by-two in lines of 2, NOT married!
    const singleChs: Node[] = [];
    allGenMinus1.forEach((c) => {
      if (!chSeen.has(c.id) && !posById.has(c.id)) {
        chSeen.add(c.id);
        singleChs.push(c);
      }
    });
    for (let i = 0; i < singleChs.length; i += 2) {
      if (i + 1 < singleChs.length) {
        chPairs.push([singleChs[i], singleChs[i + 1], "down1", "down1", false]);
      } else {
        chPairs.push([singleChs[i], null, "down1", "down1", false]);
      }
    }

    if (chPairs.length > 0) {
      const secTop = yCursor;
      yCursor = secTop + HEADER_OFFSET;
      yChildren = yCursor;
      let chCount = 0;
      chPairs.forEach(([a, b, ga, gb, isMar]) => {
        if (a) {
          placePair(a, b, ga, gb, isMar);
          chCount += (b ? 2 : 1);
        }
      });
      const secH = yCursor - secTop - lGap + SEC_PAD_BOTTOM;
      generationSections.push({
        id: "children",
        top: secTop,
        height: secH,
        title: lang === "hi" ? "बेटा-बेटी, बहू व दामाद (जंवाई)" : "Children, Bahu & Damaad/Jawai",
        icon: "🌱",
        count: chCount,
        borderCls: "border-2 border-emerald-300/90 shadow-sm",
        bgCls: "bg-gradient-to-b from-emerald-50/90 via-emerald-50/65 to-white/95",
        headerBgCls: "bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 text-white shadow-md border border-emerald-400/50",
        badgeCls: "bg-emerald-100 text-emerald-950 font-bold border border-emerald-300",
      });
      yCursor = secTop + secH + SEC_MARGIN_BOTTOM;
    }

    // 5. Generation -2 (Grandchildren)
    const allGenMinus2: Node[] = [];
    const gen2Seen = new Set<string>();
    const addGen2M = (gc: Node) => {
      if (!gc || !gc.id || gen2Seen.has(gc.id) || gen1Seen.has(gc.id) || posById.has(gc.id)) return;
      gen2Seen.add(gc.id);
      allGenMinus2.push(gc);
    };
    (tree?.grandchildren || []).forEach(addGen2M);
    (levelsDown[1] || []).forEach(addGen2M);
    allGenMinus1.forEach((c) => {
      (tree?.children_of?.[c.id] || []).forEach((gc) => addGen2M({ ...gc, relation: "grandchild", via_id: c.id }));
    });

    const gcSeen = new Set<string>();
    const gcPairs: [Node, Node | null, keyof typeof GEN_STYLE, keyof typeof GEN_STYLE, boolean][] = [];

    allGenMinus2.forEach((gc) => {
      if (gcSeen.has(gc.id) || posById.has(gc.id)) return;
      const sp = getSpouseOf(gc.id) || (spousesOfMap[gc.id] || []).find((s) => !posById.has(s.id));
      if (sp && !gcSeen.has(sp.id) && !posById.has(sp.id)) {
        gcSeen.add(gc.id);
        gcSeen.add(sp.id);
        gcPairs.push([gc, { ...sp, relation: "spouse", via_id: gc.id }, "down2", "spouse", true]);
      }
    });

    const singleGcs: Node[] = [];
    allGenMinus2.forEach((gc) => {
      if (!gcSeen.has(gc.id) && !posById.has(gc.id)) {
        gcSeen.add(gc.id);
        singleGcs.push(gc);
      }
    });
    for (let i = 0; i < singleGcs.length; i += 2) {
      if (i + 1 < singleGcs.length) {
        gcPairs.push([singleGcs[i], singleGcs[i + 1], "down2", "down2", false]);
      } else {
        gcPairs.push([singleGcs[i], null, "down2", "down2", false]);
      }
    }

    if (gcPairs.length > 0) {
      const secTop = yCursor;
      yCursor = secTop + HEADER_OFFSET;
      yGrandchildren = yCursor;
      let gcCount = 0;
      gcPairs.forEach(([a, b, ga, gb, isMar]) => {
        if (a) {
          placePair(a, b, ga, gb, isMar);
          gcCount += (b ? 2 : 1);
        }
      });
      const secH = yCursor - secTop - lGap + SEC_PAD_BOTTOM;
      generationSections.push({
        id: "grandchildren",
        top: secTop,
        height: secH,
        title: lang === "hi" ? "पोता-पोती व नाती-नातिन" : "Grandchildren (Pota-Poti, Naati-Natni)",
        icon: "🍼",
        count: gcCount,
        borderCls: "border-2 border-purple-300/90 shadow-sm",
        bgCls: "bg-gradient-to-b from-purple-50/90 via-purple-50/65 to-white/95",
        headerBgCls: "bg-gradient-to-r from-purple-900 via-fuchsia-800 to-purple-950 text-white shadow-md border border-purple-400/50",
        badgeCls: "bg-purple-100 text-purple-950 font-bold border border-purple-300",
      });
      yCursor = secTop + secH + SEC_MARGIN_BOTTOM;
    }
    yCursor += 40;
  } else {
    // -----------------------------------------------------------------
    // DESKTOP / WIDE TREE CANVAS (Couple Units Layout)
    // -----------------------------------------------------------------
    // —— UP levels (farthest first) ——
    for (let di = levelsUp.length - 1; di >= 0; di--) {
      const level = levelsUp[di];
      const genKey = (di === 0 ? "up1" : di === 1 ? "up2" : "up3") as keyof typeof GEN_STYLE;

      // For di === 0 (Parents generation), include uncles and aunts if available
      const levelNodes = di === 0
        ? [...level, ...(tree?.uncles_and_aunts || []).filter((u) => !level.some((p) => p.id === u.id))]
        : level;

      type UpUnit = { nodes: Node[]; w: number };
      const units: UpUnit[] = [];
      const usedUp = new Set<string>();

      // 1. Group father & mother as couples if present
      const f = levelNodes.find(
        (n) => n.relation === "father" || (parents.some((p) => p.id === n.id) && resolveSex(n.gender, n.relation) === "M")
      );
      const m = levelNodes.find(
        (n) => n.relation === "mother" || (parents.some((p) => p.id === n.id) && resolveSex(n.gender, n.relation) === "F")
      );
      if (f && m) {
        usedUp.add(f.id);
        usedUp.add(m.id);
        const w = nameW(f.display_name) + coupleGap + nameW(m.display_name);
        units.push({ nodes: [f, m], w });
      }

      // 2. For each other relative in level, group with their spouses from spousesOfMap
      levelNodes.forEach((n) => {
        if (usedUp.has(n.id) || posById.has(n.id)) return;
        usedUp.add(n.id);
        const sps = (spousesOfMap[n.id] || []).filter((s) => !usedUp.has(s.id) && !posById.has(s.id));
        sps.forEach((s) => usedUp.add(s.id));
        if (sps.length > 0) {
          let w = nameW(n.display_name);
          sps.forEach((s) => {
            w += coupleGap + nameW(s.display_name);
          });
          units.push({ nodes: [n, ...sps], w });
        } else {
          units.push({ nodes: [n], w: nameW(n.display_name) });
        }
      });

      const totalW =
        units.reduce((s, u) => s + u.w, 0) + gap * Math.max(0, units.length - 1);
      contentW = Math.max(contentW, totalW + pad * 2);
      let cursor = (contentW - totalW) / 2;

      units.forEach((u) => {
        let x = cursor;
        const mw = nameW(u.nodes[0].display_name);
        placeNode(u.nodes[0], x + mw / 2, yCursor, genKey);
        x += mw;
        for (let ni = 1; ni < u.nodes.length; ni++) {
          x += coupleGap;
          const sw = nameW(u.nodes[ni].display_name);
          placeNode(
            { ...u.nodes[ni], relation: "spouse", via_id: u.nodes[0].id },
            x + sw / 2,
            yCursor,
            "spouse"
          );
          x += sw;
        }
        cursor += u.w + gap;
      });
      yCursor += subRowH + levelGap;
    }

    // —— Middle Row (Generation 0: Self + Siblings + Spouses) ——
    // Deduplicate all siblings of centre
    const centreSiblingMap = new Map<string, Node>();
    siblings.forEach((s) => centreSiblingMap.set(s.id, s));
    if (tree?.centre) {
      (tree?.siblings_of?.[tree.centre.id] || []).forEach((s) => centreSiblingMap.set(s.id, s));
    }
    if (father?.id) {
      (tree?.children_of?.[father.id] || []).forEach((s) => {
        if (s.id !== tree?.centre.id) {
          centreSiblingMap.set(s.id, { ...s, relation: "sibling", via_id: father.id });
        }
      });
    }
    if (mother?.id) {
      (tree?.children_of?.[mother.id] || []).forEach((s) => {
        if (s.id !== tree?.centre.id) {
          centreSiblingMap.set(s.id, { ...s, relation: "sibling", via_id: mother.id });
        }
      });
    }
    const allSiblings = Array.from(centreSiblingMap.values());

    type Gen0Unit = {
      main: Node;
      spouses: Node[];
      width: number;
      isSelf: boolean;
      orderWeight: number;
    };

    const gen0Units: Gen0Unit[] = [];

    // Build sibling couple units
    allSiblings.forEach((s) => {
      if (posById.has(s.id)) return;
      const sps = (spousesOfMap[s.id] || []).filter(
        (sp) => sp.id !== tree?.centre.id && !posById.has(sp.id)
      );
      let w = nameW(s.display_name);
      sps.forEach((sp) => {
        w += coupleGap + nameW(sp.display_name);
      });

      const relInfo = resolveIndianRelationship(s, tree, lang);
      const isElder =
        relInfo.shortTag.includes("बड़े") ||
        relInfo.shortTag.includes("बड़ी") ||
        relInfo.shortTagEn.toLowerCase().includes("elder") ||
        relInfo.primaryTitle.includes("बड़े") ||
        relInfo.primaryTitle.includes("बड़ी");
      const isSister =
        relInfo.shortTag.includes("बहन") || relInfo.shortTagEn.toLowerCase().includes("sister");

      // Order: Elder brothers leftmost (-200), Elder sisters (-100), Younger brothers (+100), Younger sisters (+200)
      let weight = 0;
      if (isElder) {
        weight = isSister ? -100 : -200;
      } else {
        weight = isSister ? 200 : 100;
      }

      gen0Units.push({
        main: { ...s, relation: "sibling" },
        spouses: sps,
        width: w,
        isSelf: false,
        orderWeight: weight,
      });
    });

    // Sort sibling units so elders are on left, younger on right
    gen0Units.sort((a, b) => a.orderWeight - b.orderWeight);

    // Self + Spouses unit
    let selfBandW = nameW(tree?.centre.display_name || "Self", 180);
    const selfSpouses = spousesList.filter((sp) => !posById.has(sp.id));
    selfSpouses.forEach((sp) => {
      selfBandW += coupleGap + nameW(sp.display_name);
    });

    const selfUnit: Gen0Unit = {
      main: tree
        ? { ...tree.centre, relation: "self" }
        : { id: "self", display_name: "Self", relation: "self" },
      spouses: selfSpouses,
      width: selfBandW,
      isSelf: true,
      orderWeight: 0,
    };

    // Insert Self in the center between negative and positive weights
    const splitIdx = gen0Units.findIndex((u) => u.orderWeight > 0);
    if (splitIdx === -1) {
      gen0Units.push(selfUnit);
    } else {
      gen0Units.splice(splitIdx, 0, selfUnit);
    }

    // Calculate total row width
    const totalGen0W =
      gen0Units.reduce((acc, u) => acc + u.width, 0) +
      gap * Math.max(0, gen0Units.length - 1);
    contentW = Math.max(contentW, totalGen0W + pad * 2 + 40);

    yMid = yCursor + 8;
    let cursor = (contentW - totalGen0W) / 2;
    centreX = cursor + selfBandW / 2;

    gen0Units.forEach((u) => {
      let x = cursor;
      const mw = nameW(u.main.display_name, u.isSelf ? 180 : undefined);
      const mainCx = x + mw / 2;
      placeNode(u.main, mainCx, yMid, u.isSelf ? "self" : "sibling");
      if (u.isSelf) {
        centreX = mainCx;
      }
      x += mw;

      u.spouses.forEach((sp) => {
        x += coupleGap;
        const sw = nameW(sp.display_name);
        const spCx = x + sw / 2;
        placeNode(
          { ...sp, relation: "spouse", via_id: u.main.id },
          spCx,
          yMid,
          "spouse"
        );
        x += sw;
      });

      cursor += u.width + gap;
    });

    yCursor = yMid + subRowH + levelGap;

    // —— DOWN levels: Generation -1 (Children & Nephews/Nieces) and Generation -2 (Grandchildren) ——
    // Gather Generation -1 nodes
    const genMinus1Nodes: Node[] = [];
    const seenGen1 = new Set<string>();
    const addGen1 = (n: Node) => {
      if (!n || !n.id || seenGen1.has(n.id) || posById.has(n.id)) return;
      seenGen1.add(n.id);
      genMinus1Nodes.push(n);
    };

    (tree?.children || []).forEach(addGen1);
    (levelsDown[0] || []).forEach(addGen1);
    if (tree?.centre) {
      (tree?.children_of?.[tree.centre.id] || []).forEach(addGen1);
    }
    // Nephews & nieces (children of siblings)
    allSiblings.forEach((s) => {
      (tree?.children_of?.[s.id] || []).forEach((c) => {
        addGen1({ ...c, relation: "child", via_id: s.id });
      });
    });

    // Gather Generation -2 nodes
    const genMinus2Nodes: Node[] = [];
    const seenGen2 = new Set<string>();
    const addGen2 = (n: Node) => {
      if (!n || !n.id || seenGen2.has(n.id) || seenGen1.has(n.id) || posById.has(n.id)) return;
      seenGen2.add(n.id);
      genMinus2Nodes.push(n);
    };

    (tree?.grandchildren || []).forEach(addGen2);
    (levelsDown[1] || []).forEach(addGen2);
    genMinus1Nodes.forEach((c) => {
      (tree?.children_of?.[c.id] || []).forEach((gc) => {
        addGen2({ ...gc, relation: "grandchild", via_id: c.id });
      });
    });

    const downLevelsNodes = [genMinus1Nodes, genMinus2Nodes].filter((l) => l.length > 0);

    for (let di = 0; di < downLevelsNodes.length; di++) {
      const level = downLevelsNodes[di];
      const genKey = (di === 0 ? "down1" : "down2") as keyof typeof GEN_STYLE;

      type DownUnit = {
        main: Node;
        sps: Node[];
        w: number;
        preferX: number;
        idealLeft: number;
        actualLeft: number;
      };
      const units: DownUnit[] = [];
      const usedSp = new Set<string>();

      level.forEach((n) => {
        if (posById.has(n.id)) return;
        const sps = (spousesOfMap[n.id] || []).filter(
          (s) => !posById.has(s.id) && !usedSp.has(s.id)
        );
        sps.forEach((s) => usedSp.add(s.id));
        let w = nameW(n.display_name);
        sps.forEach((s) => {
          w += coupleGap + nameW(s.display_name);
        });
        const via = n.via_id || n.via_child_id || tree?.centre.id || "";
        const preferX = posById.get(via)?.x ?? centreX;
        units.push({
          main: n,
          sps,
          w,
          preferX,
          idealLeft: preferX - w / 2,
          actualLeft: preferX - w / 2,
        });
      });

      if (units.length === 0) continue;

      // Sort by preferX so children naturally stay beneath their own parent
      units.sort((a, b) => a.preferX - b.preferX || a.idealLeft - b.idealLeft);

      const totalW =
        units.reduce((s, u) => s + u.w, 0) + gap * Math.max(0, units.length - 1);
      contentW = Math.max(contentW, totalW + pad * 2);

      if (units.length === 1) {
        units[0].actualLeft = Math.max(
          pad,
          Math.min(contentW - pad - units[0].w, units[0].preferX - units[0].w / 2)
        );
      } else {
        let cur = pad;
        units.forEach((u) => {
          u.actualLeft = Math.max(cur, u.preferX - u.w / 2);
          cur = u.actualLeft + u.w + gap;
        });
        const overflow = cur - gap - (contentW - pad);
        if (overflow > 0) {
          contentW += overflow;
        }
      }

      units.forEach((u) => {
        let x = u.actualLeft;
        const mw = nameW(u.main.display_name);
        placeNode(u.main, x + mw / 2, yCursor, genKey);
        x += mw;

        u.sps.forEach((s) => {
          x += coupleGap;
          const sw = nameW(s.display_name);
          placeNode(
            { ...s, relation: "spouse", via_id: u.main.id },
            x + sw / 2,
            yCursor,
            "spouse"
          );
          x += sw;
        });
      });

      yCursor += subRowH + levelGap;
    }

    // Any remaining spouses_of not placed
    Object.entries(spousesOfMap).forEach(([ownerId, list]) => {
      const owner = posById.get(ownerId);
      if (!owner) return;
      list.forEach((s, i) => {
        if (posById.has(s.id)) return;
        const w = nameW(s.display_name);
        const x = owner.x + owner.w / 2 + coupleGap + w / 2 + i * (w + gap);
        placeNode({ ...s, relation: "spouse", via_id: ownerId }, x, owner.top, "spouse");
        contentW = Math.max(contentW, x + w / 2 + pad);
      });
    });

    // —— Global no-overlap resolve (pinned / arranged bubbles never auto-move) ——
    {
      type Box = { id: string; x: number; top: number; w: number };
      const pinnedIds = new Set(Object.keys(floatPos));
      const boxes: Box[] = placed.map((pl) => ({
        id: pl.n.id,
        x: pl.x,
        top: pl.top,
        w: pl.w,
      }));
      const GAP_X = 12;
      const GAP_Y = 8;
      for (let iter = 0; iter < 40; iter++) {
        let moved = false;
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i];
            const b = boxes[j];
            // User-arranged positions are locked until they Move again
            if (pinnedIds.has(a.id) || pinnedIds.has(b.id)) continue;
            const ax0 = a.x - a.w / 2;
            const ax1 = a.x + a.w / 2;
            const bx0 = b.x - b.w / 2;
            const bx1 = b.x + b.w / 2;
            const ay0 = a.top;
            const ay1 = a.top + BH;
            const by0 = b.top;
            const by1 = b.top + BH;
            if (ax0 >= bx1 + GAP_X || bx0 >= ax1 + GAP_X) continue;
            if (ay0 >= by1 + GAP_Y || by0 >= ay1 + GAP_Y) continue;
            const sameRow = Math.abs(a.top - b.top) < BH * 0.6;
            if (sameRow) {
              const need = (a.w + b.w) / 2 + GAP_X;
              const mid = (a.x + b.x) / 2;
              if (a.x <= b.x) {
                a.x = mid - need / 2;
                b.x = mid + need / 2;
              } else {
                b.x = mid - need / 2;
                a.x = mid + need / 2;
              }
              // still overlap? stagger vertical
              if (Math.abs(a.x - b.x) < need - 1) {
                if (a.top <= b.top) b.top = a.top + BH + GAP_Y;
                else a.top = b.top + BH + GAP_Y;
              }
            } else {
              if (a.top <= b.top) b.top = Math.max(b.top, a.top + BH + GAP_Y);
              else a.top = Math.max(a.top, b.top + BH + GAP_Y);
            }
            moved = true;
          }
        }
        if (!moved) break;
      }
      // normalize: shift so min left >= pad, expand contentW
      let minL = Infinity;
      let maxR = 0;
      let maxBottom = 0;
      boxes.forEach((b) => {
        minL = Math.min(minL, b.x - b.w / 2);
        maxR = Math.max(maxR, b.x + b.w / 2);
        maxBottom = Math.max(maxBottom, b.top + BH);
      });
      const shift = minL < pad ? pad - minL : 0;
      boxes.forEach((b) => {
        b.x += shift;
      });
      contentW = Math.max(contentW, maxR + shift + pad);
      boxes.forEach((b) => {
        posById.set(b.id, { x: b.x, top: b.top, w: b.w });
      });
      placed.forEach((pl) => {
        const p = posById.get(pl.n.id);
        if (p) {
          pl.x = p.x;
          pl.top = p.top;
        }
      });
      yCursor = Math.max(yCursor, maxBottom + 32);
    }
  }

  const W = contentW;
  const cx = W / 2;
  // centreX already set during placement; refresh from pos after resolve
  const centreXResolved = posById.get(tree?.centre.id || "")?.x ?? centreX;
  const yMidPos = posById.get(tree?.centre.id || "")?.top ?? yMid;

  const parentsSorted = [...parents].sort((a, b) => {
    const ra = a.relation === "father" ? 0 : a.relation === "mother" ? 1 : 2;
    const rb = b.relation === "father" ? 0 : b.relation === "mother" ? 1 : 2;
    return ra - rb;
  });
  const parXs = parentsSorted.map((p) => posById.get(p.id)?.x ?? cx);
  const parRows = parentsSorted.map(() => 0);
  const yPar = parentsSorted.length
    ? Math.min(...parentsSorted.map((p) => posById.get(p.id)?.top ?? 0))
    : 0;
  const parentXById = new Map(parentsSorted.map((p) => [p.id, posById.get(p.id)?.x ?? cx]));
  const parentRowById = new Map(parentsSorted.map((p) => [p.id, 0]));
  const parMaxRow = 0;
  const parAdd = { x: cx, row: 0 };
  const chXs = children.map((c) => posById.get(c.id)?.x ?? cx);
  const chRows = children.map(() => 0);
  const chMaxRow = 0;
  const yChild = children.length
    ? Math.min(...children.map((c) => posById.get(c.id)?.top ?? 0))
    : 0;
  const childXById = new Map(children.map((c) => [c.id, posById.get(c.id)?.x ?? cx]));
  const childWById = new Map(children.map((c) => [c.id, nameW(c.display_name)]));
  const chAdd = { x: cx, row: 0 };
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
    ? Math.min(...gcPositions.map((g) => posById.get(g.n.id)?.top ?? 0))
    : -80;
  const gcMaxRow = 0;

  let H = yCursor + 40;
  // room under centre row for sibling U-curves
  H = Math.max(H, yMid + BUBBLE_H + 36);

  // Place siblings of non-self members
  // LOCK: only colour rule change for SELF GENERATION —
  //   Self = self colour · Spouse = pink · Self siblings = yellow · Spouse siblings = yellow
  // Uncles/aunts etc. keep owner generation colour (unchanged)
  const sibOf = tree?.siblings_of || {};
  const centreSibIds = new Set((tree?.siblings || []).map((s) => s.id));
  if (tree) centreSibIds.add(tree.centre.id);
  const centreSpouseIds = new Set((spousesList || []).map((s) => s.id));
  const placedIds = new Set(placed.map((p) => p.n.id));
  if (tree) placedIds.add(tree.centre.id);
  if (!is2ColActive) {
    for (const [ownerId, list] of Object.entries(sibOf)) {
      if (ownerId === tree?.centre.id) continue; // centre siblings already on row
      const owner = posById.get(ownerId);
      if (!owner) continue;
      const ownerGen = (placed.find((p) => p.n.id === ownerId)?.genKey ||
        "up1") as keyof typeof GEN_STYLE;
      // Spouse of centre → same generation as Self → yellow sibling colour
      const isCentreSpouse = centreSpouseIds.has(ownerId);
      const genForSib = isCentreSpouse ? ("sibling" as keyof typeof GEN_STYLE) : ownerGen;
      let i = 0;
      for (const s of list) {
        if (placedIds.has(s.id)) continue;
        if (centreSibIds.has(s.id)) continue;
        const w = nameW(s.display_name);
        const parentVia = s.via_id || s.via_parent_id || undefined;
        if (isCentreSpouse) {
          // same row as Self/Spouse (yMid), to the right of spouse cluster
          const side = i % 2 === 0 ? 1 : -1;
          const rank = Math.floor(i / 2) + 1;
          const x = owner.x + side * (owner.w / 2 + w / 2 + 18 + rank * 10);
          placeNode(
            {
              ...s,
              relation: "sibling",
              via_id: parentVia,
              via_parent_id: parentVia,
            },
            x,
            yMid,
            genForSib
          );
          contentW = Math.max(contentW, x + w / 2 + pad);
        } else {
          const side = i % 2 === 0 ? -1 : 1;
          const rank = Math.floor(i / 2) + 1;
          const x = owner.x + side * (owner.w / 2 + w / 2 + 20 + rank * 10);
          const top = owner.top + (side < 0 ? -4 : 4) * (rank % 2);
          placeNode(
            {
              ...s,
              relation: "sibling",
              via_id: parentVia,
              via_parent_id: parentVia,
            },
            x,
            top,
            genForSib
          );
        }
        placedIds.add(s.id);
        i++;
      }
    }

    // Apply free-float drag overrides (lines track these)
    Object.keys(floatPos).forEach((id) => {
      const fp = floatPos[id];
      if (!fp) return;
      const cur = posById.get(id);
      if (cur) posById.set(id, { x: fp.x, top: fp.top, w: cur.w });
      const pl = placed.find((p) => p.n.id === id);
      if (pl) {
        pl.x = fp.x;
        pl.top = fp.top;
      }
    });
  }
  // Snapshot for auto-freeze (delete must not reshuffle others)
  {
    const snapPos: Record<string, { x: number; top: number }> = {};
    placed.forEach((pl) => {
      snapPos[pl.n.id] = { x: pl.x, top: pl.top };
    });
    placedLayoutRef.current = snapPos;
  }


  if (tree) {
    const sp = posById.get(tree.centre.id);
    if (sp) selfLayoutRef.current = { x: sp.x, y: sp.top + BUBBLE_H / 2 };
  }

  type BloodSegment = {
    key: string;
    d: string;
    isLeaf?: boolean;
  };
  type RopeKnotAnchor = {
    key: string;
    x: number;
    y: number;
    isBottom?: boolean;
    corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  };

  const bloodSegments: BloodSegment[] = [];
  const bloodKnots: RopeKnotAnchor[] = [];
  type BloodJunction = { key: string; x: number; y: number };
  const bloodJunctions: BloodJunction[] = [];
  const knotSeen = new Set<string>();

  const addKnot = (
    id: string,
    x: number,
    y: number,
    isBottom: boolean,
    corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  ) => {
    const k = `${id}-${isBottom ? "bot" : "top"}`;
    if (knotSeen.has(k)) return;
    knotSeen.add(k);
    bloodKnots.push({ key: `knot-${k}`, x, y, isBottom, corner });
  };

  type SibLn = { x1: number; y1: number; x2: number; y2: number; key: string; label?: string };
  const linesSibling: SibLn[] = [];

  const bloodUnitDrawn = new Set<string>();
  const createBloodUnit = (
    unitKey: string,
    parent1Id: string | null | undefined,
    parent2Id: string | null | undefined,
    childIds: (string | null | undefined)[],
    preferredLane?: "left" | "right" | "center"
  ) => {
    if (bloodUnitDrawn.has(unitKey)) return;
    bloodUnitDrawn.add(unitKey);
    if (!parent1Id && !parent2Id) return;

    const validP1 = parent1Id ? posById.get(parent1Id) : null;
    const validP2 = parent2Id ? posById.get(parent2Id) : null;
    if (!validP1 && !validP2) return;

    const p1 = validP1 ? { id: parent1Id!, pos: validP1 } : { id: parent2Id!, pos: validP2! };
    const p2 = validP1 && validP2 ? { id: parent2Id!, pos: validP2 } : null;

    const validChildren = (childIds || [])
      .filter((cid): cid is string => Boolean(cid && posById.has(cid)))
      .map((cid) => ({ id: cid, pos: posById.get(cid)! }));

    if (validChildren.length === 0) return;

    const cardH = is2ColActive ? 66 : BUBBLE_H;
    const cx = is2ColActive ? W / 2 : (p2 ? (p1.pos.x + p2.pos.x) / 2 : p1.pos.x);

    // Precise corner dock router:
    // Upward connection (isTop): Right side members -> Top-Right corner; Left side members -> Top-Left corner
    // Downward connection (isBottom): Right side members -> Bottom-Right corner; Left side members -> Bottom-Left corner
    const getCornerDock = (
      id: string,
      pos: { x: number; top: number; w: number },
      isTop: boolean
    ) => {
      const isRightSide = pos.x >= cx;
      const cornerInset = 6;
      const x = isRightSide
        ? pos.x + pos.w / 2 - cornerInset
        : pos.x - pos.w / 2 + cornerInset;
      const y = isTop ? pos.top + 2 : pos.top + cardH - 2;
      const corner: "top-left" | "top-right" | "bottom-left" | "bottom-right" = isTop
        ? (isRightSide ? "top-right" : "top-left")
        : (isRightSide ? "bottom-right" : "bottom-left");

      addKnot(id, x, y, !isTop, corner);
      return { x, y, isRightSide, corner };
    };

    // 1. Bottom corner dock points at parent card(s)
    // Left parent -> bottom-left corner; Right parent -> bottom-right corner
    const p1Bottom = getCornerDock(p1.id, p1.pos, false);
    const p2Bottom = p2 ? getCornerDock(p2.id, p2.pos, false) : null;

    // 2. Junction coordinates in inter-generation corridor
    let jx = cx;
    if (preferredLane === "left") {
      jx = is2ColActive ? cx - 4 : p1Bottom.x;
    } else if (preferredLane === "right") {
      jx = is2ColActive ? cx + 4 : (p2Bottom ? p2Bottom.x : cx);
    } else if (!is2ColActive) {
      jx = p2Bottom ? (p1Bottom.x + p2Bottom.x) / 2 : p1Bottom.x;
    }

    const maxPBottom = Math.max(p1Bottom.y, p2Bottom ? p2Bottom.y : p1Bottom.y);
    const minCTop = Math.min(...validChildren.map((c) => c.pos.top));
    const jy = is2ColActive
      ? Math.max(maxPBottom + 16, minCTop - 16)
      : (minCTop > maxPBottom + 20
          ? maxPBottom + (minCTop - maxPBottom) * 0.38
          : maxPBottom + 18);

    const junc = { x: jx, y: jy };
    bloodJunctions.push({ key: `bjunc-${unitKey}`, x: jx, y: jy });

    // 3. Parent 1 to Junction
    bloodSegments.push({
      key: `bseg-p1-${unitKey}`,
      d: bezierCurve(p1Bottom, junc),
      isLeaf: false,
    });

    // 4. Parent 2 to Junction (if present)
    if (p2Bottom) {
      bloodSegments.push({
        key: `bseg-p2-${unitKey}`,
        d: bezierCurve(p2Bottom, junc),
        isLeaf: false,
      });
    }

    // 5. Junction to each Child (with dedicated untangled lanes & sacred thread corner knot)
    validChildren.forEach((c) => {
      // Top corner dock point at destination child card
      // Left child -> top-left corner; Right child -> top-right corner
      const cTop = getCornerDock(c.id, c.pos, true);

      const isMultiRow = is2ColActive && c.pos.top > minCTop + 30;
      const isLeftCol = c.pos.x < cx;

      bloodSegments.push({
        key: `bseg-c-${unitKey}-${c.id}`,
        d: routeTangleFreeChildLine(junc, cTop, cx, is2ColActive, isMultiRow, isLeftCol),
        isLeaf: true,
      });
    });
  };

  // 1. Grandparents -> Parents (Paternal Dada/Dadi -> Father, Maternal Nana/Nani -> Mother)
  const gpBloodList = (tree?.grandparents || []).concat(levelsUp[1] || []);
  const isMaternalGpNode = (g: Node) => {
    const r = (g.relation || "").toLowerCase();
    if (r.includes("nana") || r.includes("nani") || r.includes("maternal")) return true;
    if (mother && (g.via_id === mother.id || g.via_parent_id === mother.id)) return true;
    return false;
  };
  const isPaternalGpNode = (g: Node) => {
    const r = (g.relation || "").toLowerCase();
    if (r.includes("dada") || r.includes("dadi") || r.includes("paternal")) return true;
    if (father && (g.via_id === father.id || g.via_parent_id === father.id)) return true;
    return false;
  };

  const dada = gpBloodList.find((g) => isPaternalGpNode(g) && resolveSex(g.gender, g.relation) === "M")
    || gpBloodList.find((g) => !isMaternalGpNode(g) && resolveSex(g.gender, g.relation) === "M" && (!g.via_id || g.via_id === father?.id));
  const dadi = gpBloodList.find((g) => isPaternalGpNode(g) && resolveSex(g.gender, g.relation) === "F")
    || gpBloodList.find((g) => !isMaternalGpNode(g) && resolveSex(g.gender, g.relation) === "F" && (!g.via_id || g.via_id === father?.id));
  if (father && (dada || dadi)) {
    const paternalKids = new Set<string>();
    paternalKids.add(father.id);
    (tree?.uncles_and_aunts || []).forEach((u) => {
      if (!isMaternalGpNode(u)) paternalKids.add(u.id);
    });
    if (dada?.id) {
      (tree?.children_of?.[dada.id] || []).forEach((u) => paternalKids.add(u.id));
    }
    if (dadi?.id) {
      (tree?.children_of?.[dadi.id] || []).forEach((u) => paternalKids.add(u.id));
    }
    createBloodUnit("gp-paternal", dada?.id, dadi?.id, Array.from(paternalKids), "left");
  }
  const nana = gpBloodList.find((g) => isMaternalGpNode(g) && resolveSex(g.gender, g.relation) === "M")
    || gpBloodList.find((g) => g.id !== dada?.id && resolveSex(g.gender, g.relation) === "M");
  const nani = gpBloodList.find((g) => isMaternalGpNode(g) && resolveSex(g.gender, g.relation) === "F")
    || gpBloodList.find((g) => g.id !== dadi?.id && resolveSex(g.gender, g.relation) === "F");
  if (mother && (nana || nani)) {
    const maternalKids = new Set<string>();
    maternalKids.add(mother.id);
    (tree?.uncles_and_aunts || []).forEach((u) => {
      if (isMaternalGpNode(u)) maternalKids.add(u.id);
    });
    if (nana?.id) {
      (tree?.children_of?.[nana.id] || []).forEach((u) => maternalKids.add(u.id));
    }
    if (nani?.id) {
      (tree?.children_of?.[nani.id] || []).forEach((u) => maternalKids.add(u.id));
    }
    createBloodUnit("gp-maternal", nana?.id, nani?.id, Array.from(maternalKids), "right");
  }

  const allSelfSiblingIds = new Set<string>();
  if (tree?.centre?.id) {
    (tree.siblings || []).forEach((s) => allSelfSiblingIds.add(s.id));
    if (tree.siblings_of?.[tree.centre.id]) {
      tree.siblings_of[tree.centre.id].forEach((s) => allSelfSiblingIds.add(s.id));
    }
    if (father?.id) {
      (tree.children_of?.[father.id] || []).forEach((s) => {
        if (s.id !== tree.centre.id) allSelfSiblingIds.add(s.id);
      });
    }
    if (mother?.id) {
      (tree.children_of?.[mother.id] || []).forEach((s) => {
        if (s.id !== tree.centre.id) allSelfSiblingIds.add(s.id);
      });
    }
  }

  // 2. Parents -> Self & Siblings (Dual/Single fork from Parents down to Self and all Siblings)
  if (tree && (father || mother)) {
    const parentKidIds = [tree.centre.id, ...Array.from(allSelfSiblingIds)];
    createBloodUnit(
      "parents-to-self-and-siblings",
      father?.id,
      mother?.id,
      parentKidIds,
      "center"
    );
  }

  // 3. Self & Spouse -> Children (Dual fork from Self & Spouse down to all children)
  if (tree?.centre) {
    const kidIds = (tree.children || []).concat(levelsDown[0] || []).concat((tree.children_of || {})[tree.centre.id] || []).map((c) => c.id);
    const uniqKids = Array.from(new Set(kidIds));
    const selfSpouse = spouses[0] || (spousesOfMap[tree.centre.id] || [])[0];
    createBloodUnit("self-to-kids", tree.centre.id, selfSpouse?.id, uniqKids, "center");
  }

  // 4. Children & Children Spouses -> Grandchildren
  if (tree) {
    const allKidsList = (tree.children || []).concat(levelsDown[0] || []);
    const handledGkids = new Set<string>();
    allKidsList.forEach((c) => {
      const cGkids = ((tree.children_of || {})[c.id] || []).map((gc) => gc.id);
      (tree.grandchildren || []).concat(levelsDown[1] || []).forEach((gc) => {
        if (gc.via_id === c.id || gc.via_child_id === c.id) {
          if (!cGkids.includes(gc.id)) cGkids.push(gc.id);
        }
      });
      if (cGkids.length > 0) {
        cGkids.forEach((gkid) => handledGkids.add(gkid));
        const cSpouse = getSpouseOf(c.id) || (spousesOfMap[c.id] || [])[0];
        createBloodUnit(`child-gkids-${c.id}`, c.id, cSpouse?.id, cGkids, "center");
      }
    });

    const remainingGkids = (tree.grandchildren || []).concat(levelsDown[1] || []).filter((gc) => !handledGkids.has(gc.id)).map((gc) => gc.id);
    if (remainingGkids.length > 0) {
      const repChild = allKidsList[0];
      if (repChild) {
        createBloodUnit("gkids-fallback", repChild.id, null, remainingGkids);
      }
    }

    // 5. Siblings & Sibling Spouses -> Nephews & Nieces (Children of Siblings)
    Array.from(allSelfSiblingIds).forEach((sibId) => {
      const sKids = ((tree.children_of || {})[sibId] || []).map((k) => k.id);
      if (sKids.length > 0) {
        const sSpouse = getSpouseOf(sibId) || (spousesOfMap[sibId] || [])[0];
        createBloodUnit(`sib-kids-${sibId}`, sibId, sSpouse?.id, sKids, "center");
      }
    });
  }

  if (is2ColActive) {
    // 2-col active setup complete
  } else {
    // Wide canvas mode: Bloodline network is unified via createBloodUnit above

    if (tree) {
      const pairDrawn = new Set<string>();
      const pushSib = (
        a: { id: string; x: number; top: number; w: number },
        b: { id: string; x: number; top: number; w: number }
      ) => {
        const pk = [a.id, b.id].sort().join("|");
        if (pairDrawn.has(pk)) return;
        pairDrawn.add(pk);
        const left = a.x <= b.x ? a : b;
        const right = a.x <= b.x ? b : a;
        linesSibling.push({
          x1: left.x,
          y1: left.top + BUBBLE_H - 4,
          x2: right.x,
          y2: right.top + BUBBLE_H - 4,
          key: `sib-${a.id}-${b.id}`,
        });
      };

      const posOf = (id: string) => {
        const pos = posById.get(id);
        return pos ? { id, x: pos.x, top: pos.top, w: pos.w } : null;
      };

      const linkSiblingSet = (ids: string[]) => {
        const placedSet = ids.map(posOf).filter(Boolean) as {
          id: string;
          x: number;
          top: number;
          w: number;
        }[];
        if (placedSet.length < 2) return;
        placedSet.sort((a, b) => a.x - b.x || a.top - b.top);
        for (let i = 0; i < placedSet.length - 1; i++) {
          pushSib(placedSet[i], placedSet[i + 1]);
        }
      };

      // Group 1: Self + Self siblings
      const selfGroup = tree?.centre ? [tree.centre.id, ...siblings.map((s) => s.id)] : [];
      linkSiblingSet(selfGroup);

      // Group 2+: Father+uncles, GP+his brothers…
      const so = tree.siblings_of || {};

      for (const [ownerId, list] of Object.entries(so)) {
        if (ownerId === tree.centre.id) continue;
        const setIds = [ownerId, ...list.map((s) => s.id)];
        linkSiblingSet(setIds);
      }

      if (children.length >= 2) {
        linkSiblingSet(children.map((c) => c.id));
      }
    }
  }

  if (is2ColActive) {
    H = Math.max(H, yCursor + 80);
  }
  if (linesSibling.length) {
    const maxDip = Math.max(...linesSibling.map((l) => Math.max(l.y1, l.y2) + 24));
    H = Math.max(H, maxDip);
  }
  canvasSizeRef.current = { W, H, cx: W / 2, cy: H / 2 };

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

  const ZOOM_MIN = 0.18;
  const ZOOM_MAX = 2.5;
  const ZOOM_STEP = 0.1;
  const clampZoom = (z: number) =>
    Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));

  /** Self screen-centre */
  const centerSelfOnScreen = (z = 1) => {
    const sid = tree?.centre.id;
    const fp = sid ? floatPos[sid] : undefined;
    const sx = fp?.x ?? centreX;
    const sy = (fp?.top ?? yMid) + BUBBLE_H / 2;
    setZoom(z);
    setPan({
      x: vw / 2 - sx * z,
      y: vh / 2 - sy * z,
    });
  };

  /** Fit entire tree in viewport (default on open) */
  const fitTreeInView = (useW = W, useH = H) => {
    const padFit = 36;
    const zx = (vw - padFit) / Math.max(useW, 1);
    const zy = (vh - padFit) / Math.max(useH, 1);
    // zoom out enough to see all; never force zoom-in past 1 on open-fit
    const z = clampZoom(Math.min(zx, zy, 1));
    setZoom(z);
    setPan({
      x: vw / 2 - (useW / 2) * z,
      y: vh / 2 - (useH / 2) * z,
    });
  };

  /** Zoom keeping focal point (screen coords inside wrap) fixed */
  const zoomAt = (nextZ: number, focalX: number, focalY: number) => {
    const z1 = Math.max(zoom, 0.001);
    const z2 = clampZoom(nextZ);
    setPan((p) => ({
      x: focalX - ((focalX - p.x) / z1) * z2,
      y: focalY - ((focalY - p.y) / z1) * z2,
    }));
    setZoom(z2);
  };

  const zoomBy = (delta: number) => {
    zoomAt(zoom + delta, vw / 2, vh / 2);
  };
  const fitAll = () => {
    fitTreeInView(W, H);
  };
  const zoomReset = () => {
    centerSelfOnScreen(1);
  };

  const allTreeMembers = useMemo(() => {
    return Array.from(allNodesMap.values());
  }, [allNodesMap]);

  const listSections = useMemo(() => {
    if (!tree) return null;
    const seniors: Node[] = [];
    const parentsGen: Node[] = [];
    const selfGen: Node[] = [];
    const directChildren: Node[] = [];
    const siblingChildren: Node[] = [];
    const grandChildren: Node[] = [];

    const seenIds = new Set<string>();

    allTreeMembers.forEach((m) => {
      if (seenIds.has(m.id)) return;
      seenIds.add(m.id);
      const info = resolveIndianRelationship(m, tree, lang);
      if (info.generationTier >= 2) {
        seniors.push(m);
      } else if (info.generationTier === 1) {
        parentsGen.push(m);
      } else if (info.generationTier === 0) {
        selfGen.push(m);
      } else if (info.generationTier === -1) {
        if (
          info.primaryTitle.includes("भतीज") ||
          info.primaryTitle.includes("भांज") ||
          info.shortTag.includes("भतीज") ||
          info.shortTag.includes("भांज") ||
          info.primaryTitleEn.toLowerCase().includes("niece") ||
          info.primaryTitleEn.toLowerCase().includes("nephew")
        ) {
          siblingChildren.push(m);
        } else {
          directChildren.push(m);
        }
      } else {
        grandChildren.push(m);
      }
    });

    // Ensure self is first in selfGen
    selfGen.sort((a, b) => {
      if (a.id === tree.centre.id) return -1;
      if (b.id === tree.centre.id) return 1;
      return 0;
    });

    return {
      seniors,
      parentsGen,
      selfGen,
      directChildren,
      siblingChildren,
      grandChildren,
    };
  }, [allTreeMembers, tree, lang]);

  const searchMatches = useMemo(() => {
    const qStr = treeSearch.trim().toLowerCase();
    if (!qStr) return [];
    return allTreeMembers.filter((m) => {
      const relInfo = resolveIndianRelationship(m, tree, lang);
      return (
        m.display_name.toLowerCase().includes(qStr) ||
        lbl(lang, m.relation, m.gender).toLowerCase().includes(qStr) ||
        relInfo.shortTag.toLowerCase().includes(qStr) ||
        relInfo.primaryTitle.toLowerCase().includes(qStr)
      );
    });
  }, [treeSearch, allTreeMembers, tree, lang]);

  const focusMember = (n: Node) => {
    const pos = posById.get(n.id);
    if (!pos) return;
    setViewMode("tree");
    const targetZoom = 1.15;
    setZoom(targetZoom);
    setPan({
      x: vw / 2 - pos.x * targetZoom,
      y: vh / 2 - (pos.top + BUBBLE_H / 2) * targetZoom,
    });
    setHighlightId(n.id);
    setTimeout(() => setHighlightId(null), 3200);
  };

  const handleShare = () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const personName = tree?.centre.display_name || "Parivar";
    const text = `${personName} ki Matang Vanshawali (Family Tree) Matang Connect par dekhein: ${shareUrl}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Matang Vanshawali", text, url: shareUrl }).catch(() => {});
    } else if (typeof window !== "undefined") {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const laneMarkers = useMemo(() => {
    const lanes: { label: string; icon: string; top: number }[] = [];
    if (is2ColActive) {
      if (yGrandparents > 0) {
        lanes.push({
          label: lang === "hi" ? "पूर्वज (दादा-दादी / नाना-नानी)" : "Ancestors (Grandparents)",
          icon: "🏛️",
          top: yGrandparents - 16,
        });
      }
      if (yParents > 0) {
        lanes.push({
          label: lang === "hi" ? "माता-पिता व अभिभावक" : "Parents & Guardians",
          icon: "👨‍👩‍👧",
          top: yParents - 16,
        });
      }
      lanes.push({
        label: lang === "hi" ? "आपकी पीढ़ी (Self & जीवनसाथी/भाई-बहन)" : "Your Generation (Self & Siblings)",
        icon: "🌟",
        top: Math.max(10, ySelf - 16),
      });
      if (yChildren > 0) {
        lanes.push({
          label: lang === "hi" ? "संतान पीढ़ी (पुत्र / पुत्री / बहू / दामाद)" : "Children Generation",
          icon: "👶",
          top: yChildren - 16,
        });
      }
      if (yGrandchildren > 0) {
        lanes.push({
          label: lang === "hi" ? "पौत्र व नाती पीढ़ी (Grandchildren)" : "Grandchildren Generation",
          icon: "🍼",
          top: yGrandchildren - 16,
        });
      }
      return lanes;
    }

    if (gpPositions.length > 0 && yGpBase > 0) {
      lanes.push({
        label: lang === "hi" ? "पूर्वज (दादा-दादी / नाना-नानी)" : "Ancestors (Grandparents)",
        icon: "🏛️",
        top: Math.max(10, yGpBase - 18),
      });
    }
    if (parentsSorted.length > 0 && yPar > 0) {
      lanes.push({
        label: lang === "hi" ? "माता-पिता की पीढ़ी" : "Parents Generation",
        icon: "👨‍👩‍👧",
        top: Math.max(10, yPar - 18),
      });
    }
    lanes.push({
      label: lang === "hi" ? "आपकी पीढ़ी (Self & Sahodhar)" : "Your Generation (Self & Siblings)",
      icon: "🌟",
      top: Math.max(10, yMidPos - 18),
    });
    if (children.length > 0 && yChild > 0) {
      lanes.push({
        label: lang === "hi" ? "संतान (पुत्र / पुत्री)" : "Children Generation",
        icon: "👶",
        top: Math.max(10, yChild - 18),
      });
    }
    if (gcPositions.length > 0 && yGcBase > 0) {
      lanes.push({
        label: lang === "hi" ? "पौत्र / दौहित्र (Grandchildren)" : "Grandchildren Generation",
        icon: "🍼",
        top: Math.max(10, yGcBase - 18),
      });
    }
    return lanes;
  }, [is2ColActive, yGrandparents, yParents, ySelf, yChildren, yGrandchildren, gpPositions.length, yGpBase, parentsSorted.length, yPar, yMidPos, children.length, yChild, gcPositions.length, yGcBase, lang]);

  const line = "#E8A317";
  const marryLine = "#6EE7B7"; // very light green

  const Tag = ({
    n,
    extra,
    gen = "up1",
    isSelf = false,
  }: {
    n: Node;
    extra?: string;
    gen?: keyof typeof GEN_STYLE;
    isSelf?: boolean;
  }) => {
    const selfNode = isSelf || n.id === tree?.centre.id || n.relation === "self";
    const ring = coupleRingMap.get(n.id) || (selfNode ? SILVER_RING : undefined);
    const isMarried = !!ring || marriedIdSet.has(n.id) || selfNode;
    const relInfo = resolveIndianRelationship(n, tree, lang);
    const rel = extra || relInfo.shortTag;
    const born = formatBirth(n);
    const isLate = /^(स्व\.|late|sw\.)/i.test(n.display_name) || n.status === "deceased";
    const cleanName = n.display_name.replace(/^(स्व\.|late|sw\.)\s*/i, "");
    const sex = resolveSex(n.gender, n.relation);
    const isHighlighted = highlightId === n.id;

    // Exactly 50% translucent cards so bloodlines running behind are clearly visible
    let borderCls = "border-gray-200/80";
    let bgCls = "bg-white/50";
    let textCls = "text-gray-900";
    let badgeCls = "bg-gray-100/90 text-gray-700";

    if (selfNode) {
      borderCls = "border-amber-400 ring-2 ring-amber-300/40";
      bgCls = "bg-amber-50/50";
      textCls = "text-amber-950 font-bold";
      badgeCls = "bg-amber-100/90 text-amber-900 font-semibold";
    } else if (gen === "spouse" || relInfo.category === "spouse") {
      borderCls = "border-pink-300/80";
      bgCls = "bg-rose-50/50";
      textCls = "text-rose-950 font-semibold";
      badgeCls = "bg-rose-100/85 text-rose-800";
    } else if (gen === "sibling" || relInfo.category === "sibling") {
      borderCls = "border-amber-200/80";
      bgCls = "bg-amber-50/50";
      textCls = "text-amber-950 font-semibold";
      badgeCls = "bg-amber-100/80 text-amber-900";
    } else if (gen === "up1" || gen === "up2" || gen === "up3" || relInfo.category === "parent" || relInfo.category === "grandparent") {
      borderCls = "border-indigo-200/80";
      bgCls = "bg-indigo-50/50";
      textCls = "text-indigo-950 font-semibold";
      badgeCls = "bg-indigo-100/85 text-indigo-900";
    } else if (gen === "down1" || gen === "down2" || relInfo.category === "child" || relInfo.category === "grandchild") {
      borderCls = "border-emerald-200/80";
      bgCls = "bg-emerald-50/50";
      textCls = "text-emerald-950 font-semibold";
      badgeCls = "bg-emerald-100/85 text-emerald-900";
    }

    if (isMarried && ring) {
      borderCls += " border-amber-300/80";
    }

    return (
      <button
        type="button"
        onClick={() => {
          if (arrangeMode) {
            setMovePromptId(n.id);
            setSelected(null);
            return;
          }
          setSelected(n);
        }}
        className={`group text-left active:scale-95 w-full max-w-full block ${
          isHighlighted ? "scale-105 z-30" : ""
        }`}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-2.5 py-2 rounded-xl border select-none min-h-[66px] h-auto w-full max-w-full box-border transition-transform",
            borderCls,
            bgCls,
            isHighlighted && "ring-4 ring-amber-400 shadow-xl"
          )}
          style={{
            boxShadow: isMarried && ring
              ? `0 2px 8px ${ring.shadowColor}, 0 1px 2px rgba(0,0,0,0.05)`
              : "0 2px 6px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          {/* Avatar with Solitaire Diamond Ring */}
          <SolitaireRingAvatar
            node={n}
            ring={ring}
            isSelf={selfNode}
            isLate={isLate}
            cleanName={cleanName}
            sex={sex}
            size={38}
          />

          {/* Details: Multi-line vertical stacking (Never stretches horizontally, auto adjusts vertically) */}
          <div className="flex flex-col min-w-0 flex-1 justify-center py-0.5 leading-tight overflow-hidden">
            {/* Line 1: Name (wraps vertically if long) */}
            <div className="flex items-start gap-1 min-w-0">
              {isLate && (
                <span className="text-[9px] font-bold text-amber-800 shrink-0 px-1 py-0.2 rounded bg-amber-100/70">
                  स्व.
                </span>
              )}
              <span
                className={cn(
                  "text-[12px] font-bold leading-tight break-words line-clamp-2",
                  textCls
                )}
                title={n.display_name}
              >
                {cleanName}
              </span>
            </div>

            {/* Line 2: Relationship badge */}
            <div className="flex items-center gap-1 mt-1 min-w-0 flex-wrap">
              <span
                className={cn(
                  "text-[9.5px] leading-tight px-1.5 py-0.5 rounded-md font-bold shrink-0",
                  badgeCls
                )}
              >
                {rel}
              </span>
            </div>

            {/* Line 3: SubTag clarification (separated vertically, can wrap to multiple lines) */}
            {relInfo.subTag && relInfo.subTag !== rel && (
              <div className="mt-0.5 min-w-0">
                <span className="text-[8.5px] text-gray-500 font-medium leading-tight block break-words">
                  ({relInfo.subTag})
                </span>
              </div>
            )}

            {/* Line 4: Birth / Details */}
            {born && (
              <div className="flex items-center gap-1 mt-0.5 min-w-0">
                <span className="text-[9px] text-gray-500 font-medium tabular-nums truncate">
                  {born}
                </span>
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  const renderMemberCard = (m: Node, roleLabel?: string) => {
    const isSelf = m.id === tree?.centre.id;
    const ring = coupleRingMap.get(m.id) || (isSelf ? SILVER_RING : undefined);
    const isMarried = !!ring || marriedIdSet.has(m.id) || isSelf;
    const isLate = /^(स्व\.|late|sw\.)/i.test(m.display_name) || m.status === "deceased";
    const cleanName = m.display_name.replace(/^(स्व\.|late|sw\.)\s*/i, "");
    const sex = resolveSex(m.gender, m.relation);
    const born = formatBirth(m);
    const relInfo = resolveIndianRelationship(m, tree, lang);

    return (
      <div
        key={m.id}
        onClick={() => setSelected(m)}
        className="flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-100 hover:border-amber-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <SolitaireRingAvatar
            node={m}
            ring={ring}
            isSelf={isSelf}
            isLate={isLate}
            cleanName={cleanName}
            sex={sex}
            size={44}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isLate && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded">
                  स्व.
                </span>
              )}
              <p className="text-sm font-bold text-gray-900 truncate">{cleanName}</p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
              <span className="text-amber-800 font-medium">
                {roleLabel || relInfo.shortTag}
              </span>
              {born && <span>· {born}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              focusMember(m);
            }}
            className="text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer"
          >
            <TreePine size={11} />
            <span>{lang === "hi" ? "ट्री में" : "Tree"}</span>
          </button>
          <ChevronRight size={16} className="text-gray-400" />
        </div>
      </div>
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
        .vansh-sib-float {
        }
        .vansh-marry-float {
        }
        @keyframes ringFullOrbit {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -100;
          }
        }
        .vansh-3d-shine {
          animation: ringFullOrbit 9.0s linear infinite;
        }
        @keyframes bloodPulse {
          0%, 100% {
            stroke: #DC2626;
            stroke-width: 2.2;
            opacity: 0.85;
          }
          14% {
            stroke: #EF4444;
            stroke-width: 3.0;
            opacity: 1;
          }
          28% {
            stroke: #DC2626;
            stroke-width: 2.2;
            opacity: 0.85;
          }
          42% {
            stroke: #EF4444;
            stroke-width: 3.2;
            opacity: 1;
          }
          56% {
            stroke: #DC2626;
            stroke-width: 2.2;
            opacity: 0.85;
          }
        }
        @keyframes bloodFlow {
          from { stroke-dashoffset: 48; }
          to { stroke-dashoffset: 0; }
        }
        .vansh-blood-line {
          animation: bloodPulse 2.0s ease-in-out infinite;
        }
        .vansh-blood-flow {
          stroke-dasharray: 6 18;
          animation: bloodFlow 1.8s linear infinite;
        }
        .vansh-logo-watermark {
          position: absolute;
          object-fit: contain;
          opacity: 0.1;
          pointer-events: none;
          z-index: 0;
          user-select: none;
        }

        /* Heritage 3D gold lettering — no plate */
        .vansh-heritage {
          text-align: center;
          line-height: 1.05;
          padding: 2px 8px;
        }
        .vansh-heritage .vh-title {
          margin: 0;
          font-family: Georgia, "Times New Roman", "Palatino Linotype", serif;
          font-size: clamp(1.15rem, 5.2vw, 1.55rem);
          font-weight: 800;
          letter-spacing: 0.04em;
          background: linear-gradient(
            175deg,
            #fff6d0 0%,
            #ffe08a 18%,
            #e8b84a 40%,
            #c4921a 62%,
            #8b6914 82%,
            #f0d070 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0 1px 0 #5c4010)
            drop-shadow(0 2px 0 #3d2a08)
            drop-shadow(0 3px 1px rgba(0,0,0,0.35));
        }
        .vansh-heritage .vh-sub {
          margin: 2px 0 0;
          font-family: Georgia, "Times New Roman", "Palatino Linotype", serif;
          font-size: clamp(0.95rem, 4.2vw, 1.25rem);
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: linear-gradient(
            175deg,
            #fff8dc 0%,
            #f0d060 30%,
            #c9a227 55%,
            #9a7010 80%,
            #e8c860 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0 1px 0 #5c4010)
            drop-shadow(0 2px 0 #3d2a08)
            drop-shadow(0 2px 1px rgba(0,0,0,0.3));
        }
        @keyframes sibTravel {
          to { stroke-dashoffset: -120; }
        }
        .vansh-sib-base {
          stroke-dasharray: none;
        }
        .vansh-sib-travel {
          stroke-dasharray: 14 106;
          animation: sibTravel 1.4s linear infinite;
        }
      `}</style>

      {/* Top Header & Action Controls Bar — 100% structured in flow, zero overlap */}
      <div className="relative z-30 px-3 pt-2.5 pb-2 bg-[#fafafa]/95 backdrop-blur-xs border-b border-amber-100/70">
        {/* Tier 1: Centered Gold "वंशावली" Image — Strictly Preserved */}
        <div className="flex justify-center items-center w-full">
          <h1 className="sr-only">वंशावली</h1>
          <img
            src="/vanshawali-title.png"
            alt="वंशावली"
            className="select-none pointer-events-none drop-shadow-md"
            draggable={false}
            style={{
              width: "auto",
              maxWidth: "min(64vw, 320px)",
              maxHeight: "clamp(46px, 11vw, 68px)",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {/* Tier 2: View Switcher Pill (Tree View vs Family List) */}
        <div className="flex items-center justify-center mt-1.5">
          <div className="inline-flex items-center p-0.5 rounded-full bg-amber-100/70 border border-amber-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                viewMode === "tree"
                  ? "bg-white text-amber-950 shadow-xs"
                  : "text-amber-800/75 hover:text-amber-950"
              )}
            >
              <TreePine size={13} className="text-amber-600" />
              <span>{lang === "hi" ? "ट्री व्यू" : "Tree View"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-white text-amber-950 shadow-xs"
                  : "text-amber-800/75 hover:text-amber-950"
              )}
            >
              <ListFilter size={13} className="text-amber-600" />
              <span>{lang === "hi" ? "परिवार सूची" : "Family List"}</span>
            </button>
          </div>
        </div>

        {/* Tier 3: Search Bar & Action Controls Bar */}
        <div className="mt-2 max-w-lg mx-auto w-full space-y-1.5">
          {/* Quick member search input with instant jump */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-amber-700/60 pointer-events-none" />
            <input
              type="text"
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              placeholder={lang === "hi" ? "परिवार के सदस्य को खोजें..." : "Search family member..."}
              className="w-full pl-9 pr-8 py-1.5 rounded-full text-xs bg-white border border-amber-200/80 shadow-2xs outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300 text-gray-800 placeholder-gray-400 transition-all"
            />
            {treeSearch && (
              <button
                type="button"
                onClick={() => setTreeSearch("")}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}

            {/* Search Dropdown Results */}
            {searchMatches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white/95 backdrop-blur-md rounded-2xl border border-amber-200 shadow-xl max-h-56 overflow-y-auto divide-y divide-amber-50">
                {searchMatches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      focusMember(m);
                      setTreeSearch("");
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-amber-50/80 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {m.display_name.replace(/^(स्व\.|late|sw\.)\s*/i, "").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {m.display_name}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full shrink-0 font-medium">
                      {resolveIndianRelationship(m, tree, lang).shortTag}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isSA && !isOwner && (
                <button
                  type="button"
                  onClick={() => setSaEditMode((v) => !v)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs border transition-all active:scale-95 cursor-pointer ${
                    saEditMode
                      ? "bg-amber-400 text-white border-amber-500 shadow-sm"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Pencil size={12} />
                  {saEditMode ? "Edit ON" : "Edit"}
                </button>
              )}

              {(canEdit || isOwnTree || isSA) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleArrange();
                  }}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs border transition-all active:scale-95 cursor-pointer ${
                    arrangeMode
                      ? "bg-emerald-500 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {arrangeMode
                    ? lang === "hi" ? "✓ Save" : "✓ Save"
                    : lang === "hi" ? "Arrange" : "Arrange"}
                </button>
              )}

              {(isOwnTree || isSA || pendingCount > 0) && (
                <button
                  type="button"
                  onClick={() => router.push("/vanshawali/requests")}
                  className="relative flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                >
                  {lang === "hi" ? "अनुरोध" : "Requests"}
                  {pendingCount > 0 && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}

              {/* Share button */}
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs border bg-white text-amber-900 border-amber-200/80 hover:bg-amber-50 active:scale-95 transition-all cursor-pointer"
              >
                <Share2 size={12} className="text-amber-600" />
                <span>{lang === "hi" ? "शेयर" : "Share"}</span>
              </button>

              {/* 2-Card Stream vs Wide Canvas Toggle */}
              <button
                type="button"
                onClick={() => {
                  const nextMode = !is2ColActive;
                  setViewMode2Col(nextMode);
                  didCenterRef.current = false;
                  if (nextMode) {
                    setZoom(1);
                    setPan({ x: Math.max(0, (vw - 360) / 2), y: 20 });
                  } else {
                    fitTreeInView(W, H);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold shadow-xs border transition-all active:scale-95 cursor-pointer ${
                  is2ColActive
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-600 ring-2 ring-amber-300 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
                title={lang === "hi" ? "2-सदस्य प्रति पंक्ति व्यू / विस्तृत ट्री व्यू" : "2-card per row stream / Wide canvas"}
              >
                <span>{is2ColActive ? "📱 2-Card View" : "🌐 Wide Canvas"}</span>
              </button>
            </div>

            {/* Guide dropdown */}
            <div className="relative">
              <details className="group">
                <summary className="cursor-pointer font-bold text-amber-900 text-[11px] list-none flex items-center gap-1 px-3 py-1 rounded-full border border-amber-200/80 bg-white hover:bg-amber-50/50 shadow-xs select-none">
                  {lang === "hi" ? "◎ गाइड" : "◎ Guide"}
                </summary>
                <div className="absolute right-0 top-full mt-1.5 z-50 w-64 p-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-amber-200/90 text-[10px] text-gray-700 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                  <p><span className="inline-block w-3 h-3 rounded align-middle mr-1.5 bg-amber-400" />{lang==="hi"?"आप (Self)":"You (Self)"}</p>
                  <p><span className="inline-block w-3 h-3 rounded align-middle mr-1.5 bg-amber-200" />{lang==="hi"?"भाई / बहन":"Brother / Sister"}</p>
                  <p><span className="inline-block w-3 h-3 rounded align-middle mr-1.5 bg-rose-200" />{lang==="hi"?"पति / पत्नी":"Spouse"}</p>
                  <p><span className="inline-block w-3 h-3 rounded align-middle mr-1.5 bg-indigo-200" />{lang==="hi"?"माता-पिता":"Parents"}</p>
                  <p><span className="inline-block w-3 h-3 rounded align-middle mr-1.5 bg-indigo-100" />{lang==="hi"?"दादा-दादी / नाना-नानी":"Grandparents"}</p>
                  <p><span className="inline-block w-3 h-3 rounded align-middle mr-1.5 bg-emerald-200" />{lang==="hi"?"संतान":"Children"}</p>
                  <p className="flex items-center gap-2 pt-1 border-t border-amber-100 mt-1">
                    <span className="w-6 h-0.5 bg-amber-500 rounded" />
                    {lang==="hi"?"सुनहरी = रक्त रिश्ता":"Gold = blood bond"}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-0.5 bg-yellow-400 rounded" />
                    {lang==="hi"?"पीली = भाई-बहन":"Yellow = siblings"}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-0.5 border-t-2 border-dashed border-emerald-400" />
                    {lang==="hi"?"हरी धराशायी = विवाह":"Green dashed = marriage"}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-xs">🕯️</span>
                    {lang==="hi"?"दीया = स्वर्गीय (Late) सदस्य":"Diya = Late / Deceased"}
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-amber-900 font-semibold">{lang === "hi" ? "वंशावली लोड हो रही है..." : "Loading Vanshawali..."}</p>
        </div>
      )}

      {/* View: Empty State when No Tree Found */}
      {!loading && !tree && (
        <div className="flex-1 max-w-md mx-auto w-full px-4 py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-3xl font-bold shadow-xs">
            🌳
          </div>
          <h2 className="text-base font-bold text-gray-900">
            {lang === "hi" ? "वंशावली उपलब्ध नहीं है" : "Vanshawali Not Found"}
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
            {lang === "hi"
              ? "परिवार का विवरण लोड करने में समस्या आई या आपकी वंशावली अभी शुरू नहीं हुई है।"
              : "Unable to load family tree or it has not been created yet."}
          </p>
          <button
            type="button"
            onClick={load}
            className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            {lang === "hi" ? "पुनः लोड करें (Retry)" : "Retry"}
          </button>
        </div>
      )}

      {/* View 1: Family List View (Clean & Mobile-Friendly) */}
      {!loading && tree && viewMode === "list" && (
        <div className="flex-1 max-w-2xl mx-auto w-full px-3 py-4 space-y-4 pb-36">
          {/* Header Family Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                {tree.centre.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tree.centre.photo_url}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-amber-400 text-amber-950 font-bold text-base flex items-center justify-center border-2 border-white shadow-xs">
                    {tree.centre.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 truncate flex items-center gap-1.5">
                  <span>{tree.centre.display_name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200/70 text-amber-900 font-bold shrink-0">
                    {lang === "hi" ? "आप (Self)" : "Self"}
                  </span>
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  {lang === "hi" ? "कुल परिवार सदस्य:" : "Total family members:"}{" "}
                  <strong className="text-amber-900">{allTreeMembers.length}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <Share2 size={13} />
              <span>{lang === "hi" ? "शेयर" : "Share"}</span>
            </button>
          </div>

          {/* Section 1: Senior Ancestors & Grandparents */}
          {listSections && listSections.seniors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-base">🏛️</span>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  {lang === "hi" ? "वरिष्ठ पूर्वज (दादा-दादी / नाना-नानी)" : "Senior Ancestors & Grandparents"} ({listSections.seniors.length})
                </h3>
              </div>
              <div className="space-y-1.5">
                {listSections.seniors.map((m) => renderMemberCard(m))}
              </div>
            </div>
          )}

          {/* Section 2: Parents, Uncles & Aunts */}
          {listSections && listSections.parentsGen.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-base">👨‍👩‍👧</span>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  {lang === "hi" ? "माता-पिता व अभिभावक (चाचा-ताऊ/मामा/बुआ)" : "Parents, Uncles & Aunts"} ({listSections.parentsGen.length})
                </h3>
              </div>
              <div className="space-y-1.5">
                {listSections.parentsGen.map((m) => renderMemberCard(m))}
              </div>
            </div>
          )}

          {/* Section 3: Same Generation (Self, Spouse, Siblings, Bhabhi, Jija ji) */}
          {listSections && listSections.selfGen.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-base">🌟</span>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  {lang === "hi" ? "आपकी पीढ़ी (Self, जीवनसाथी, भाई-बहन व भाभी)" : "Your Generation"} ({listSections.selfGen.length})
                </h3>
              </div>
              <div className="space-y-1.5">
                {listSections.selfGen.map((m) => renderMemberCard(m))}
              </div>
            </div>
          )}

          {/* Section 4: Direct Children & In-Laws (Beta, Beti, Bahu, Damaad) */}
          {listSections && listSections.directChildren.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-base">👶</span>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  {lang === "hi" ? "संतान व पुत्र-वधू / दामाद" : "Children & In-Laws"} ({listSections.directChildren.length})
                </h3>
              </div>
              <div className="space-y-1.5">
                {listSections.directChildren.map((m) => renderMemberCard(m))}
              </div>
            </div>
          )}

          {/* Section 5: Nephews & Nieces (Bhatije / Bhanje) */}
          {listSections && listSections.siblingChildren.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-base">🧸</span>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  {lang === "hi" ? "भतीजे व भांजे (भाई-बहन की संतान)" : "Nephews & Nieces"} ({listSections.siblingChildren.length})
                </h3>
              </div>
              <div className="space-y-1.5">
                {listSections.siblingChildren.map((m) => renderMemberCard(m))}
              </div>
            </div>
          )}

          {/* Section 6: Grandchildren & Descendants (Pota-Poti, Naati-Naatin) */}
          {listSections && listSections.grandChildren.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-base">🍼</span>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  {lang === "hi" ? "पौत्र व नाती पीढ़ी (Grandchildren)" : "Grandchildren Generation"} ({listSections.grandChildren.length})
                </h3>
              </div>
              <div className="space-y-1.5">
                {listSections.grandChildren.map((m) => renderMemberCard(m))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* View 2: Interactive Tree View */}
      {!loading && tree && viewMode === "tree" && (
        <div
          ref={wrapRef}
          className={cn(
            "flex-1 w-full relative pb-36",
            is2ColActive ? "overflow-visible" : "overflow-hidden touch-none"
          )}
          style={{
            minHeight: is2ColActive ? `${H + 60}px` : "55vh",
            touchAction: is2ColActive ? "pan-y" : "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Compact Zoom Toolbar — Wide Canvas mode only */}
          {!is2ColActive && (
            <div className="absolute bottom-20 right-3 z-30 flex items-center bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-amber-200/90 px-1.5 py-1 gap-1">
              <button
                type="button"
                onClick={() => zoomBy(-ZOOM_STEP)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-amber-800 hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer"
                aria-label="Zoom out"
                title="Zoom out (-)"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-[10px] font-bold text-amber-900/90 px-1 tabular-nums min-w-[34px] text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => zoomBy(ZOOM_STEP)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-amber-800 hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer"
                aria-label="Zoom in"
                title="Zoom in (+)"
              >
                <ZoomIn size={16} />
              </button>
              <div className="w-[1px] h-4 bg-amber-200/80 mx-0.5" />
              <button
                type="button"
                onClick={fitAll}
                className="w-8 h-8 rounded-full flex items-center justify-center text-amber-800 hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer"
                aria-label="Fit to screen"
                title="Fit to screen"
              >
                <Maximize2 size={15} />
              </button>
              <button
                type="button"
                onClick={zoomReset}
                className="w-8 h-8 rounded-full flex items-center justify-center text-amber-800 hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer"
                aria-label="Reset to self"
                title="Reset to 100%"
              >
                <Home size={15} />
              </button>
            </div>
          )}
          <div
            className={cn(
              "relative origin-top-left z-10",
              !is2ColActive && "will-change-transform contain-layout"
            )}
            style={{
              width: is2ColActive ? "100%" : W,
              height: H,
              transform: is2ColActive
                ? undefined
                : `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              touchAction: is2ColActive ? "pan-y" : "none",
            }}
            onTouchStart={(e) => {
              if (is2ColActive) return;
              const rect = wrapRef.current?.getBoundingClientRect();
              if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const midX =
                  (e.touches[0].clientX + e.touches[1].clientX) / 2 -
                  (rect?.left ?? 0);
                const midY =
                  (e.touches[0].clientY + e.touches[1].clientY) / 2 -
                  (rect?.top ?? 0);
                (pinchRef as { current: any }).current = {
                  dist: Math.hypot(dx, dy),
                  zoom,
                  midX,
                  midY,
                  panX: pan.x,
                  panY: pan.y,
                };
                dragRef.current = null;
              } else if (e.touches.length === 1 && !moveTargetId) {
                // 4-direction scroll (not while pinning a bubble)
                dragRef.current = {
                  x: e.touches[0].clientX,
                  y: e.touches[0].clientY,
                  panX: pan.x,
                  panY: pan.y,
                };
              }
            }}
            onTouchMove={(e) => {
              if (is2ColActive) return;
              if (e.touches.length === 2 && pinchRef.current) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const d = Math.hypot(dx, dy);
                const pr = pinchRef.current as {
                  dist: number;
                  zoom: number;
                  midX?: number;
                  midY?: number;
                  panX?: number;
                  panY?: number;
                };
                const ratio = d / Math.max(1, pr.dist);
                const z2 = clampZoom(pr.zoom * ratio);
                const midX = pr.midX ?? vw / 2;
                const midY = pr.midY ?? vh / 2;
                const p0x = pr.panX ?? pan.x;
                const p0y = pr.panY ?? pan.y;
                const z1 = Math.max(pr.zoom, 0.001);
                setZoom(z2);
                setPan({
                  x: midX - ((midX - p0x) / z1) * z2,
                  y: midY - ((midY - p0y) / z1) * z2,
                });
              } else if (e.touches.length === 1 && dragRef.current && !moveTargetId) {
                const dx = e.touches[0].clientX - dragRef.current.x;
                const dy = e.touches[0].clientY - dragRef.current.y;
                setPan({
                  x: dragRef.current.panX + dx,
                  y: dragRef.current.panY + dy,
                });
              }
            }}
            onTouchEnd={() => {
              if (is2ColActive) return;
              pinchRef.current = null;
              dragRef.current = null;
            }}
            onPointerDown={(e) => {
              // Desktop / mouse pan (not on bubble; bubbles stopPropagation)
              if (e.pointerType === "touch") return;
              if (moveTargetId) return;
              if (e.button !== 0) return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              dragRef.current = {
                x: e.clientX,
                y: e.clientY,
                panX: pan.x,
                panY: pan.y,
              };
            }}
            onPointerMove={(e) => {
              if (e.pointerType === "touch") return;
              if (!dragRef.current || moveTargetId) return;
              setPan({
                x: dragRef.current.panX + (e.clientX - dragRef.current.x),
                y: dragRef.current.panY + (e.clientY - dragRef.current.y),
              });
            }}
            onPointerUp={() => {
              if (moveTargetId) return;
              dragRef.current = null;
            }}
            onWheel={(e) => {
              if (is2ColActive) return;
              e.preventDefault();
              const rect = wrapRef.current?.getBoundingClientRect();
              const fx = e.clientX - (rect?.left ?? 0);
              const fy = e.clientY - (rect?.top ?? 0);
              zoomAt(zoom + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), fx, fy);
            }}
          >
            {/* Logo: canvas centre, scales with tree size, pans with tree */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              className="vansh-logo-watermark"
              draggable={false}
              style={{
                left: W / 2,
                top: is2ColActive ? Math.min(H / 2, 600) : H / 2,
                width: is2ColActive ? Math.min(260, Math.floor(W * 0.72)) : Math.min(480, Math.floor(Math.min(W, H) * 0.5)),
                height: is2ColActive ? Math.min(260, Math.floor(W * 0.72)) : Math.min(480, Math.floor(Math.min(W, H) * 0.5)),
                transform: "translate(-50%, -50%)",
              }}
            />

            {/* Generation Section Outlines, Distinct Backgrounds & Prominent Headings */}
            {is2ColActive && generationSections.map((sec) => (
              <div
                key={sec.id}
                className={cn(
                  "absolute left-2.5 right-2.5 rounded-3xl border z-0",
                  sec.borderCls,
                  sec.bgCls
                )}
                style={{
                  top: sec.top,
                  height: sec.height,
                }}
              >
                {/* Split Generation Header: Left Pill for Title & Right Pill for Count */}
                {/* Center corridor [cx - 24, cx + 24] is 100% open so bloodlines pass without ANY text/banner overlap */}
                <div
                  className={cn(
                    "absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shadow-xs z-10 max-w-[44%]",
                    sec.headerBgCls
                  )}
                >
                  <span className="text-sm leading-none shrink-0 drop-shadow-xs">{sec.icon}</span>
                  <span className="text-[11px] font-black tracking-wide truncate">
                    {sec.title}
                  </span>
                </div>

                <div
                  className={cn(
                    "absolute top-2 right-2 flex items-center px-2 py-1 rounded-xl border shadow-2xs z-10",
                    sec.headerBgCls
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs",
                      sec.badgeCls
                    )}
                  >
                    {sec.count} {lang === "hi" ? "सदस्य" : "Members"}
                  </span>
                </div>
              </div>
            ))}

            {/* Background Generation Guide Lanes (wide canvas mode only) */}
            {!is2ColActive && (
              <div className="absolute inset-0 pointer-events-none select-none z-0">
                {laneMarkers.map((lane) => (
                  <div
                    key={lane.label}
                    className="absolute left-0 right-0 flex items-center px-4"
                    style={{ top: lane.top }}
                  >
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-xs border border-amber-200/60 shadow-2xs">
                      <span className="text-xs">{lane.icon}</span>
                      <span className="text-[10px] font-bold text-amber-950/70 tracking-wide uppercase">
                        {lane.label}
                      </span>
                    </div>
                    <div className="flex-1 ml-3 border-t border-dashed border-amber-300/40" />
                  </div>
                ))}
              </div>
            )}

            <svg
              className="absolute inset-0 pointer-events-none z-10"
              width={W}
              height={H}
              shapeRendering="geometricPrecision"
            >
              <defs>
                <marker id="arrow-gold" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M1 1 L6 3.5 L1 6 Z" fill="#D97706" />
                </marker>
                <marker id="arrow-indigo" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M1 1 L6 3.5 L1 6 Z" fill="#4F46E5" />
                </marker>
                <marker id="arrow-rose" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M1 1 L6 3.5 L1 6 Z" fill="#E11D48" />
                </marker>
                <marker id="arrow-sky" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M1 1 L6 3.5 L1 6 Z" fill="#0284C7" />
                </marker>
                <marker id="arrow-purple" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M1 1 L6 3.5 L1 6 Z" fill="#7C3AED" />
                </marker>
                <marker id="arrow-emerald" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M1 1 L6 3.5 L1 6 Z" fill="#059669" />
                </marker>
              </defs>



              {/* Bloodline Living Curvy Segments (Parents <-> Children) with Heartbeat Blood Pumping */}
              {bloodSegments.map((seg) => (
                <g key={seg.key}>
                  {/* Soft ambient red glow underlay (zero-cost static stroke, no Gaussian blur) */}
                  <path
                    d={seg.d}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth={5}
                    strokeLinecap="round"
                    opacity={0.2}
                  />
                  {/* Base arterial pulsating stroke */}
                  <path
                    d={seg.d}
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    className="vansh-blood-line"
                  />
                  {/* Living blood flow moving dashes */}
                  <path
                    d={seg.d}
                    fill="none"
                    stroke="#FCA5A5"
                    strokeWidth={1.3}
                    strokeLinecap="round"
                    className="vansh-blood-flow"
                    opacity={0.85}
                  />
                </g>
              ))}

              {/* Living arterial junction confluence nodes */}
              {bloodJunctions.map((j) => (
                <g key={j.key}>
                  <circle cx={j.x} cy={j.y} r={3.2} fill="#EF4444" opacity={0.65} />
                  <circle cx={j.x} cy={j.y} r={1.8} fill="#DC2626" />
                  <circle cx={j.x} cy={j.y} r={0.8} fill="#FEF08A" />
                </g>
              ))}


              {/* Sibling amber lines */}
              {linesSibling.map((ln) => {
                const midX = (ln.x1 + ln.x2) / 2;
                const dip = Math.max(ln.y1, ln.y2) + 18;
                const d = `M${ln.x1} ${ln.y1} Q${midX} ${dip} ${ln.x2} ${ln.y2}`;
                return (
                  <g key={ln.key}>
                    <path
                      d={d}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      opacity={0.9}
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke="#FEF08A"
                      strokeWidth={1.4}
                      strokeDasharray="8 14"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
            </svg>

            {/* All relative bubbles (auto levels) */}
            {placed.map((pl) => {
              if (tree && pl.n.id === tree.centre.id) return null;
              // Clean horizontal orientation — NO messy tilts
              const tilt = 0;
              return (
                <div
                  key={pl.n.id}
                  className={`absolute z-10 ${
                    arrangeMode && moveTargetId === pl.n.id
                      ? "touch-none cursor-grab active:cursor-grabbing"
                      : "cursor-pointer"
                  }`}
                  style={{
                    left: pl.x,
                    top: pl.top,
                    width: is2ColActive ? cardW : Math.max(pl.w, 140),
                    maxWidth: is2ColActive ? cardW : 180,
                    transform: "translateX(-50%)",
                    transformOrigin: "center center",
                    touchAction: arrangeMode && moveTargetId === pl.n.id ? "none" : "pan-y",
                    filter:
                      moveTargetId === pl.n.id
                        ? "drop-shadow(0 10px 18px rgba(16,185,129,0.45))"
                        : undefined,
                    outline:
                      moveTargetId === pl.n.id ? "2px dashed rgba(16,185,129,0.7)" : undefined,
                    outlineOffset: 4,
                  }}
                  onPointerDown={(e) => {
                    if (!(arrangeMode && moveTargetId === pl.n.id)) return;
                    e.stopPropagation();
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    const pos = posById.get(pl.n.id);
                    if (!pos) return;
                    bubbleDragRef.current = {
                      id: pl.n.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      origX: pos.x,
                      origY: pos.top,
                      moved: false,
                    };
                  }}
                  onPointerMove={(e) => {
                    const d = bubbleDragRef.current;
                    if (!d || d.id !== pl.n.id || moveTargetId !== pl.n.id) return;
                    const dx = (e.clientX - d.startX) / zoom;
                    const dy = (e.clientY - d.startY) / zoom;
                    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
                    if (!d.moved) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setFloatPos((prev) => ({
                      ...prev,
                      [d.id]: { x: d.origX + dx, top: d.origY + dy },
                    }));
                  }}
                  onPointerUp={(e) => {
                    const d = bubbleDragRef.current;
                    bubbleDragRef.current = null;
                    try {
                      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                    } catch (_) {}
                    if (d?.moved && moveTargetId === pl.n.id) {
                      const dx = (e.clientX - d.startX) / zoom;
                      const dy = (e.clientY - d.startY) / zoom;
                      const pos = { x: d.origX + dx, top: d.origY + dy };
                      setFloatPos((prev) => {
                        const next = { ...prev, [d.id]: pos };
                        persistFloat(next);
                        return next;
                      });
                      setMoveTargetId(null);
                      setMovePromptId(null);
                    }
                  }}
                >
                  <div
                    onClick={(e) => {
                      if (arrangeMode) {
                        e.stopPropagation();
                        setMovePromptId(pl.n.id);
                        setSelected(null);
                        return;
                      }
                    }}
                  >
                    <Tag
                      n={pl.n}
                      gen={pl.genKey}
                    />
                  </div>
                  {arrangeMode && movePromptId === pl.n.id && moveTargetId !== pl.n.id && (
                    <button
                      type="button"
                      className="absolute left-1/2 -translate-x-1/2 -top-9 z-50 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-900 bg-white/70 border border-emerald-300/80 backdrop-blur-sm shadow-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoveTargetId(pl.n.id);
                        setMovePromptId(null);
                      }}
                    >
                      {lang === "hi" ? "Move" : "Move"}
                    </button>
                  )}
                  {arrangeMode && moveTargetId === pl.n.id && (
                    <span className="absolute left-1/2 -translate-x-1/2 -bottom-7 z-50 px-2 py-0.5 rounded-full text-[9px] font-semibold text-emerald-800 bg-white/60 border border-emerald-200/70 backdrop-blur-sm">
                      {lang === "hi" ? "खींचें · छोड़ें = पिन" : "Drag · release = pin"}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Centre */}
            <div
              className={`absolute z-20 ${
                arrangeMode && moveTargetId === tree.centre.id
                  ? "touch-none cursor-grab active:cursor-grabbing"
                  : "cursor-pointer"
              }`}
              style={{
                left: posById.get(tree.centre.id)?.x ?? centreX,
                top: posById.get(tree.centre.id)?.top ?? yMid,
                width: is2ColActive ? cardW : 160,
                maxWidth: is2ColActive ? cardW : 180,
                transform: "translateX(-50%)",
                touchAction: arrangeMode && moveTargetId === tree.centre.id ? "none" : "pan-y",
                filter:
                  moveTargetId === tree.centre.id
                    ? "drop-shadow(0 10px 18px rgba(16,185,129,0.45))"
                    : undefined,
                outline:
                  moveTargetId === tree.centre.id
                    ? "2px dashed rgba(16,185,129,0.7)"
                    : undefined,
                outlineOffset: 4,
              }}
              onPointerDown={(e) => {
                if (!(arrangeMode && moveTargetId === tree.centre.id)) return;
                e.stopPropagation();
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                const pos = posById.get(tree.centre.id);
                if (!pos) return;
                bubbleDragRef.current = {
                  id: tree.centre.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: pos.x,
                  origY: pos.top,
                  moved: false,
                };
              }}
              onPointerMove={(e) => {
                const d = bubbleDragRef.current;
                if (!d || d.id !== tree.centre.id || moveTargetId !== tree.centre.id) return;
                const dx = (e.clientX - d.startX) / zoom;
                const dy = (e.clientY - d.startY) / zoom;
                if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
                if (!d.moved) return;
                e.preventDefault();
                e.stopPropagation();
                setFloatPos((prev) => ({
                  ...prev,
                  [d.id]: { x: d.origX + dx, top: d.origY + dy },
                }));
              }}
              onPointerUp={(e) => {
                const d = bubbleDragRef.current;
                bubbleDragRef.current = null;
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                } catch (_) {}
                if (d?.moved && moveTargetId === tree.centre.id) {
                  const dx = (e.clientX - d.startX) / zoom;
                  const dy = (e.clientY - d.startY) / zoom;
                  const pos = { x: d.origX + dx, top: d.origY + dy };
                  setFloatPos((prev) => {
                    const next = { ...prev, [d.id]: pos };
                    persistFloat(next);
                    return next;
                  });
                  setMoveTargetId(null);
                  setMovePromptId(null);
                }
              }}
              onClick={() => {
                if (arrangeMode) {
                  setMovePromptId(tree.centre.id);
                  setSelected(null);
                  return;
                }
                setSelected(tree.centre);
              }}
            >
              {arrangeMode &&
                movePromptId === tree.centre.id &&
                moveTargetId !== tree.centre.id && (
                  <button
                    type="button"
                    className="absolute left-1/2 -translate-x-1/2 -top-9 z-50 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-900 bg-white/70 border border-emerald-300/80 backdrop-blur-sm shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoveTargetId(tree.centre.id);
                      setMovePromptId(null);
                    }}
                  >
                    Move
                  </button>
                )}
              <Tag
                n={{ ...tree.centre, relation: "self" }}
                gen="self"
                isSelf
              />
            </div>

            {/* Spouses */}
            {spouses.map((n) => {
              const pos = posById.get(n.id);
              if (!pos) return null;
              // skip if already drawn in placed.map
              return null;
            })}

            {/* Realistic Rope Knots & Sacred Golden Marriage Threads Overlay Layer (z-30) — Physically tags ON TOP of card corners & avatar rings */}
            <svg
              className="absolute inset-0 pointer-events-none z-30 overflow-visible"
              width={W}
              height={H}
              shapeRendering="geometricPrecision"
            >
              {/* Marriage bonds — single golden thread hanging in the air from ring bottom to ring bottom (no middle knot) */}
              {marriagePairs.map((mp, i) => {
                const left =
                  mp.ax <= mp.bx
                    ? { x: mp.ax, y: mp.ay, w: mp.aw, id: mp.idA }
                    : { x: mp.bx, y: mp.by, w: mp.bw, id: mp.idB };
                const right =
                  mp.ax <= mp.bx
                    ? { x: mp.bx, y: mp.by, w: mp.bw, id: mp.idB }
                    : { x: mp.ax, y: mp.ay, w: mp.aw, id: mp.idA };

                // Avatar centers in canvas coordinates
                const ringY1 = left.y + (is2ColActive ? 33 : BUBBLE_H / 2);
                const ringY2 = right.y + (is2ColActive ? 33 : BUBBLE_H / 2);
                const leftAvatarX = left.x - left.w / 2 + 29;
                const rightAvatarX = right.x - right.w / 2 + 29;

                // Knot tied strictly on bottom rim/corner of the circular metal ring band (outside avatar/photo face)
                // Husband: bottom-right rim of ring circle
                const startX = leftAvatarX + 7;
                const startY = ringY1 + 16.5;

                // Wife: bottom-left rim of ring circle
                const endX = rightAvatarX - 7;
                const endY = ringY2 + 16.5;

                const isHorizontal = endX > startX;
                const dx = endX - startX;
                // Generous dramatic sag so the sacred thread floats loosely in the air ("zada se zada loose, dramatically hawa mai float karti hui")
                const sag = Math.min(68, Math.max(38, dx * 0.35));
                const lowY = Math.max(startY, endY) + sag;

                // Single direct suspended thread from starting ring to ending ring (NO extra middle knot)
                const d = isHorizontal
                  ? `M ${startX} ${startY} C ${startX + dx * 0.22} ${lowY + 6}, ${endX - dx * 0.22} ${lowY + 6}, ${endX} ${endY}`
                  : `M ${startX} ${startY} C ${Math.max(left.x + left.w / 2, right.x + right.w / 2) + 26} ${startY + 20}, ${Math.max(left.x + left.w / 2, right.x + right.w / 2) + 26} ${endY - 20}, ${endX} ${endY}`;

                return (
                  <g key={`marry-gold-${i}`}>
                    {/* Shadow under hanging golden thread */}
                    <path
                      d={d}
                      fill="none"
                      stroke="rgba(0,0,0,0.18)"
                      strokeWidth={3.4}
                      strokeLinecap="round"
                    />
                    {/* Antique Bronze / Deep Gold Outer Contour */}
                    <path
                      d={d}
                      fill="none"
                      stroke="#78350F"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                    />
                    {/* Warm Amber-Gold Cord Core (Static, NO animation) */}
                    <path
                      d={d}
                      fill="none"
                      stroke="#D97706"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                    {/* Radiant Pure 24K Gold Strand */}
                    <path
                      d={d}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth={1.2}
                      strokeLinecap="round"
                    />
                    {/* Twisted Golden Silk Thread Texture */}
                    <path
                      d={d}
                      fill="none"
                      stroke="#FEF3C7"
                      strokeWidth={0.7}
                      strokeDasharray="3 3"
                      strokeLinecap="round"
                    />
                    {/* Ultra-fine shimmer strand */}
                    <path
                      d={d}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={0.4}
                      strokeDasharray="1 6"
                      strokeLinecap="round"
                      opacity={0.85}
                    />

                    {/* Starting Point Knot: Tied to bottom rim of husband's ring */}
                    <RingBottomKnot x={startX} y={startY} isRightSide={false} ring={mp.ring} />

                    {/* Ending Point Knot: Tied to bottom rim of wife's ring */}
                    <RingBottomKnot x={endX} y={endY} isRightSide={true} ring={mp.ring} />
                  </g>
                );
              })}

              {/* Realistic Rope Knots at Card Corners */}
              {bloodKnots.map((knot) => (
                <RopeKnot
                  key={knot.key}
                  x={knot.x}
                  y={knot.y}
                  isBottom={knot.isBottom}
                  corner={knot.corner}
                />
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* ADD sheet with search */}
      {draft && canEdit && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center backdrop-blur-xs"
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
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-amber-400 font-medium"
                value={draft.relation}
                onChange={(e) => {
                  const r = e.target.value;
                  let g = draft.gender;
                  if (r === "father") g = "male";
                  else if (r === "mother") g = "female";
                  else if (!g) g = "male";
                  setDraft({ ...draft, relation: r, gender: g });
                }}
              >
                <option value="father">{L.father}</option>
                <option value="mother">{L.mother}</option>
                <option value="spouse">{L.spouse}</option>
                <option value="child">{L.child}</option>
                <option value="sibling">{lang === "hi" ? "भाई / बहन" : "Brother / Sister"}</option>
              </select>
            </div>

            {/* Sub-selector for brother/sister */}
            {draft.relation === "sibling" && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 block">
                  {lang === "hi" ? "भाई या बहन चुनें" : "Select Brother or Sister"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, gender: "male" })}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      draft.gender === "male"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-blue-50/70 text-blue-900 border-blue-200 hover:bg-blue-100"
                    )}
                  >
                    <span>👦</span>
                    <span>{lang === "hi" ? "भाई (Brother)" : "Brother"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, gender: "female" })}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      draft.gender === "female"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-rose-50/70 text-rose-900 border-rose-200 hover:bg-rose-100"
                    )}
                  >
                    <span>👧</span>
                    <span>{lang === "hi" ? "बहन (Sister)" : "Sister"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sub-selector for son/daughter */}
            {draft.relation === "child" && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 block">
                  {lang === "hi" ? "बेटा या बेटी चुनें" : "Select Son or Daughter"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, gender: "male" })}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      draft.gender === "male"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-blue-50/70 text-blue-900 border-blue-200 hover:bg-blue-100"
                    )}
                  >
                    <span>👦</span>
                    <span>{lang === "hi" ? "बेटा (Son)" : "Son"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, gender: "female" })}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      draft.gender === "female"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-rose-50/70 text-rose-900 border-rose-200 hover:bg-rose-100"
                    )}
                  >
                    <span>👧</span>
                    <span>{lang === "hi" ? "बेटी (Daughter)" : "Daughter"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sub-selector for husband/wife */}
            {draft.relation === "spouse" && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 block">
                  {lang === "hi" ? "पति या पत्नी चुनें" : "Select Husband or Wife"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, gender: "male" })}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      draft.gender === "male"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-blue-50/70 text-blue-900 border-blue-200 hover:bg-blue-100"
                    )}
                  >
                    <span>👨</span>
                    <span>{lang === "hi" ? "पति (Husband)" : "Husband"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, gender: "female" })}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      draft.gender === "female"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-rose-50/70 text-rose-900 border-rose-200 hover:bg-rose-100"
                    )}
                  >
                    <span>👩</span>
                    <span>{lang === "hi" ? "पत्नी (Wife)" : "Wife"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Explicit Gender Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600 block">
                {lang === "hi" ? "लिंग (Gender)" : "Gender"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, gender: "male" })}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    draft.gender === "male"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <span>👨</span>
                  <span>{lang === "hi" ? "पुरुष (Male)" : "Male"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, gender: "female" })}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    draft.gender === "female"
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <span>👩</span>
                  <span>{lang === "hi" ? "महिला (Female)" : "Female"}</span>
                </button>
              </div>
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
                <label className="flex items-center gap-2 cursor-pointer select-none bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/70 mt-1">
                  <input
                    type="checkbox"
                    checked={isDeceasedDraft}
                    onChange={(e) => setIsDeceasedDraft(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                    <span>🕯️</span>
                    {lang === "hi" ? "स्वर्गीय (Late / Deceased) सदस्य" : "Late / Deceased member"}
                  </span>
                </label>
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
              className="w-full py-3 rounded-2xl bg-amber-400 text-white text-sm font-bold cursor-pointer"
            >
              {saving ? "…" : lang === "hi" ? "जोड़ें" : "Add"}
            </button>
          </div>
        </div>
      )}


      {editDraft && canEdit && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center backdrop-blur-xs"
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
            {/* Gender Selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600 block">
                {lang === "hi" ? "लिंग (Gender)" : "Gender"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditDraft({ ...editDraft, gender: "male" })}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    editDraft.gender === "male"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <span>👨</span>
                  <span>{lang === "hi" ? "पुरुष (Male)" : "Male"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditDraft({ ...editDraft, gender: "female" })}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    editDraft.gender === "female"
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <span>👩</span>
                  <span>{lang === "hi" ? "महिला (Female)" : "Female"}</span>
                </button>
              </div>
            </div>

            {/* Relationship in Family Selection */}
            {editDraft.link_id && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 block">
                  {lang === "hi" ? "रिश्ता / संबंध (Family Relationship)" : "Relationship in Family"}
                </label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-amber-400 font-medium"
                  value={editDraft.relation}
                  onChange={(e) => {
                    const r = e.target.value;
                    let g = editDraft.gender;
                    if (r === "father") g = "male";
                    else if (r === "mother") g = "female";
                    setEditDraft({ ...editDraft, relation: r, gender: g });
                  }}
                >
                  <option value="sibling">
                    {lang === "hi"
                      ? editDraft.gender === "female" ? "👭 सहोदर बहन (Sister)" : "👬 सहोदर भाई (Brother)"
                      : editDraft.gender === "female" ? "Sister" : "Brother"}
                  </option>
                  <option value="child">
                    {lang === "hi"
                      ? editDraft.gender === "female" ? "👧 संतान - बेटी (Daughter)" : "👦 संतान - बेटा (Son)"
                      : editDraft.gender === "female" ? "Daughter" : "Son"}
                  </option>
                  <option value="spouse">
                    {lang === "hi"
                      ? editDraft.gender === "female" ? "💍 जीवनसाथी - पत्नी (Wife)" : "💍 जीवनसाथी - पति (Husband)"
                      : editDraft.gender === "female" ? "Wife" : "Husband"}
                  </option>
                  <option value="father">{lang === "hi" ? "👨 पिता जी (Father)" : "Father"}</option>
                  <option value="mother">{lang === "hi" ? "👩 माता जी (Mother)" : "Mother"}</option>
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/70">
              <input
                type="checkbox"
                checked={isDeceasedDraft}
                onChange={(e) => setIsDeceasedDraft(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-400 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                <span>🕯️</span>
                {lang === "hi" ? "स्वर्गीय (Late / Deceased) सदस्य" : "Late / Deceased member"}
              </span>
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={saveEdit}
              className="w-full py-3 rounded-2xl bg-amber-400 text-white text-sm font-bold cursor-pointer"
            >
              {saving ? "…" : lang === "hi" ? "सेव" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Node actions */}
      {selected && (() => {
        const getSiblingParentId = (target: Node): string | undefined => {
          if (
            target.id === tree?.centre.id ||
            target.relation === "self" ||
            target.relation === "sibling" ||
            (tree?.siblings || []).some((s) => s.id === target.id) ||
            (tree?.centre && (tree?.siblings_of?.[tree.centre.id] || []).some((s) => s.id === target.id))
          ) {
            const f = (tree?.parents || []).find((x) => x.relation === "father");
            const m = (tree?.parents || []).find((x) => x.relation === "mother");
            return f?.id || m?.id;
          }
          const pid = target.id;
          const levels = tree?.levels_up || [];
          for (let d = 0; d < levels.length; d++) {
            if (!levels[d].some((n) => n.id === pid)) continue;
            const next = levels[d + 1] || [];
            for (const n of next) {
              if (n.via_id === pid || n.via_parent_id === pid) return n.id;
            }
          }
          for (const lvl of levels) {
            for (const n of lvl) {
              if ((n.relation === "father" || n.relation === "mother") && (n.via_id === pid || n.via_parent_id === pid)) {
                return n.id;
              }
            }
          }
          if ((tree?.children || []).some((c) => c.id === pid)) {
            return tree?.centre.id;
          }
          for (const lvl of tree?.levels_down || []) {
            for (const n of lvl) {
              if (n.id === pid && (n.via_id || n.via_child_id)) {
                return n.via_id || n.via_child_id || undefined;
              }
            }
          }
          return undefined;
        };

        const relInfo = resolveIndianRelationship(selected, tree, lang);
        const isSelf = selected.id === tree?.centre.id || selected.relation === "self";
        const isDeceased = /^(स्व\.|late|sw\.)/i.test(selected.display_name) || selected.status === "deceased";
        const cleanName = selected.display_name.replace(/^(स्व\.|late|sw\.)\s*/i, "");
        const sex = resolveSex(selected.gender, selected.relation);

        return (
          <div
            className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => {
              setSelected(null);
              setShowAddSubmenu(false);
            }}
          >
            <div
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-200/80 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Accent Header Bar */}
              <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 px-4 py-2.5 flex items-center justify-between text-white shadow-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Sparkles size={15} className="text-amber-200 shrink-0" />
                  <span className="text-xs font-bold tracking-wide truncate">
                    {relInfo.generationLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setShowAddSubmenu(false);
                  }}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 flex items-center justify-center transition-all cursor-pointer text-white"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div className="p-4 overflow-y-auto space-y-3.5 divide-y divide-amber-100/70">
                {/* Profile Hero Card */}
                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0 mt-0.5">
                    {selected.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selected.photo_url}
                        alt={selected.display_name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-md"
                      />
                    ) : (
                      <div
                        className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shadow-md border-2",
                          isSelf
                            ? "bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 border-amber-300"
                            : sex === "F"
                            ? "bg-gradient-to-br from-rose-100 to-rose-200 text-rose-800 border-rose-300"
                            : "bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-800 border-indigo-300"
                        )}
                      >
                        {cleanName.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    {isDeceased && (
                      <span
                        className="absolute -bottom-1 -right-1 bg-amber-100 border border-amber-300 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-xs"
                        title="स्वर्गीय"
                      >
                        🕯️
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isDeceased && (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300/80 px-1.5 py-0.5 rounded-md">
                          स्व.
                        </span>
                      )}
                      <h3 className="font-bold text-gray-900 text-lg leading-snug truncate">
                        {cleanName}
                      </h3>
                    </div>

                    {/* Primary Relationship Banner */}
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-amber-900 bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-full shadow-2xs">
                        {relInfo.shortTag}
                      </span>
                      <span className="text-[11px] font-medium text-amber-800 truncate">
                        {relInfo.primaryTitle}
                      </span>
                    </div>

                    {/* Mini status tags */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                        {sex === "F" ? "👩 महिला (Female)" : "👨 पुरुष (Male)"}
                      </span>
                      {selected.user_id ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ShieldCheck size={11} /> {lang === "hi" ? "पंजीकृत सदस्य" : "Registered"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          {lang === "hi" ? "पारिवारिक प्रविष्टि" : "Family Record"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Key Details Grid */}
                <div className="pt-3.5 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-2xl bg-amber-50/50 border border-amber-100">
                    <div className="flex items-center gap-1 text-[11px] text-amber-800 font-semibold mb-0.5">
                      <Calendar size={13} className="text-amber-600" />
                      <span>{lang === "hi" ? "जन्म / आयु" : "Birth / Age"}</span>
                    </div>
                    <p className="font-bold text-gray-900">
                      {formatBirth(selected) || (lang === "hi" ? "उल्लेख नहीं" : "Not specified")}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-amber-50/50 border border-amber-100">
                    <div className="flex items-center gap-1 text-[11px] text-amber-800 font-semibold mb-0.5">
                      <TreePine size={13} className="text-amber-600" />
                      <span>{lang === "hi" ? "गोत्र (Gotra)" : "Gotra"}</span>
                    </div>
                    <p className="font-bold text-gray-900 truncate">
                      {selected.gotra || (lang === "hi" ? "मातंग कुल" : "Matang Lineage")}
                    </p>
                  </div>
                </div>

                {/* Indian Relationship Insight Box */}
                <div className="pt-3.5 space-y-2">
                  <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50/30 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-800 mt-0.5">
                      <HeartHandshake size={18} />
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-bold text-amber-950">
                        {relInfo.primaryTitle}
                      </p>
                      <p className="text-[11px] text-amber-800/80 mt-0.5 leading-snug">
                        {relInfo.subTag || (lang === "hi" ? "पारंपरिक भारतीय पारिवारिक संबंध" : "Traditional Indian Family Relationship")}
                      </p>
                    </div>
                  </div>

                  {/* Multiple Family Roles */}
                  {relInfo.multipleRoles && relInfo.multipleRoles.length > 0 && (
                    <div className="bg-amber-50/30 border border-amber-100/90 rounded-2xl p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold text-gray-800 flex items-center gap-1">
                          <span>👨‍👩‍👧‍👦</span>
                          <span>{lang === "hi" ? "परिवार में भूमिकाएँ" : "Family Roles"}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-1.5 py-0.2 rounded-full">
                          {relInfo.multipleRoles.length}
                        </span>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {relInfo.multipleRoles.map((role, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-1.5 rounded-xl bg-white/80 border border-amber-100 text-[11px]"
                          >
                            <span className="shrink-0">{role.icon}</span>
                            <span className="font-bold text-amber-900 shrink-0 text-[10px] bg-amber-100/80 px-1 py-0.2 rounded">
                              {role.badge}
                            </span>
                            <span className="font-semibold text-gray-800 truncate">
                              {role.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Relative Submenu Drawer (when toggled via + Add icon button) */}
                {showAddSubmenu && (
                  <div className="pt-3.5 space-y-2 animate-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                        <Plus size={14} className="text-amber-600" />
                        <span>{lang === "hi" ? "नया संबंधी जोड़ें" : "Add Relative"}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddSubmenu(false)}
                        className="text-[11px] text-amber-800 hover:text-amber-950 font-medium cursor-pointer"
                      >
                        {lang === "hi" ? "रद्द करें ✕" : "Cancel ✕"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Add Brother */}
                      <button
                        type="button"
                        className="flex items-center gap-2 p-2.5 rounded-2xl bg-blue-50/80 hover:bg-blue-100 border border-blue-200 text-blue-950 font-semibold transition-all active:scale-95 text-left cursor-pointer"
                        onClick={() => {
                          const parentId = getSiblingParentId(selected);
                          if (!parentId) {
                            toast(
                              lang === "hi"
                                ? "इस व्यक्ति के माता/पिता पहले जोड़ें, तब भाई-बहन"
                                : "Add this person's parents first, then brother/sister",
                              "error"
                            );
                            return;
                          }
                          openAdd("sibling", parentId, "male");
                          setSelected(null);
                          setShowAddSubmenu(false);
                        }}
                      >
                        <Users size={16} className="text-blue-600 shrink-0" />
                        <div>
                          <p className="font-bold text-[11px]">{lang === "hi" ? "👦 भाई (Brother)" : "Brother"}</p>
                          <p className="text-[9px] text-blue-800/80">{lang === "hi" ? "सहोदर भाई" : "Sibling"}</p>
                        </div>
                      </button>

                      {/* Add Sister */}
                      <button
                        type="button"
                        className="flex items-center gap-2 p-2.5 rounded-2xl bg-rose-50/80 hover:bg-rose-100 border border-rose-200 text-rose-950 font-semibold transition-all active:scale-95 text-left cursor-pointer"
                        onClick={() => {
                          const parentId = getSiblingParentId(selected);
                          if (!parentId) {
                            toast(
                              lang === "hi"
                                ? "इस व्यक्ति के माता/पिता पहले जोड़ें, तब भाई-बहन"
                                : "Add this person's parents first, then brother/sister",
                              "error"
                            );
                            return;
                          }
                          openAdd("sibling", parentId, "female");
                          setSelected(null);
                          setShowAddSubmenu(false);
                        }}
                      >
                        <Users size={16} className="text-rose-600 shrink-0" />
                        <div>
                          <p className="font-bold text-[11px]">{lang === "hi" ? "👧 बहन (Sister)" : "Sister"}</p>
                          <p className="text-[9px] text-rose-800/80">{lang === "hi" ? "सहोदर बहन" : "Sibling"}</p>
                        </div>
                      </button>

                      {/* Add Son */}
                      <button
                        type="button"
                        className="flex items-center gap-2 p-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 font-semibold transition-all active:scale-95 text-left cursor-pointer"
                        onClick={() => {
                          openAdd("child", isSelf ? undefined : selected.id, "male");
                          setSelected(null);
                          setShowAddSubmenu(false);
                        }}
                      >
                        <Baby size={16} className="text-amber-600 shrink-0" />
                        <div>
                          <p className="font-bold text-[11px]">{lang === "hi" ? "👦 बेटा (Son)" : "Son"}</p>
                          <p className="text-[9px] text-amber-800/80">{lang === "hi" ? "संतान पीढ़ी" : "Child"}</p>
                        </div>
                      </button>

                      {/* Add Daughter */}
                      <button
                        type="button"
                        className="flex items-center gap-2 p-2.5 rounded-2xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-950 font-semibold transition-all active:scale-95 text-left cursor-pointer"
                        onClick={() => {
                          openAdd("child", isSelf ? undefined : selected.id, "female");
                          setSelected(null);
                          setShowAddSubmenu(false);
                        }}
                      >
                        <Baby size={16} className="text-pink-600 shrink-0" />
                        <div>
                          <p className="font-bold text-[11px]">{lang === "hi" ? "👧 बेटी (Daughter)" : "Daughter"}</p>
                          <p className="text-[9px] text-pink-800/80">{lang === "hi" ? "संतान पीढ़ी" : "Child"}</p>
                        </div>
                      </button>

                      {/* Add Spouse */}
                      <button
                        type="button"
                        className="flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-950 font-semibold transition-all active:scale-95 text-left cursor-pointer"
                        onClick={() => {
                          openAdd("spouse", isSelf ? undefined : selected.id);
                          setSelected(null);
                          setShowAddSubmenu(false);
                        }}
                      >
                        <HeartHandshake size={16} className="text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-[11px]">{lang === "hi" ? "जीवनसाथी (Spouse)" : "Spouse (Partner)"}</p>
                          <p className="text-[9px] text-emerald-800/80">{lang === "hi" ? "समान पीढ़ी" : "Same Tier"}</p>
                        </div>
                      </button>

                      {/* Add Parent */}
                      <button
                        type="button"
                        className="flex items-center gap-2 p-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-950 font-semibold transition-all active:scale-95 text-left cursor-pointer"
                        onClick={() => {
                          const isAncestor =
                            selected.relation === "father" ||
                            selected.relation === "mother" ||
                            selected.relation === "grandfather" ||
                            selected.relation === "grandmother" ||
                            (tree?.levels_up || []).some((lvl) => lvl.some((n) => n.id === selected.id));
                          openAdd(isAncestor ? "father" : "father", isSelf ? undefined : selected.id);
                          setSelected(null);
                          setShowAddSubmenu(false);
                        }}
                      >
                        <User size={16} className="text-indigo-600 shrink-0" />
                        <div>
                          <p className="font-bold text-[11px]">{lang === "hi" ? "माता / पिता" : "Parent (Father/Mother)"}</p>
                          <p className="text-[9px] text-indigo-800/80">{lang === "hi" ? "वरिष्ठ पीढ़ी" : "Upper Tier"}</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Icon Action Bar */}
              <div className="bg-gray-50/90 border-t border-gray-200/80 px-3 py-2.5 flex items-center justify-around gap-1.5">
                {/* + Add Icon Button */}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowAddSubmenu((v) => !v)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all cursor-pointer active:scale-95 min-w-[50px] flex-1",
                      showAddSubmenu
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-amber-100/70 hover:bg-amber-200/80 text-amber-950 border border-amber-300/70"
                    )}
                    title={lang === "hi" ? "संबंधी जोड़ें" : "Add Relative"}
                  >
                    <Plus size={17} />
                    <span className="text-[10px] font-bold">{lang === "hi" ? "+ जोड़ें" : "+ Add"}</span>
                  </button>
                )}

                {/* Edit Icon Button */}
                {canEdit && selected.relation !== "self" && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeceasedDraft(isDeceased);
                      setEditDraft({
                        person_id: selected.id,
                        link_id: selected.link_id,
                        name: cleanName,
                        birth_year: selected.birth_year ? String(selected.birth_year) : "",
                        birth_date: selected.birth_date || "",
                        gender: selected.gender || "",
                        relation: selected.relation || "child",
                      });
                      setSelected(null);
                      setShowAddSubmenu(false);
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100/90 active:scale-95 text-amber-950 border border-amber-200/80 transition-all cursor-pointer min-w-[50px] flex-1"
                    title={lang === "hi" ? "एडिट करें" : "Edit"}
                  >
                    <Pencil size={17} className="text-amber-700" />
                    <span className="text-[10px] font-bold">{lang === "hi" ? "एडिट" : "Edit"}</span>
                  </button>
                )}

                {/* Profile Icon Button */}
                {selected.user_id && (
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/member/${selected.user_id}`);
                      setSelected(null);
                      setShowAddSubmenu(false);
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl bg-blue-50 hover:bg-blue-100/90 active:scale-95 text-blue-950 border border-blue-200/80 transition-all cursor-pointer min-w-[50px] flex-1"
                    title="Profile"
                  >
                    <User size={17} className="text-blue-700" />
                    <span className="text-[10px] font-bold">{lang === "hi" ? "प्रोफ़ाइल" : "Profile"}</span>
                  </button>
                )}

                {/* Vanshawali / Tree Icon Button */}
                {selected.user_id && (
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/vanshawali?user=${selected.user_id}`);
                      setSelected(null);
                      setShowAddSubmenu(false);
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100/90 active:scale-95 text-emerald-950 border border-emerald-200/80 transition-all cursor-pointer min-w-[50px] flex-1"
                    title="Vanshawali Tree"
                  >
                    <TreePine size={17} className="text-emerald-700" />
                    <span className="text-[10px] font-bold">{lang === "hi" ? "वंशावली" : "Tree"}</span>
                  </button>
                )}

                {/* Change Relation Request Icon Button (Non-self) */}
                {selected.relation !== "self" && selected.id !== tree?.centre.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setChangeRelTarget(selected);
                      setNewProposedRel(selected.relation || "relative");
                      setRelChangeNote("");
                      setChangeRelMsg(null);
                      setSelected(null);
                      setShowAddSubmenu(false);
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100/90 active:scale-95 text-amber-950 border border-amber-200/80 transition-all cursor-pointer min-w-[50px] flex-1"
                    title={lang === "hi" ? "रिश्ता बदलने का अनुरोध" : "Request Relationship Change"}
                  >
                    <HeartHandshake size={17} className="text-amber-700" />
                    <span className="text-[10px] font-bold">{lang === "hi" ? "रिश्ता" : "Rel."}</span>
                  </button>
                )}

                {/* Delete / Remove Icon Button */}
                {canEdit && selected.relation !== "self" && selected.link_id && (
                  <button
                    type="button"
                    onClick={() => {
                      removeLink(selected);
                      setShowAddSubmenu(false);
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl bg-red-50 hover:bg-red-100/90 active:scale-95 text-red-700 border border-red-200/80 transition-all cursor-pointer min-w-[50px] flex-1"
                    title="Remove Link"
                  >
                    <Trash2 size={17} />
                    <span className="text-[10px] font-bold">{lang === "hi" ? "हटाएं" : "Remove"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Request Relationship Change (Bubble Tap -> Pending Approval) */}
      {changeRelTarget && (
        <div
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={() => {
            if (!submittingChangeRel) {
              setChangeRelTarget(null);
              setChangeRelMsg(null);
            }
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-amber-200 space-y-3.5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                  🔄
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {lang === "hi" ? "रिश्ता बदलने का अनुरोध" : "Request Relationship Change"}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {changeRelTarget.display_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={submittingChangeRel}
                onClick={() => {
                  setChangeRelTarget(null);
                  setChangeRelMsg(null);
                }}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {changeRelMsg && (
              <div
                className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed ${
                  changeRelMsg.ok
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {changeRelMsg.text}
              </div>
            )}

            {!changeRelMsg?.ok && (
              <form onSubmit={handleProposeRelChange} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {lang === "hi" ? "नया प्रस्तावित रिश्ता चुनें" : "Select Proposed Relationship"}
                  </label>
                  <select
                    value={newProposedRel}
                    onChange={(e) => setNewProposedRel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-amber-200/90 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    <option value="father">{lang === "hi" ? "पिता जी (Father)" : "Father"}</option>
                    <option value="mother">{lang === "hi" ? "माता जी (Mother)" : "Mother"}</option>
                    <option value="spouse">{lang === "hi" ? "जीवनसाथी - पति/पत्नी (Spouse)" : "Spouse"}</option>
                    <option value="son">{lang === "hi" ? "पुत्र / सुपुत्र (Son)" : "Son"}</option>
                    <option value="daughter">{lang === "hi" ? "पुत्री / सुपुत्री (Daughter)" : "Daughter"}</option>
                    <option value="brother">{lang === "hi" ? "भाई (Brother)" : "Brother"}</option>
                    <option value="sister">{lang === "hi" ? "बहन (Sister)" : "Sister"}</option>
                    <option value="grandfather_paternal">{lang === "hi" ? "दादा जी (Paternal Grandfather)" : "Paternal Grandfather"}</option>
                    <option value="grandmother_paternal">{lang === "hi" ? "दादी जी (Paternal Grandmother)" : "Paternal Grandmother"}</option>
                    <option value="grandfather_maternal">{lang === "hi" ? "नाना जी (Maternal Grandfather)" : "Maternal Grandfather"}</option>
                    <option value="grandmother_maternal">{lang === "hi" ? "नानी जी (Maternal Grandmother)" : "Maternal Grandmother"}</option>
                    <option value="uncle_chacha">{lang === "hi" ? "चाचा जी (Younger Paternal Uncle)" : "Younger Paternal Uncle"}</option>
                    <option value="uncle_tau">{lang === "hi" ? "ताऊ जी (Elder Paternal Uncle)" : "Elder Paternal Uncle"}</option>
                    <option value="aunt_bua">{lang === "hi" ? "बुआ जी (Paternal Aunt)" : "Paternal Aunt"}</option>
                    <option value="uncle_mama">{lang === "hi" ? "मामा जी (Maternal Uncle)" : "Maternal Uncle"}</option>
                    <option value="aunt_masi">{lang === "hi" ? "मौसी जी (Maternal Aunt)" : "Maternal Aunt"}</option>
                    <option value="bhabhi">{lang === "hi" ? "भाभी जी (Sister-in-law / Brother's Wife)" : "Sister-in-law"}</option>
                    <option value="jija">{lang === "hi" ? "जीजा जी (Brother-in-law / Sister's Husband)" : "Brother-in-law"}</option>
                    <option value="nephew">{lang === "hi" ? "भतीजा / भांजा (Nephew)" : "Nephew"}</option>
                    <option value="niece">{lang === "hi" ? "भतीजी / भांजी (Niece)" : "Niece"}</option>
                    <option value="other">{lang === "hi" ? "अन्य रिश्तेदार (Other Relative)" : "Other Relative"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {lang === "hi" ? "टिप्पणी / स्पष्टीकरण (वैकल्पिक)" : "Note / Reason (Optional)"}
                  </label>
                  <textarea
                    rows={2}
                    value={relChangeNote}
                    onChange={(e) => setRelChangeNote(e.target.value)}
                    placeholder={
                      lang === "hi"
                        ? "जैसे: यह मेरे बड़े भाई हैं या चाचा जी के लड़के हैं..."
                        : "e.g., Elder brother or cousin..."
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-300 resize-none"
                  />
                </div>

                <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-2.5 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                  <span className="text-sm shrink-0">ℹ️</span>
                  <span>
                    {lang === "hi"
                      ? "यह अनुरोध Super Admin / Core Committee के पास सत्यापन के लिए जाएगा। उनके अनुमोदन (Approval) के पश्चात ही वंशावली में यह रिश्ता अपडेट होगा।"
                      : "This request will be sent to the Super Admin / Core Committee for review. Once approved, the relationship will be updated in the tree."}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={submittingChangeRel}
                    onClick={() => {
                      setChangeRelTarget(null);
                      setChangeRelMsg(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                  >
                    {lang === "hi" ? "रद्द करें" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingChangeRel}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submittingChangeRel
                      ? (lang === "hi" ? "भेज रहे हैं..." : "Sending...")
                      : (lang === "hi" ? "अनुरोध भेजें" : "Submit Request")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

class VanshawaliErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Vanshawali error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl font-bold shadow-xs">
            ⚠️
          </div>
          <h2 className="text-base font-bold text-gray-900">
            वंशावली प्रदर्शित करने में समस्या आई
          </h2>
          <p className="text-xs text-gray-500 max-w-sm">
            {this.state.error?.message || "कृपया पेज को पुनः लोड करें।"}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 rounded-full bg-amber-500 text-white text-xs font-bold shadow-xs hover:bg-amber-600 active:scale-95 transition-all cursor-pointer"
          >
            पेज रीफ्रेश करें (Reload)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function VanshawaliPage() {
  return (
    <FeatureGate moduleKey="vanshawali">
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
        <VanshawaliErrorBoundary>
          <VanshawaliInner />
        </VanshawaliErrorBoundary>
      </Suspense>
    </FeatureGate>
  );
}
