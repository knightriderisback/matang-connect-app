"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { DEFAULTS, FeatureFlags, isModuleVisible, MODULE_FLAG } from "./featureFlags";
import type { FeatureRoleMatrix } from "./featureRoleMatrix";

export function useFeatureFlags(role?: string | null) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULTS);
  const [matrix, setMatrix] = useState<FeatureRoleMatrix | null>(null);
  const [effective, setEffective] = useState<Record<string, boolean> | null>(null);
  const [modules, setModules] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  const applyFlags = useCallback((d: any) => {
    if (d?.flags) setFlags({ ...DEFAULTS, ...d.flags });
    if (d?.matrix && typeof d.matrix === "object") setMatrix(d.matrix);
    if (d?.effective && typeof d.effective === "object") setEffective(d.effective);
    if (Array.isArray(d?.memberModules)) setModules(d.memberModules.map(String));
  }, []);

  const applyModules = useCallback((d: any) => {
    if (!d) return;
    if (Array.isArray(d.modules)) {
      setModules(d.modules.map(String));
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
        .then((r) => (r.ok ? r.json() : null))
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
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled) applyModules(d);
        })
        .catch(() => {});
    };
    load();
    const t = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 100);

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
    return (moduleOrFlag: string) => {
      if (role === "super_admin") return true;

      // Check effective map first
      if (effective && typeof effective === "object") {
        if (moduleOrFlag in effective) {
          return effective[moduleOrFlag] !== false;
        }
        const fk = MODULE_FLAG[moduleOrFlag];
        if (fk && fk in effective) {
          return effective[fk] !== false;
        }
      }

      // Check service modules list
      if (modules !== null && (moduleOrFlag in MODULE_FLAG || modules.includes(moduleOrFlag))) {
        return modules.includes(moduleOrFlag);
      }

      // Fallback
      return isModuleVisible(moduleOrFlag, flags, role, matrix);
    };
  }, [flags, matrix, effective, role, modules]);

  return {
    flags,
    matrix,
    effective,
    modules,
    memberModules: modules,
    loading,
    can,
    refresh,
  };
}
