"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { ClipboardCheck, RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  CRITICAL_SMOKE,
  buildDynamicSections,
  allChecklistIds,
} from "@/lib/qaChecklistRegistry";

const STORAGE_KEY = "matang_qa_checklist_v3";

type Checks = Record<string, boolean>;

function loadState(): { checks: Checks; build: string; tester: string; date: string } {
  if (typeof window === "undefined") {
    return { checks: {}, build: "", tester: "", date: "" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { checks: {}, build: "", tester: "", date: new Date().toISOString().slice(0, 10) };
    }
    const p = JSON.parse(raw);
    return {
      checks: p.checks || {},
      build: p.build || "",
      tester: p.tester || "",
      date: p.date || new Date().toISOString().slice(0, 10),
    };
  } catch {
    return { checks: {}, build: "", tester: "", date: new Date().toISOString().slice(0, 10) };
  }
}

export default function QaChecklistPage() {
  const { user, loading } = useCurrentUser();
  const [checks, setChecks] = useState<Checks>({});
  const [build, setBuild] = useState("");
  const [tester, setTester] = useState("");
  const [date, setDate] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const sections = useMemo(() => buildDynamicSections(), []);
  const allIds = useMemo(() => allChecklistIds(), []);

  useEffect(() => {
    const s = loadState();
    setChecks(s.checks);
    setBuild(s.build);
    setTester(s.tester);
    setDate(s.date || new Date().toISOString().slice(0, 10));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ checks, build, tester, date }));
    } catch {
      /* ignore */
    }
  }, [checks, build, tester, date, hydrated]);

  const toggle = useCallback((id: string) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
    setShowResult(false);
  }, []);

  const clearAll = () => {
    if (!confirm("Saari ticks clear karni hain?")) return;
    setChecks({});
    setShowResult(false);
  };

  const critTotal = CRITICAL_SMOKE.length;
  const critPass = CRITICAL_SMOKE.reduce((n, _, i) => n + (checks[`c${i}`] ? 1 : 0), 0);
  const fullTotal = allIds.length;
  const fullPass = allIds.reduce((n, x) => n + (checks[x.id] ? 1 : 0), 0);
  const pct = fullTotal ? Math.round((fullPass / fullTotal) * 100) : 0;
  const missingCrit = CRITICAL_SMOKE.map((label, i) => ({ label, id: `c${i}` })).filter(
    (x) => !checks[x.id]
  );

  let resultKind: "pass" | "fail" | "partial" = "pass";
  let resultTitle = "PASS — Critical smoke clear";
  let resultMsg =
    "Saari checked items pass. Zero-gap sign-off ke liye ready (agar real test kiya ho).";
  if (critPass < critTotal) {
    resultKind = "fail";
    resultTitle = "FAIL — Critical items missing";
    resultMsg = `${critTotal - critPass} critical (★) unchecked. Release mat bolo jab tak fix na ho.`;
  } else if (fullPass < fullTotal) {
    resultKind = "partial";
    resultTitle = "PARTIAL — Smoke OK, full list incomplete";
    resultMsg = `Critical smoke pass. Full checklist mein ${fullTotal - fullPass} baaki.`;
  }

  if (loading || !hydrated) {
    return <div className="p-8 text-center text-gray-500">Loading…</div>;
  }
  if (user?.role !== "super_admin") {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        Super Admin only — QA checklist
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-28 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-matang-navy flex items-center gap-2">
            <ClipboardCheck className="text-matang-gold" size={22} />
            QA Checklist
          </h1>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Super Admin · auto-updates from feature flags + module registry
          </p>
        </div>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs flex items-center gap-1 text-gray-500 px-2 py-1 rounded-lg border border-gray-200"
        >
          <RotateCcw size={12} /> Clear
        </button>
      </div>

      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 flex gap-2 text-[11px] text-sky-900">
        <Info size={16} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Auto checklist</p>
          <p>
            Naya module: <code className="bg-white/80 px-1 rounded">featureFlags.ts</code> (DEFAULTS +
            MODULE_FLAG) + optional <code className="bg-white/80 px-1 rounded">MODULE_ROUTES</code> /{" "}
            <code className="bg-white/80 px-1 rounded">ADMIN_TOOL_ROUTES</code> in{" "}
            <code className="bg-white/80 px-1 rounded">lib/qaChecklistRegistry.ts</code> → Part 2 mein
            khud add. Critical 30 curated rehta hai.
          </p>
        </div>
      </div>

      <div className="sticky top-0 z-10 rounded-2xl bg-matang-navy text-matang-gold px-4 py-3 shadow-md">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>
            Progress: {fullPass}/{fullTotal} ({pct}%)
          </span>
          <span className="text-[11px] opacity-80">
            ★ Critical: {critPass}/{critTotal}
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-matang-gold transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-2">
        <p className="text-sm font-semibold text-matang-navy">Test info</p>
        <input
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
          placeholder="Build / commit"
          value={build}
          onChange={(e) => setBuild(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            type="date"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm"
            placeholder="Tester name"
            value={tester}
            onChange={(e) => setTester(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-red-100 bg-white p-4">
        <h2 className="text-sm font-bold text-red-700 mb-1">PART 1 — Critical smoke</h2>
        <p className="text-[11px] text-gray-500 mb-3">
          Deploy gate · curated list · ★ fail = release mat bolo
        </p>
        <div className="space-y-1">
          {CRITICAL_SMOKE.map((label, i) => {
            const id = `c${i}`;
            const on = !!checks[id];
            return (
              <label
                key={id}
                className={`flex gap-3 items-start p-2.5 rounded-xl cursor-pointer active:bg-gray-50 ${
                  on ? "opacity-70" : ""
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 w-5 h-5 accent-matang-navy shrink-0"
                  checked={on}
                  onChange={() => toggle(id)}
                />
                <span
                  className={`text-sm ${on ? "line-through text-gray-400" : "text-red-700 font-medium"}`}
                >
                  <span className="text-red-600">★</span> {label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-matang-navy">PART 2 — Full + Auto from code</h2>
          <p className="text-[11px] text-gray-500">
            Flags / modules / admin tools code se generate · total items: {fullTotal - critTotal}
          </p>
        </div>
        {sections.map((sec, si) => (
          <div key={sec.title}>
            <h3 className="text-xs font-bold text-matang-navy mb-1 border-b border-gray-100 pb-1">
              {sec.title}
              {sec.title.startsWith("Auto") && (
                <span className="ml-2 text-[10px] font-normal text-emerald-600">auto</span>
              )}
            </h3>
            <div className="space-y-0.5">
              {sec.items.map((label, ti) => {
                const id = `s${si}_${ti}`;
                const on = !!checks[id];
                return (
                  <label
                    key={id}
                    className={`flex gap-3 items-start p-2 rounded-lg cursor-pointer active:bg-gray-50 ${
                      on ? "opacity-70" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 w-5 h-5 accent-matang-navy shrink-0"
                      checked={on}
                      onChange={() => toggle(id)}
                    />
                    <span className={`text-sm ${on ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
        <h2 className="text-sm font-bold text-matang-navy">Result</h2>
        <Button className="w-full" onClick={() => setShowResult(true)}>
          Calculate result
        </Button>
        {showResult && (
          <div
            className={`rounded-xl p-4 text-sm space-y-2 ${
              resultKind === "pass"
                ? "bg-green-50 border border-green-200 text-green-900"
                : resultKind === "fail"
                  ? "bg-red-50 border border-red-200 text-red-900"
                  : "bg-amber-50 border border-amber-200 text-amber-950"
            }`}
          >
            <p className="font-bold text-base">{resultTitle}</p>
            <p>
              <b>Critical:</b> {critPass} / {critTotal} &nbsp;|&nbsp; <b>Full:</b> {fullPass} /{" "}
              {fullTotal}
            </p>
            <p>{resultMsg}</p>
            {missingCrit.length > 0 && (
              <div>
                <p className="font-semibold mt-2">Missing critical:</p>
                <ul className="list-disc pl-5 text-xs space-y-0.5">
                  {missingCrit.map((x) => (
                    <li key={x.id}>{x.label}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[11px] opacity-80 pt-1">
              Build: {build || "—"} · Tester: {tester || "—"} · Date: {date || "—"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
