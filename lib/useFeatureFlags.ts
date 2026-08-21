"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { DEFAULTS, FeatureFlags, isModuleVisible } from "./featureFlags";
import {
  accessAllows,
  defaultAccessLists,
  type ModuleAccessLists,
} from "./moduleAccess";

export function useFeatureFlags(role?: string | null) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULTS);
  const [access, setAccess] = useState<ModuleAccessLists | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((d: any) => {
    if (d?.flags) setFlags({ ...DEFAULTS, ...d.flags });
    if (d?.access && typeof d.access === "object") {
      setAccess({
        member: Array.isArray(d.access.member) ? d.access.member.map(String) : [],
        volunteer: Array.isArray(d.access.volunteer) ? d.access.volunteer.map(String) : [],
        core: Array.isArray(d.access.core) ? d.access.core.map(String) : [],
      });
    } else if (Array.isArray(d?.memberModules)) {
      setAccess({
        ...defaultAccessLists(),
        member: d.memberModules.map(String),
      });
    }
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
      if (role === "super_admin") return true;
      if (access) {
        return accessAllows(moduleKey, access, role);
      }
      return isModuleVisible(moduleKey, flags, role, null);
    };
  }, [access, flags, role]);

  const memberModules = access?.member ?? null;

  return { flags, access, memberModules, matrix: null, loading, can, refresh };
}
