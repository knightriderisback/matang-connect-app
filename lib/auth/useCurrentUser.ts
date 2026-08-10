"use client";
import { useEffect, useState } from "react";

export interface CurrentUser {
  id: string;
  full_name: string;
  phone: string;
  role: "normal" | "volunteer" | "core_committee" | "super_admin";
  city_id: string | null;
  native_village: string;
  verification_status: "pending" | "verified" | "rejected";
  qr_code_id: string | null;
  created_at: string;
  cities: { name: string } | null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
