"use client";
import { useEffect, useState, useCallback } from "react";

export interface CurrentUser {
  id: string;
  full_name: string;
  phone: string;
  role: "normal" | "volunteer" | "core_committee" | "super_admin";
  city_id: string | null;
  native_village: string;
  verification_status: "pending" | "verified" | "rejected";
  qr_code_id: string | null;
  photo_url?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  education_level?: string | null;
  occupation?: string | null;
  about?: string | null;
  address?: string | null;
  title?: string | null;
  created_at: string;
  cities: { name: string } | null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          setUser(null);
          setError("not_authenticated");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.user) {
          setUser(null);
          setError(data.error || "load_failed");
          return;
        }
        setUser(data.user);
      })
      .catch(() => {
        setUser(null);
        setError("network");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Instant paint from short-lived session cache
    try {
      const cached = sessionStorage.getItem("matang_me_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.user && Date.now() - (parsed.ts || 0) < 60_000) {
          setUser(parsed.user);
          setLoading(false);
        }
      }
    } catch {
      /* ignore */
    }
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setUser(null);
          setError("not_authenticated");
          try {
            sessionStorage.removeItem("matang_me_cache");
          } catch {
            /* ignore */
          }
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.user) {
          setUser(null);
          setError(data.error || "load_failed");
          return;
        }
        setUser(data.user);
        try {
          sessionStorage.setItem(
            "matang_me_cache",
            JSON.stringify({ user: data.user, ts: Date.now() })
          );
        } catch {
          /* ignore quota */
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setError("network");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, error, refresh };
}
