"use client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Clickable person name → /member/[id] profile.
 * Use anywhere a post/entry shows who did it.
 */
export function NameLink({
  id,
  name,
  className,
  fallback = "Member",
}: {
  id?: string | null;
  name?: string | null;
  className?: string;
  fallback?: string;
}) {
  const router = useRouter();
  const label = (name && String(name).trim()) || fallback;
  if (!id) {
    return <span className={cn("font-medium text-matang-navy", className)}>{label}</span>;
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/member/${id}`);
      }}
      className={cn(
        "font-semibold text-matang-navy hover:underline hover:text-matang-gold transition-colors text-left",
        className
      )}
    >
      {label}
    </button>
  );
}
