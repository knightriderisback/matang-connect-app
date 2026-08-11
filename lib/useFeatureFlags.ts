"use client";
import { useEffect, useState } from "react";
import { DEFAULTS, FeatureFlags, isModuleVisible } from "./featureFlags";

export function useFeatureFlags(role?: string | null) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/flags")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.flags) setFlags({ ...DEFAULTS, ...d.flags });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const can = (moduleKey: string) => isModuleVisible(moduleKey, flags, role);
  return { flags, loading, can };
}
