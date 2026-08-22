"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Award, Trash2, MapPin, Plus } from "lucide-react";
import {
  INDIA_STATES,
  allIndiaCityOptions,
  staticCityId,
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

const SECTION_COLORS = [
  "bg-amber-50 border-amber-200",
  "bg-sky-50 border-sky-200",
  "bg-emerald-50 border-emerald-200",
  "bg-violet-50 border-violet-200",
  "bg-rose-50 border-rose-200",
  "bg-orange-50 border-orange-200",
  "bg-teal-50 border-teal-200",
  "bg-indigo-50 border-indigo-200",
];

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
  const [customCity, setCustomCity] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [savingCity, setSavingCity] = useState(false);
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
    const byKey = new Map<string, City>();
    for (const c of allIndiaCityOptions()) {
      byKey.set(`${c.state}||${c.name}`, { id: c.id, name: c.name, state: c.state });
    }
    for (const c of dbCities) {
      byKey.set(`${c.state}||${c.name}`, c);
    }
    setCities(Array.from(byKey.values()));
    setStateName((prev) => prev || "Chhattisgarh");
    if (user?.city_id) {
      const mine = Array.from(byKey.values()).find((c) => c.id === user.city_id);
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
    return cities
      .filter((c) => c.state === stateName)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cities, stateName]);

  const membersInCity = useMemo(() => {
    if (!cityId) return [];
    const selected = cities.find((c) => c.id === cityId);
    let list = members.filter((m) => m.city_id && m.city_id === cityId);
    if (list.length === 0 && selected) {
      const realIds = cities
        .filter(
          (c) =>
            c.name === selected.name &&
            c.state === selected.state &&
            !String(c.id).startsWith("static:")
        )
        .map((c) => c.id);
      if (realIds.length) {
        list = members.filter((m) => m.city_id && realIds.includes(m.city_id));
      }
    }
    return list.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [members, cityId, cities]);

  useEffect(() => {
    if (!cityId) return;
    const still = citiesInState.some((c) => c.id === cityId) || cityId === "__custom__";
    if (!still) {
      setCityId("");
      setUserId("");
      setShowCustom(false);
    }
  }, [stateName, citiesInState, cityId]);

  useEffect(() => {
    if (!userId) return;
    if (!cityId || cityId === "__custom__") {
      setUserId("");
      return;
    }
    if (!membersInCity.some((m) => m.id === userId)) setUserId("");
  }, [cityId, membersInCity, userId]);

  const cityName = (id?: string) => {
    const c = cities.find((x) => x.id === id);
    if (!c) return id || "—";
    return c.state ? `${c.name}, ${c.state}` : c.name;
  };

  const addCustomCity = async () => {
    const name = customCity.trim();
    if (!stateName) {
      toast("Pehle state select karein", "error");
      return;
    }
    if (!name) {
      toast("City ka naam likhein", "error");
      return;
    }
    setSavingCity(true);
    try {
      const res = await fetch("/api/admin/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, state: stateName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "City save failed", "error");
        return;
      }
      const city: City = {
        id: data.city.id,
        name: data.city.name,
        state: data.city.state,
      };
      setCities((prev) => {
        const key = `${city.state}||${city.name}`;
        const map = new Map(prev.map((c) => [`${c.state}||${c.name}`, c]));
        map.set(key, city);
        return Array.from(map.values());
      });
      setCityId(city.id);
      setShowCustom(false);
      setCustomCity("");
      toast(data.created ? `"${city.name}" list mein add ho gaya` : `"${city.name}" pehle se list mein tha`, "success");
    } catch {
      toast("Network error", "error");
    } finally {
      setSavingCity(false);
    }
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
    if (!cityId || cityId === "__custom__") {
      toast("City select karein ya custom add karein", "error");
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

  /** Group assignments by city */
  const titlesByCity = useMemo(() => {
    const map = new Map<string, { label: string; items: TitleRow[] }>();
    for (const t of titles) {
      const label =
        t.city_name && t.city_state
          ? `${t.city_name}, ${t.city_state}`
          : t.city_name || cityName(t.city_id) || "Unknown city";
      const key = t.city_id || label;
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].label.localeCompare(b[1].label));
  }, [titles, cities]);

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
    { value: "__custom__", label: "+ Custom city (naya naam)" },
  ];
  const memberOptions = [
    {
      value: "",
      label: !cityId || cityId === "__custom__"
        ? "— Pehle city chunein —"
        : membersInCity.length
          ? "— Select member (is city) —"
          : "— Is city mein koi registered member nahi —",
    },
    ...membersInCity.map((m) => ({
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
            Title + State + City + Member — city-wise Adhyaksh etc.
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
              setShowCustom(false);
              setCustomCity("");
            }}
            options={stateOptions}
          />
          <Select
            label="City (is state ki cities)"
            value={showCustom ? "__custom__" : cityId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__custom__") {
                setShowCustom(true);
                setCityId("__custom__");
                setUserId("");
              } else {
                setShowCustom(false);
                setCustomCity("");
                setCityId(v);
              }
            }}
            options={cityOptions}
            disabled={!stateName}
          />

          {showCustom && (
            <div className="rounded-xl border border-dashed border-matang-gold/50 bg-amber-50/50 p-3 space-y-2">
              <label className="text-xs font-medium text-matang-navy">Nayi city ka naam</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder={`e.g. city in ${stateName || "state"}`}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-matang-gold/40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomCity();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={addCustomCity}
                  disabled={savingCity}
                  className="shrink-0 px-3"
                >
                  <Plus size={16} className="inline mr-1" />
                  {savingCity ? "…" : "Add"}
                </Button>
              </div>
              <p className="text-[10px] text-gray-500">
                Add pe DB + list mein save · state: <b>{stateName || "—"}</b>
              </p>
            </div>
          )}

          <Select
            label="Member (sirf selected city ke)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            options={memberOptions}
            disabled={!cityId || cityId === "__custom__"}
          />
          <Button type="button" onClick={assign} className="w-full">
            Assign title
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">Assignments (city-wise)</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : titlesByCity.length === 0 ? (
          <p className="text-sm text-gray-400">No titles assigned yet.</p>
        ) : (
          <div className="space-y-4">
            {titlesByCity.map(([key, group], idx) => (
              <div
                key={key}
                className={`rounded-2xl border p-3 space-y-2 ${SECTION_COLORS[idx % SECTION_COLORS.length]}`}
              >
                <h3 className="text-sm font-bold text-matang-navy flex items-center gap-1.5 border-b border-black/5 pb-1.5">
                  <MapPin size={14} className="text-matang-gold" />
                  {group.label}
                  <span className="text-[10px] font-normal text-gray-500 ml-auto">
                    {group.items.length} title{group.items.length > 1 ? "s" : ""}
                  </span>
                </h3>
                <div className="space-y-2">
                  {group.items.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white/80 rounded-xl p-2.5 flex items-start justify-between gap-2 border border-white/60"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-matang-navy">
                          {t.title_label || t.title_key}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {t.users?.full_name || t.user_id}
                          {t.users?.phone ? ` · ${t.users.phone}` : ""}
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
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
