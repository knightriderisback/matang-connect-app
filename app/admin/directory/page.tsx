"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/components/ui/Toaster";
import { MapPin, Phone, Search, ChevronLeft, Shield, Users } from "lucide-react";

interface DirectoryUser {
  id: string;
  full_name: string;
  phone: string;
  native_village: string;
  role?: string;
  qr_code_id?: string;
  cities: { name: string } | null;
  families: { education_summary: string; employment_status: string; address?: string; needs?: string[]; family_members: { name: string; relation: string; age?: number; blood_group?: string; occupation?: string }[] }[];
}

export default function AdminDirectoryPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const searchParams = useSearchParams();
  const userParam = searchParams.get("user");
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterVillage, setFilterVillage] = useState("");
  const [filterEmployment, setFilterEmployment] = useState("");
  const [memberDetail, setMemberDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<DirectoryUser | null>(null);

  useEffect(() => {
    fetch("/api/admin/directory")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const list = data.users || [];
        setUsers(list);
        if (userParam) {
          const found = list.find((u: DirectoryUser) => u.id === userParam);
          if (found) {
            setSelected(found);
            setDetailLoading(true);
            fetch(`/api/admin/member-flags?userId=${found.id}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => d && setMemberDetail(d))
              .finally(() => setDetailLoading(false));
          }
        }
      })
      .catch(() => toast(t("common.error"), "error"))
      .finally(() => setLoading(false));
  }, [userParam]);

  const villages = Array.from(new Set(users.map((u) => u.native_village).filter(Boolean))).sort();
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.native_village?.toLowerCase().includes(q) ||
      u.phone?.includes(search);
    const matchVillage = !filterVillage || u.native_village === filterVillage;
    const emp = u.families?.[0]?.employment_status || "";
    const matchEmp = !filterEmployment || emp === filterEmployment;
    return matchSearch && matchVillage && matchEmp;
  });


  if (selected) {
    const fam = memberDetail?.family || selected.families?.[0];
    const detail = memberDetail?.user || selected;
    const overrides: Record<string, boolean> = memberDetail?.overrides || {};
    const MODULE_FLAGS = [
      ["sos_enabled", "SOS"],
      ["jobs_enabled", "Jobs"],
      ["notices_enabled", "Notices / Feed"],
      ["care_enabled", "Care"],
      ["kosh_transparency_mode", "Kosh"],
      ["vyapar_enabled", "Vyapar"],
      ["matrimony_enabled", "Matrimony"],
      ["dharohar_enabled", "Dharohar"],
      ["panchang_enabled", "Panchang"],
      ["mahila_enabled", "Mahila"],
      ["polls_enabled", "Polls"],
      ["arthik_enabled", "Arthik"],
      ["rides_enabled", "Rides"],
      ["gaurav_enabled", "Gaurav"],
      ["gamification_enabled", "Credits"],
      ["scan_enabled", "Scan"],
    ] as const;

    const toggleMemberFlag = async (key: string, value: boolean) => {
      setMemberDetail((prev: any) => ({
        ...prev,
        overrides: { ...(prev?.overrides || {}), [key]: value },
      }));
      const res = await fetch("/api/admin/member-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, key, value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Could not save", "error");
        setMemberDetail((prev: any) => ({
          ...prev,
          overrides: { ...(prev?.overrides || {}), [key]: !value },
        }));
        return;
      }
      if (data.overrides) {
        setMemberDetail((prev: any) => ({ ...prev, overrides: data.overrides }));
      }
      toast(value ? "Feature ON for member" : "Feature OFF for member", "success");
    };

    return (
      <div className="p-4 space-y-4">
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setMemberDetail(null);
          }}
          className="flex items-center gap-1 text-sm text-matang-gold font-medium"
        >
          <ChevronLeft size={16} /> Back to Directory
        </button>
        <Card className="overflow-hidden border-matang-gold/30">
          <div className="bg-gradient-to-r from-matang-navy to-blue-900 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden">
                {detail.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  detail.full_name?.[0]
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold">{detail.full_name}</h2>
                <p className="text-sm text-white/70 flex items-center gap-1">
                  <Shield size={12} /> {detail.role || "member"} · {detail.verification_status || "-"}
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-4 space-y-2 text-sm">
            {detailLoading && <p className="text-gray-400 text-xs">Loading full profile…</p>}
            <p className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {detail.phone}</p>
            <p className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> {detail.native_village} · {detail.cities?.name || "-"}</p>
            {detail.qr_code_id && <p className="text-xs font-mono text-gray-500">QR: {detail.qr_code_id}</p>}
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <p><span className="text-gray-400">Gender</span><br />{detail.gender || "-"}</p>
              <p><span className="text-gray-400">Blood</span><br />{detail.blood_group || "-"}</p>
              <p><span className="text-gray-400">Education</span><br />{detail.education_level || "-"}</p>
              <p><span className="text-gray-400">Occupation</span><br />{detail.occupation || "-"}</p>
            </div>
            {detail.address && <p className="text-xs"><span className="text-gray-400">Address:</span> {detail.address}</p>}
            {detail.about && <p className="text-xs"><span className="text-gray-400">About:</span> {detail.about}</p>}
            {fam && (
              <div className="mt-3 pt-3 border-t space-y-1">
                <p className="font-semibold text-matang-navy flex items-center gap-1"><Users size={14} /> Family</p>
                <p>Employment: {fam.employment_status || "-"}</p>
                <p>Education: {fam.education_summary || "-"}</p>
                {fam.address && <p>Address: {fam.address}</p>}
                {(fam.family_members || []).map((m: any, i: number) => (
                  <p key={i} className="text-gray-600">• {m.name} ({m.relation}{m.age ? `, ${m.age}y` : ""}{m.occupation ? ` · ${m.occupation}` : ""})</p>
                ))}
              </div>
            )}
            {!fam && <p className="text-gray-400 mt-2">No census data yet</p>}
          </CardContent>
        </Card>

        {(user?.role === "super_admin" || user?.role === "core_committee") && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-semibold text-matang-navy text-sm">Personal feature access</p>
              <p className="text-[11px] text-gray-500">Override global stage flags for this member only. OFF = hidden for them.</p>
              <div className="space-y-2">
                {MODULE_FLAGS.map(([key, label]) => {
                  const on = overrides[key] !== undefined ? overrides[key] : true;
                  return (
                    <div key={key} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50">
                      <span className="text-sm text-matang-navy">{label}</span>
                      <button
                        type="button"
                        onClick={() => toggleMemberFlag(key, !on)}
                        className={`text-xs font-bold px-3 py-1 rounded-full ${on ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                      >
                        {on ? "ON" : "OFF"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Button variant="outline" className="w-full" onClick={() => window.open(`tel:${detail.phone}`)}>
          <Phone size={16} /> Call {detail.phone}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-matang-navy">City Directory</h1>
        <p className="text-xs text-gray-400 mt-0.5">Tap a member to view full profile</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, village, phone..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-matang-gold focus:outline-none bg-white" />
      </div>
      {loading && <p className="text-gray-400 text-center py-8">Loading...</p>}
      
      <div className="grid grid-cols-2 gap-2">
        <select className="px-3 py-2 rounded-xl border text-sm" value={filterVillage} onChange={(e) => setFilterVillage(e.target.value)}>
          <option value="">All villages</option>
          {villages.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="px-3 py-2 rounded-xl border text-sm" value={filterEmployment} onChange={(e) => setFilterEmployment(e.target.value)}>
          <option value="">All employment</option>
          <option value="employed">Employed</option>
          <option value="unemployed">Unemployed</option>
          <option value="self_employed">Self Employed</option>
          <option value="student">Student</option>
          <option value="retired">Retired</option>
        </select>
      </div>
      <p className="text-[10px] text-gray-400">CRM filters — village & employment (DPR city CRM)</p>
{!loading && filtered.length === 0 && <p className="text-gray-400 text-center py-8">No members found</p>}
      <div className="space-y-2">
        {filtered.map((u) => (
          <button key={u.id} onClick={() => {
            setSelected(u);
            setDetailLoading(true);
            setMemberDetail(null);
            fetch(`/api/admin/member-flags?userId=${u.id}`)
              .then((r) => r.json())
              .then((d) => setMemberDetail(d))
              .catch(() => {})
              .finally(() => setDetailLoading(false));
          }} className="w-full text-left">
            <Card className="hover:border-matang-gold/50 transition-colors active:scale-[0.99]">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-matang-navy text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">{u.full_name?.[0]}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-matang-navy truncate">{u.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.native_village} · {u.cities?.name || "-"}</p>
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="w-full text-sm" onClick={() => { window.location.href = "/admin/verify"; }}>
          Verify Users →
        </Button>
        <Button variant="outline" className="w-full text-sm" onClick={() => { window.location.href = "/admin/reset-mpin"; }}>
          Reset M-PIN →
        </Button>
      </div>
    </div>
  );
}
