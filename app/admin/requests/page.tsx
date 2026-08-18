/** LOCKED — All Requests UI */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { effectiveRole } from "@/lib/auth/roleCache";
import { useFeatureFlags } from "@/lib/useFeatureFlags";
import { Inbox } from "lucide-react";

export default function AdminRequestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading } = useCurrentUser();
  const role = effectiveRole(user?.role);
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(role || "");
  const isApprover = ["core_committee", "super_admin"].includes(role || "");
  const { can, flags } = useFeatureFlags(role);
  const allowed = can("admin_requests") && flags.admin_requests_enabled !== false;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/requests")
      .then((r) => r.json())
      .then((d) => setItems(d.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isStaff) load();
  }, [isStaff]);

  const resolvePoll = async (id: string, decision: "accept" | "reject") => {
    const res = await fetch("/api/admin/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "poll_vote_change", request_id: id, decision }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast(decision === "accept" ? "Accepted" : "Rejected", "success");
    load();
  };

  if (userLoading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (!isStaff) {
    return <div className="p-8 text-center text-sm text-gray-500">Staff access only — Volunteer / Core / Super Admin</div>;
  }
  if (!allowed) {
    return <div className="p-8 text-center text-sm text-gray-500">All Requests is turned off for your account</div>;
  }

  const shown = filter === "pending" ? items.filter((i) => i.status === "pending") : items;

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Inbox className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">All Requests</h1>
        </div>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-2.5 py-1 rounded-full border ${
              filter === "pending" ? "bg-matang-navy text-white border-matang-navy" : "bg-white"
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-full border ${
              filter === "all" ? "bg-matang-navy text-white border-matang-navy" : "bg-white"
            }`}
          >
            All
          </button>
        </div>
      </div>
      <p className="text-[11px] text-gray-500">
        Poll changes, verifications, and future module requests — one place.
      </p>

      {loading ? (
        <p className="text-center text-gray-400 py-8">Loading…</p>
      ) : shown.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-400 text-sm">No requests</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex justify-between gap-2 items-start">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-matang-gold font-bold">
                      {r.type_label}
                    </p>
                    <button
                      type="button"
                      className="text-sm font-semibold text-matang-navy hover:underline"
                      onClick={() => r.user_id && router.push(`/member/${r.user_id}`)}
                    >
                      {r.user_name || "Member"}
                    </button>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      r.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : r.status === "accepted"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                {r.meta?.reason && (
                  <p className="text-xs text-gray-600">Reason: {r.meta.reason}</p>
                )}
                {r.meta?.phone && (
                  <p className="text-xs text-gray-500">📞 {r.meta.phone}</p>
                )}
                {r.meta?.poll_id && (
                  <p className="text-[10px] text-gray-400">Poll: {r.meta.poll_id}</p>
                )}
                {r.created_at && (
                  <p className="text-[10px] text-gray-400">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {r.href && (
                    <Button
                      variant="outline"
                      className="text-xs px-2 py-1"
                      onClick={() => router.push(r.href)}
                    >
                      Open
                    </Button>
                  )}
                  {isApprover && r.type === "poll_vote_change" && r.status === "pending" && (
                    <>
                      <Button
                        className="text-xs px-2 py-1"
                        onClick={() => resolvePoll(r.id, "accept")}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="text-xs px-2 py-1"
                        onClick={() => resolvePoll(r.id, "reject")}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {r.type === "user_verify" && r.status === "pending" && (
                    <Button
                      className="text-xs px-2 py-1"
                      onClick={() => router.push("/admin/verify")}
                    >
                      Verify
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
