"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Award, Trash2, MapPin } from "lucide-react";

interface TitleRow {
  id: string;
  title_key: string;
  title_label: string;
  user_id: string;
  city_id?: string;
  city_name?: string;
  users?: { full_name: string; phone: string } | null;
}
interface DirUser {
  id: string;
  full_name: string;
  phone: string;
  city_id?: string;
}
interface City {
  id: string;
  name: string;
}

export default function TitlesPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [titles, setTitles] = useState<TitleRow[]>([]);
  const [options, setOptions] = useState<{ key: string; label: string }[]>([]);
  const [members, setMembers] = useState<DirUser[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [titleKey, setTitleKey] = useState("adhyaksh");
  const [userId, setUserId] = useState("");
  const [cityId, setCityId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [tRes, mRes, cRes] = await Promise.all([
      fetch("/api/titles"),
      fetch("/api/admin/directory"),
      fetch("/api/cities"),
    ]);
    const tData = await tRes.json();
    const mData = await mRes.json();
    const cData = await cRes.json().catch(() => ({}));
    setTitles(tData.titles || []);
    setOptions(tData.options || []);
    setMembers(mData.users || []);
    const cityList: City[] = Array.isArray(cData.cities)
      ? cData.cities
      : Array.isArray(cData)
        ? cData
        : [];
    setCities(cityList.map((c: any) => ({ id: c.id, name: c.name || c.city_name || "—" })));
    if (!cityId && user?.city_id && cityList.some((c: any) => c.id === user.city_id)) {
      setCityId(user.city_id as string);
    } else if (!cityId && cityList.length === 1) {
      setCityId(cityList[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cityName = (id?: string) => cities.find((c) => c.id === id)?.name || id || "—";

  const assign = async () => {
    if (!userId || !titleKey) {
      toast("Title aur member select karein", "error");
      return;
    }
    if (!cityId) {
      toast("City select karein (kaun si city ka title)", "error");
      return;
    }
    const res = await fetch("/api/titles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title_key: titleKey, user_id: userId, city_id: cityId }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast("Title assigned", "success");
    load();
  };

  const remove = async (id: string) => {
    const res = await fetch("/api/titles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      toast("Could not remove", "error");
      return;
    }
    toast("Title removed", "success");
    load();
  };

  if (!user || !["core_committee", "super_admin"].includes(user.role || "")) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">Core Committee / Super Admin only</div>
    );
  }

  const titleOptions = (options.length ? options : [{ key: "adhyaksh", label: "Adhyaksh" }]).map(
    (o) => ({ value: o.key, label: o.label })
  );
  const cityOptions = [
    { value: "", label: "— Select city —" },
    ...cities.map((c) => ({ value: c.id, label: c.name })),
  ];
  const memberOptions = [
    { value: "", label: "— Select member —" },
    ...members.map((m) => ({
      value: m.id,
      label: `${m.full_name}${m.phone ? ` (${m.phone})` : ""}`,
    })),
  ];

  return (
    <div className="p-4 space-y-4 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Award className="text-matang-gold" size={22} />
        <div>
          <h1 className="text-lg font-bold text-matang-navy">City Titles</h1>
          <p className="text-[11px] text-gray-500">
            Title + member + city — e.g. kaun si city ka Adhyaksh
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Select
            label="Title"
            value={titleKey}
            onChange={(e) => setTitleKey(e.target.value)}
            options={titleOptions}
          />
          <Select
            label="City (title kis city ka)"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            options={cityOptions}
          />
          <Select
            label="Member"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            options={memberOptions}
          />
          <Button type="button" onClick={assign} className="w-full">
            Assign title
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">Current assignments</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : titles.length === 0 ? (
          <p className="text-sm text-gray-400">No titles assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {titles.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-matang-navy">{t.title_label || t.title_key}</p>
                    <p className="text-xs text-gray-600 truncate">
                      {t.users?.full_name || t.user_id}
                      {t.users?.phone ? ` · ${t.users.phone}` : ""}
                    </p>
                    <p className="text-[11px] text-matang-gold flex items-center gap-1 mt-0.5">
                      <MapPin size={10} />
                      {t.city_name || cityName(t.city_id)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    className="p-2 text-red-500 shrink-0"
                    aria-label="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
