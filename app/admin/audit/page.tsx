"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { ScrollText } from "lucide-react";

interface Log {
  id: string;
  actor_id?: string;
  actor_name?: string;
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
  const [err, setErr] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs || []);
        if (d.error) setErr(d.error);
        else setErr("");
      })
      .catch(() => toast("Failed to load audit logs", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (!user || !["core_committee", "super_admin"].includes(user.role || "")) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Committee / Super Admin only
      </div>
    );
  }

  const testWrite = async () => {
    const r = await fetch("/api/admin/audit", { method: "POST" });
    const d = await r.json();
    if (d.success) {
      toast("Test audit entry written", "success");
      load();
    } else {
      toast(d.error || "Write failed — check audit_logs table in Supabase", "error");
    }
  };

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScrollText className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Audit Log</h1>
        </div>
        {user.role === "super_admin" && (
          <button
            type="button"
            onClick={testWrite}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-matang-navy text-matang-gold"
          >
            Write test entry
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500">
        Login, register, profile update, M-PIN reset, feature toggles, etc.
      </p>
      {err && <p className="text-xs text-red-600 break-all">{err}</p>}
      {loading && <p className="text-center text-gray-400 py-8">Loading…</p>}
      {!loading && logs.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-gray-400">
            No audit entries yet. Use “Write test entry” or login/register to generate logs.
          </CardContent>
        </Card>
      )}
      <div className="space-y-2">
        {logs.map((l) => (
          <Card key={l.id || l.created_at + l.action}>
            <CardContent className="p-3 text-sm space-y-1">
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-matang-navy">{l.action}</span>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {l.created_at ? new Date(l.created_at).toLocaleString() : ""}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                By: {l.actor_name || l.actor_id || "—"}
                {l.target_id ? ` · target: ${String(l.target_id).slice(0, 12)}…` : ""}
              </p>
              {l.meta && (
                <pre className="text-[10px] text-gray-400 overflow-x-auto">
                  {typeof l.meta === "string" ? l.meta : JSON.stringify(l.meta)}
                </pre>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
