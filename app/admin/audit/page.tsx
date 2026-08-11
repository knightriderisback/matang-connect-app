"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { ScrollText } from "lucide-react";

interface Log {
  id: string;
  actor_id?: string;
  action: string;
  target_id?: string;
  meta?: any;
  created_at: string;
}

export default function AuditPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then(r => r.json())
      .then(d => setLogs(d.logs || []))
      .catch(() => toast("Failed to load audit logs", "error"))
      .finally(() => setLoading(false));
  }, []);

  if (!user || !["core_committee", "super_admin"].includes(user.role || "")) {
    return <div className="p-4 text-center text-sm text-gray-500">Committee / Super Admin only</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="text-matang-gold" size={22} />
        <h1 className="text-lg font-bold text-matang-navy">Audit Log</h1>
      </div>
      <p className="text-xs text-gray-500">Recent admin actions (last 100).</p>
      {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}
      <div className="space-y-2">
        {logs.map(l => (
          <Card key={l.id}>
            <CardContent className="p-3">
              <div className="flex justify-between gap-2">
                <span className="text-sm font-semibold text-matang-navy">{l.action}</span>
                <span className="text-[10px] text-gray-400">{new Date(l.created_at).toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                actor: {l.actor_id?.slice(0, 8) || "-"} · target: {l.target_id?.slice(0, 12) || "-"}
              </p>
              {l.meta && <p className="text-[10px] text-gray-400 font-mono mt-1 truncate">{JSON.stringify(l.meta)}</p>}
            </CardContent>
          </Card>
        ))}
        {!loading && logs.length === 0 && <p className="text-center text-gray-400 py-8">No audit entries yet</p>}
      </div>
    </div>
  );
}
