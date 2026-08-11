"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { KeyRound, Search } from "lucide-react";

interface DirUser {
  id: string;
  full_name: string;
  phone: string;
  native_village: string;
  cities?: { name: string } | null;
}

export default function ResetMpinPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [users, setUsers] = useState<DirUser[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DirUser | null>(null);
  const [newMpin, setNewMpin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/directory")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setUsers(d.users || []))
      .catch(() => toast("Could not load members", "error"));
  }, []);

  const filtered = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search) ||
      u.native_village?.toLowerCase().includes(search.toLowerCase())
  );

  const handleReset = async () => {
    if (!selected) return;
    if (!/^\d{4}$/.test(newMpin)) {
      toast("New M-PIN must be exactly 4 digits", "error");
      return;
    }
    if (newMpin !== confirm) {
      toast("M-PIN confirmation does not match", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-mpin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, newMpin }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Reset failed", "error");
        return;
      }
      toast(`M-PIN reset for ${selected.full_name}`, "success");
      setSelected(null);
      setNewMpin("");
      setConfirm("");
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!user || !["core_committee", "super_admin", "volunteer"].includes(user.role || "")) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Only Volunteer / Core Committee / Super Admin can reset M-PIN.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="text-matang-gold" size={22} />
        <h1 className="text-lg font-bold text-matang-navy">Reset Member M-PIN</h1>
      </div>
      <p className="text-xs text-gray-500">
        Verify the member's identity in person before resetting. New M-PIN is 4 digits.
      </p>

      {!selected ? (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, village..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-matang-gold/40"
            />
          </div>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {filtered.map((u) => (
              <button key={u.id} onClick={() => setSelected(u)} className="w-full text-left">
                <Card className="hover:border-matang-gold/40 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-matang-navy text-white flex items-center justify-center font-bold text-sm">
                      {u.full_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-matang-navy truncate">{u.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{u.phone} · {u.native_village}</p>
                    </div>
                    <span className="text-gray-300">›</span>
                  </CardContent>
                </Card>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No members found</p>}
          </div>
        </>
      ) : (
        <Card className="border-matang-gold/30">
          <CardHeader>
            <CardTitle className="text-base">Reset for {selected.full_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">{selected.phone} · {selected.native_village} · {selected.cities?.name}</p>
            <Input label="New M-PIN *" type="password" maxLength={4} value={newMpin} onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, ""))} placeholder="4 digits" />
            <Input label="Confirm M-PIN *" type="password" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} placeholder="4 digits" />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setSelected(null); setNewMpin(""); setConfirm(""); }}>
                Cancel
              </Button>
              <Button className="flex-1" isLoading={loading} onClick={handleReset}>
                Reset M-PIN
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
