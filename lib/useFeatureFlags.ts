"use client";
import { useEffect, useState, useCallback } from "react";
import { DEFAULTS, FeatureFlags, isModuleVisible } from "./featureFlags";

export function useFeatureFlags(role?: string | null) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    return fetch("/api/flags", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.flags) setFlags({ ...DEFAULTS, ...d.flags });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/flags", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.flags) setFlags({ ...DEFAULTS, ...d.flags });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const onFocus = () => {
      fetch("/api/flags", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.flags) setFlags({ ...DEFAULTS, ...d.flags });
        })
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

  // Super Admin: always full access in can() — members respect flags
  const can = (moduleKey: string) => isModuleVisible(moduleKey, flags, role);
  return { flags, loading, can, refresh };
}
