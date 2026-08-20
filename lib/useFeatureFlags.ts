"use client";
import { useEffect, useState, useCallback } from "react";
import { DEFAULTS, FeatureFlags, isModuleVisible } from "./featureFlags";
import type { FeatureRoleMatrix } from "./featureRoleMatrix";

export function useFeatureFlags(role?: string | null) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULTS);
  const [matrix, setMatrix] = useState<FeatureRoleMatrix | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = (d: any) => {
    if (d?.flags) setFlags({ ...DEFAULTS, ...d.flags });
    if (d?.matrix) setMatrix(d.matrix);
  };

  const refresh = useCallback(() => {
    return fetch("/api/flags", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => apply(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
        .then((d) => apply(d))
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onFocus();
    });

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [role]);

  const can = (moduleKey: string) => isModuleVisible(moduleKey, flags, role, matrix);
  return { flags, matrix, loading, can, refresh };
}
