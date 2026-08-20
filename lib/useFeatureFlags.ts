"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { DEFAULTS, FeatureFlags, isModuleVisible, MODULE_FLAG } from "./featureFlags";
import type { FeatureRoleMatrix } from "./featureRoleMatrix";

export function useFeatureFlags(role?: string | null) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULTS);
  const [matrix, setMatrix] = useState<FeatureRoleMatrix | null>(null);
  const [memberModules, setMemberModules] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((d: any) => {
    if (d?.flags) setFlags({ ...DEFAULTS, ...d.flags });
    if (d?.matrix && typeof d.matrix === "object") setMatrix(d.matrix);
    if (Array.isArray(d?.memberModules)) setMemberModules(d.memberModules.map(String));
  }, []);

  const refresh = useCallback(() => {
    return fetch("/api/flags", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => apply(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/flags", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) apply(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const onFocus = () => {
      fetch("/api/flags", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled) apply(d);
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
  }, [role, apply]);

  const can = useMemo(() => {
    return (moduleKey: string) => {
      // Normal members: prefer explicit memberModules allowlist for module keys
      const isMemberRole =
        !role ||
        role === "normal" ||
        (role !== "volunteer" && role !== "core_committee" && role !== "super_admin");
      if (isMemberRole && memberModules && moduleKey in MODULE_FLAG) {
        return memberModules.includes(moduleKey);
      }
      // Flag keys like ai_member_enabled / services_tab_members
      if (isMemberRole && matrix) {
        const cell = matrix[moduleKey] || matrix[MODULE_FLAG[moduleKey as keyof typeof MODULE_FLAG] as string];
        if (cell && typeof cell.member === "boolean") return cell.member;
      }
      return isModuleVisible(moduleKey, flags, role, matrix);
    };
  }, [flags, matrix, role, memberModules]);

  return { flags, matrix, memberModules, loading, can, refresh };
}
