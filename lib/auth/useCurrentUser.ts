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

const CACHE_KEY = "matang_me_cache";
/** Keep role long enough so Admin / God Mode appear instantly after refresh */
const CACHE_MS = 24 * 60 * 60 * 1000;

function normalizeUser(u: any): CurrentUser | null {
  if (!u || !u.id) return null;
  return {
    ...u,
    full_name: u.full_name || u.fullName || "",
    verification_status: u.verification_status || u.verificationStatus || "pending",
    qr_code_id: u.qr_code_id ?? u.qrCodeId ?? null,
    role: u.role || "normal",
    city_id: u.city_id ?? null,
    native_village: u.native_village || "",
    phone: u.phone || "",
    created_at: u.created_at || "",
    cities: u.cities ?? null,
  } as CurrentUser;
}

function readCachedUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY) || sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.user) return null;
    if (Date.now() - (parsed.ts || 0) > CACHE_MS) return null;
    return normalizeUser(parsed.user);
  } catch {
    return null;
  }
}

function writeCachedUser(user: CurrentUser | null) {
  try {
    if (!user) {
      localStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(CACHE_KEY);
      return;
    }
    const payload = JSON.stringify({ user, ts: Date.now() });
    localStorage.setItem(CACHE_KEY, payload);
    sessionStorage.setItem(CACHE_KEY, payload);
  } catch {
    /* ignore quota */
  }
}

export function useCurrentUser() {
  // Synchronous hydrate → Admin tab + Matang AI visible on first paint after refresh
  const [user, setUser] = useState<CurrentUser | null>(() => readCachedUser());
  const [loading, setLoading] = useState(() => !readCachedUser());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          setUser(null);
          writeCachedUser(null);
          setError("not_authenticated");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.user) {
          setUser(null);
          setError(data.error || "load_failed");
          return;
        }
        setUser(normalizeUser(data.user));
        writeCachedUser(normalizeUser(data.user));
      })
      .catch(() => {
        setUser(null);
        setError("network");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setUser(null);
          writeCachedUser(null);
          setError("not_authenticated");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.user) {
          setUser(null);
          setError(data.error || "load_failed");
          return;
        }
        setUser(normalizeUser(data.user));
        writeCachedUser(normalizeUser(data.user));
      })
      .catch(() => {
        if (!cancelled) setError("network");
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
