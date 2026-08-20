"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { ClipboardCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "matang_qa_checklist_v2";

const CRITICAL: string[] = [
  "Login works (phone + M-PIN numeric keyboard)",
  "Register ke baad SAME credentials se login success",
  "Refresh ke baad session rehti hai",
  "Home/feed load; scroll pe blank nahi",
  "Header: MATANG CONNECT + name/role",
  "Normal footer: Home · Profile · Services ONLY",
  "Staff footer: Home · Profile · Admin (no Census)",
  "Profile EDIT → SAVE → reload pe data same",
  "M-PIN change YA admin reset → naya PIN se login",
  "Services: flag OFF module normal ko nahi dikhe",
  "Services: flag ON module sahi page khole",
  "Admin Settings: flag toggle → member pe asar",
  "Personal override sirf us user pe (agar use)",
  "SOS trigger + detail (crash nahi)",
  "Scan: QR/file → member card → profile",
  "Feed: author name → profile",
  "Care YA Jobs create 500 nahi",
  "Polls: vote save YA clear error",
  "Panchang calendar + Today",
  "Panchang staff add green (staff)",
  "Directory load + 1 filter",
  "Directory se member profile",
  "All Requests allowed roles pe open",
  "Badges/points page OK",
  "Matrimony list/form crash nahi",
  "WhatsApp share wa.me open",
  "Language toggle kaam kare",
  "Logout ke baad private → login",
  "Production deploy; Vercel error nahi",
  "Home + Profile pe critical console error nahi",
];

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: "A. Environment",
    items: ["HTTPS loads", "Vercel build green", "Supabase env set", "Old cache stuck UI nahi"],
  },
  {
    title: "B. Auth extra",
    items: ["Wrong PIN clear error", "Register + CG cities", "Duplicate phone reject", "Pending behaviour OK"],
  },
  {
    title: "C. Shell UI",
    items: ["Logo 3D correct", "SOS header near language", "Floaters opacity", "PWA install prompt", "Splash real logo"],
  },
  {
    title: "D. Home / Feed",
    items: ["Normal: feed only", "Image posts flag", "Member post flag", "WhatsApp image+text", "SOS short in feed"],
  },
  {
    title: "E. Profile",
    items: ["Photo after save", "Dropdown + Other", "DOB + height cm/ft", "Share + branded WA", "Admin full member view"],
  },
  {
    title: "F. Flags / Stages",
    items: ["Stage 1/2/3 lock", "Module flags save", "URL gated when off", "Reset personal overrides", "Staff admin tools OK"],
  },
  {
    title: "G. SOS deep",
    items: ["Popup + sound", "Location link", "Volunteer respond", "Status updates"],
  },
  {
    title: "H. Care / Jobs / Kosh / Census",
    items: ["Care enums match DB", "Jobs create+list", "Kosh path", "Census not in footer"],
  },
  {
    title: "I. Scan / Directory",
    items: ["Camera + file upload", "Flag off hides entry", "Multi-filter + sort", "No wrong verify on directory"],
  },
  {
    title: "J. Matrimony / Polls / Rides",
    items: ["Matrimony save+list", "Poll lock + change req", "Requests approve", "Rides poster→profile"],
  },
  {
    title: "K. Panchang",
    items: ["Verified 2025–27", "Recurrence options", "Edit/Delete staff only", "Sync safe for staff", "WA is-hafte + city"],
  },
  {
    title: "L. Badges / Titles / Admin",
    items: ["Points order", "Award + clickable names", "Titles on header", "Verify queue", "Audit new rows", "Demo seed"],
  },
  {
    title: "M. Thin modules",
    items: ["Vyapar open", "Dharohar open", "Mahila open", "Arthik open", "Gaurav open"],
  },
  {
    title: "N. AI / Perf / Roles",
    items: ["Member AI", "God Mode SA only", "Admin load not too slow", "Mobile 375px layout", "Normal denied settings"],
  },
];

type Checks = Record<string, boolean>;

function loadState(): { checks: Checks; build: string; tester: string; date: string } {
  if (typeof window === "undefined") {
    return { checks: {}, build: "", tester: "", date: "" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { checks: {}, build: "", tester: "", date: new Date().toISOString().slice(0, 10) };
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
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ checks, build, tester, date })
      );
    } catch {
      /* ignore */
    }
  }, [checks, build, tester, date, hydrated]);

  const allIds = useMemo(() => {
    const ids: { id: string; label: string; critical: boolean }[] = [];
    CRITICAL.forEach((label, i) => ids.push({ id: `c${i}`, label, critical: true }));
    SECTIONS.forEach((sec, si) => {
      sec.items.forEach((label, ti) => {
        ids.push({ id: `s${si}_${ti}`, label: `${sec.title}: ${label}`, critical: false });
      });
    });
    return ids;
  }, []);

  const toggle = useCallback((id: string) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
    setShowResult(false);
  }, []);

  const clearAll = () => {
    if (!confirm("Saari ticks clear karni hain?")) return;
    setChecks({});
    setShowResult(false);
  };

  const critTotal = CRITICAL.length;
  const critPass = CRITICAL.reduce((n, _, i) => n + (checks[`c${i}`] ? 1 : 0), 0);
  const fullTotal = allIds.length;
  const fullPass = allIds.reduce((n, x) => n + (checks[x.id] ? 1 : 0), 0);
  const pct = fullTotal ? Math.round((fullPass / fullTotal) * 100) : 0;
  const missingCrit = CRITICAL.map((label, i) => ({ label, id: `c${i}` })).filter(
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
    resultMsg = `Critical 30 pass. Full checklist mein ${fullTotal - fullPass} baaki.`;
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
            Super Admin only · Critical 30 smoke + full zero-gap · ticks is device pe save
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

      {/* Progress */}
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

      {/* Meta */}
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

      {/* Critical 30 */}
      <div className="rounded-2xl border border-red-100 bg-white p-4">
        <h2 className="text-sm font-bold text-red-700 mb-1">PART 1 — Critical 30 Smoke</h2>
        <p className="text-[11px] text-gray-500 mb-3">
          15–20 min. Deploy ke baad pehle ye. ★ fail = release mat bolo.
        </p>
        <div className="space-y-1">
          {CRITICAL.map((label, i) => {
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
                <span className={`text-sm ${on ? "line-through text-gray-400" : "text-red-700 font-medium"}`}>
                  <span className="text-red-600">★</span> {label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Full sections */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-matang-navy">PART 2 — Full Zero-Gap</h2>
          <p className="text-[11px] text-gray-500">Smoke green ke baad · real device test</p>
        </div>
        {SECTIONS.map((sec, si) => (
          <div key={sec.title}>
            <h3 className="text-xs font-bold text-matang-navy mb-1 border-b border-gray-100 pb-1">
              {sec.title}
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

      {/* Result */}
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
