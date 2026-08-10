"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useToast } from "@/components/ui/Toaster";
import { Check, X, Phone, MapPin } from "lucide-react";

interface PendingUser {
  id: string;
  full_name: string;
  phone: string;
  native_village: string;
  cities: { name: string } | null;
  created_at: string;
}

export default function AdminVerifyPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/verify")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setUsers(data.users || []))
      .catch(() => toast(t("common.error"), "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (userId: string, status: "verified" | "rejected") => {
    setActing(userId);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || t("common.error"), "error");
        return;
      }
      toast(status === "verified" ? "User verified" : "User rejected", "success");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-matang-navy">Verify Users</h1>
      <p className="text-sm text-gray-500">Pending registrations awaiting approval</p>
      {loading && <p className="text-gray-400 text-center py-8">Loading...</p>}
      {!loading && users.length === 0 && (
        <p className="text-gray-400 text-center py-8">No pending users</p>
      )}
      <div className="space-y-3">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4">
              <p className="font-bold text-matang-navy">{u.full_name}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={13} /> {u.phone}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={13} /> {u.native_village} • {u.cities?.name || "-"}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1" isLoading={acting === u.id} onClick={() => handleAction(u.id, "verified")}>
                  <Check size={16} /> Verify
                </Button>
                <Button size="sm" variant="danger" className="flex-1" isLoading={acting === u.id} onClick={() => handleAction(u.id, "rejected")}>
                  <X size={16} /> Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
