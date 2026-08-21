"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { DEFAULTS, FeatureFlags, isModuleVisible } from "./featureFlags";
import type { FeatureRoleMatrix } from "./featureRoleMatrix";

/**
 * Loads legacy feature flags (/api/flags) AND Supabase RPC modules (/api/modules).
 * can(key) = super_admin OR (legacy visible AND rpc modules allow when loaded).
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
    if (Array.isArray(d?.modules)) setModules(d.modules.map(String));
    else if (d?.modules === null) setModules(null);
  }, []);

  const refresh = useCallback(() => {
    return Promise.all([
      fetch("/api/flags", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => applyFlags(d))
        .catch(() => {}),
      fetch("/api/modules", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => applyModules(d))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [applyFlags, applyModules]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch("/api/flags", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled) applyFlags(d);
        })
        .catch(() => {}),
      fetch("/api/modules", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled) applyModules(d);
        })
        .catch(() => {}),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    const onFocus = () => {
      fetch("/api/flags", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled) applyFlags(d);
        })
        .catch(() => {});
      fetch("/api/modules", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled) applyModules(d);
        })
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    const onVis = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [role, applyFlags, applyModules]);

  const can = useMemo(() => {
    return (moduleKey: string) => {
      if (role === "super_admin") return true;

      // Legacy stage / feature flags (unchanged system)
      const legacyOk = isModuleVisible(moduleKey, flags, role, matrix);

      // Supabase RPC modules (additive gate)
      if (modules !== null) {
        const rpcOk = modules.includes(moduleKey);
        return legacyOk && rpcOk;
      }

      return legacyOk;
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
