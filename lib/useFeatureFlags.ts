"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { DEFAULTS, FeatureFlags, isModuleVisible } from "./featureFlags";
import type { FeatureRoleMatrix } from "./featureRoleMatrix";

/**
 * /api/flags = legacy stages (fallback)
 * /api/modules = Supabase get_my_modules (primary when available)
 * can(key): SA always true; if modules loaded → list.includes; else legacy
 */
export function useFeatureFlags(role?: string | null) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULTS);
  const [matrix, setMatrix] = useState<FeatureRoleMatrix | null>(null);
  const [modules, setModules] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  const applyFlags = useCallback((d: any) => {
    if (d?.flags) setFlags({ ...DEFAULTS, ...d.flags });
    if (d?.matrix && typeof d.matrix === "object") setMatrix(d.matrix);
  }, []);

  const applyModules = useCallback((d: any) => {
    if (!d) return;
    if (Array.isArray(d.modules)) {
      setModules(d.modules.map(String));
      return;
    }
    if (d.modules === null && d.error) {
      // RPC failed — keep null so can() uses legacy
      setModules(null);
      return;
    }
  }, []);

  const refresh = useCallback(() => {
    return Promise.all([
      fetch("/api/flags", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => applyFlags(d))
        .catch(() => {}),
      fetch("/api/modules", { credentials: "include", cache: "no-store" })
        .then(async (r) => {
          const d = await r.json().catch(() => null);
          if (!r.ok) return { modules: null, error: d?.error };
          return d;
        })
        .then((d) => applyModules(d))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [applyFlags, applyModules]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = () => {
      fetch("/api/flags", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled) applyFlags(d);
        })
        .catch(() => {});
      fetch("/api/modules", { credentials: "include", cache: "no-store" })
        .then(async (r) => {
          const d = await r.json().catch(() => null);
          if (!r.ok) return { modules: null, error: d?.error };
          return d;
        })
        .then((d) => {
          if (!cancelled) applyModules(d);
        })
        .catch(() => {});
    };
    load();
    const t = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 50);
    Promise.all([]).finally(() => {
      // flags/modules settle
      setTimeout(() => {
        if (!cancelled) setLoading(false);
      }, 800);
    });

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onFocus();
    });
    return () => {
      cancelled = true;
      clearTimeout(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [role, applyFlags, applyModules]);

  const can = useMemo(() => {
    return (moduleKey: string) => {
      if (role === "super_admin") return true;

      // Primary: Supabase module list when successfully loaded
      if (modules !== null) {
        return modules.includes(moduleKey);
      }

      // Fallback: legacy feature flags / matrix
      return isModuleVisible(moduleKey, flags, role, matrix);
    };
  }, [flags, matrix, role, modules]);

  return {
    flags,
    matrix,
    modules,
    memberModules: modules,
    loading,
    can,
    refresh,
  };
}
