"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/components/ui/Toaster";
import { MapPin, Phone, Search } from "lucide-react";

interface DirectoryUser {
  id: string;
  full_name: string;
  phone: string;
  native_village: string;
  cities: { name: string } | null;
  families: { education_summary: string; employment_status: string; family_members: any[] }[];
}

export default function AdminDirectoryPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/directory")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setUsers(data.users || []))
      .catch(() => toast(t("common.error"), "error"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.native_village?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-matang-navy">City Directory</h1>
        {user?.role === "core_committee" && <p className="text-sm text-gray-500">Showing your city only</p>}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or village..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-matang-gold focus:outline-none"
        />
      </div>
      {loading && <p className="text-gray-400 text-center py-8">Loading...</p>}
      {!loading && filtered.length === 0 && <p className="text-gray-400 text-center py-8">No members found</p>}
      <div className="space-y-3">
        {filtered.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4">
              <p className="font-bold text-matang-navy">{u.full_name}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={13} /> {u.phone}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={13} /> {u.native_village} • {u.cities?.name || "-"}</p>
              {u.families?.[0] && (
                <p className="text-xs text-gray-400 mt-1">{u.families[0].employment_status} • {u.families[0].family_members?.length || 0} family members</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
