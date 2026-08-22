"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Award, Trash2, MapPin } from "lucide-react";
import {
  INDIA_STATES,
  INDIA_STATE_CITIES,
  staticCityId,
  allIndiaCityOptions,
} from "@/lib/indiaLocations";

interface TitleRow {
  id: string;
  title_key: string;
  title_label: string;
  user_id: string;
  city_id?: string;
  city_name?: string;
  city_state?: string;
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
  state: string;
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
  const [stateName, setStateName] = useState("");
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
    const dbCities: City[] = (Array.isArray(cData.cities) ? cData.cities : Array.isArray(cData) ? cData : []).map(
      (c: any) => ({
        id: c.id,
        name: c.name || c.city_name || "—",
        state: c.state || "Other",
      })
    );
    // Merge: all India static + DB (DB ids preferred when name+state match)
    const byKey = new Map<string, City>();
    for (const c of allIndiaCityOptions()) {
      byKey.set(`${c.state}||${c.name}`, { id: c.id, name: c.name, state: c.state });
    }
    for (const c of dbCities) {
      byKey.set(`${c.state}||${c.name}`, c); // real UUID wins
    }
    const cityList = Array.from(byKey.values());
    setCities(cityList);

    setStateName((prev) => prev || "Chhattisgarh");

    if (user?.city_id) {
      const mine = cityList.find((c) => c.id === user.city_id);
      if (mine) {
        setStateName(mine.state);
        setCityId(mine.id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stateList = useMemo(() => {
    const fromData = Array.from(new Set(cities.map((c) => c.state).filter(Boolean)));
    const merged = Array.from(new Set([...INDIA_STATES, ...fromData]));
    merged.sort((a, b) => {
      if (a === "Chhattisgarh") return -1;
      if (b === "Chhattisgarh") return 1;
      return a.localeCompare(b);
    });
    return merged;
  }, [cities]);

  const citiesInState = useMemo(() => {
    if (!stateName) return cities;
    return cities.filter((c) => c.state === stateName).sort((a, b) => a.name.localeCompare(b.name));
  }, [cities, stateName]);

  // When state changes, clear city if not in new state
  useEffect(() => {
    if (!cityId) return;
    const still = citiesInState.some((c) => c.id === cityId);
    if (!still) setCityId("");
  }, [stateName, citiesInState, cityId]);

  const cityName = (id?: string) => {
    const c = cities.find((x) => x.id === id);
    if (!c) return id || "—";
    return c.state ? `${c.name}, ${c.state}` : c.name;
  };

  const assign = async () => {
    if (!userId || !titleKey) {
      toast("Title aur member select karein", "error");
      return;
    }
    if (!stateName) {
      toast("State select karein", "error");
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
  const stateOptions = [
    { value: "", label: "— Select state —" },
    ...stateList.map((s) => ({ value: s, label: s })),
  ];
  const cityOptions = [
    { value: "", label: stateName ? "— Select city —" : "— Pehle state chunein —" },
    ...citiesInState.map((c) => ({ value: c.id, label: c.name })),
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
            Title + State + City + Member — e.g. Bilaspur (CG) ka Adhyaksh
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
            label="State"
            value={stateName}
            onChange={(e) => {
              setStateName(e.target.value);
              setCityId("");
            }}
            options={stateOptions}
          />
          <Select
            label="City (is state ki cities)"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            options={cityOptions}
            disabled={!stateName}
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
                      {t.city_name
                        ? t.city_state
                          ? `${t.city_name}, ${t.city_state}`
                          : t.city_name
                        : cityName(t.city_id)}
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
