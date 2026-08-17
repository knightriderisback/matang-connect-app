/** Synchronous role peek for instant Admin / Matang AI chrome (no network). */

export type CachedRole = "normal" | "volunteer" | "core_committee" | "super_admin" | string;

export function peekCachedRole(): CachedRole | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem("matang_me_cache") || sessionStorage.getItem("matang_me_cache");
    if (!raw) return null;
    const role = JSON.parse(raw)?.user?.role;
    return role || null;
  } catch {
    return null;
  }
}

export function peekIsStaff(): boolean {
  return ["volunteer", "core_committee", "super_admin"].includes(peekCachedRole() || "");
}

export function peekIsSuperAdmin(): boolean {
  return peekCachedRole() === "super_admin";
}

export function effectiveRole(userRole?: string | null): CachedRole | null {
  return userRole || peekCachedRole();
}
