"use client";
import { useEffect, useState, Suspense } from "react";
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
  verification_status?: string;
  photo_url?: string;
  gender?: string;
  blood_group?: string;
  education_level?: string;
  occupation?: string;
  about?: string;
  address?: string;
  cities: { name: string } | null;
  families: {
    education_summary: string;
    employment_status: string;
    address?: string;
    needs?: string[];
    family_members: {
      name: string;
      relation: string;
      age?: number;
      blood_group?: string;
      occupation?: string;
    }[];
  }[];
}

function AdminDirectoryPageInner() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const searchParams = useSearchParams();
  const userParam = searchParams.get("user");
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterVillage, setFilterVillage] = useState<string[]>([]);
  const [filterCity, setFilterCity] = useState<string[]>([]);
  const [filterEmployment, setFilterEmployment] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<string[]>([]);
  const [filterVerify, setFilterVerify] = useState<string[]>([]);
  const [filterGender, setFilterGender] = useState<string[]>([]);
  const [filterBlood, setFilterBlood] = useState<string[]>([]);
  const [filterEducation, setFilterEducation] = useState<string[]>([]);
  const [filterOccupation, setFilterOccupation] = useState<string[]>([]);
  const [filterHasFamily, setFilterHasFamily] = useState<"any" | "yes" | "no">("any");
  const [filterHasPhoto, setFilterHasPhoto] = useState<"any" | "yes" | "no">("any");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "village" | "role" | "city">("name_asc");
  const [showFilters, setShowFilters] = useState(false);
  const [openSection, setOpenSection] = useState<string>("village");
  /** fieldKey -> selected values (auto-discovered columns) */
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string[]>>({});
  const [resetPin, setResetPin] = useState("");
  const [resetting, setResetting] = useState(false);
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
  const cities = Array.from(new Set(users.map((u) => u.cities?.name).filter(Boolean) as string[])).sort();
  const roles = Array.from(new Set(users.map((u) => u.role || "normal").filter(Boolean))).sort();
  const genders = Array.from(
    new Set(users.map((u) => (u.gender || "").toLowerCase()).filter(Boolean))
  ).sort();
  const bloods = Array.from(new Set(users.map((u) => u.blood_group).filter(Boolean) as string[])).sort();
  const educations = Array.from(
    new Set(
      users
        .flatMap((u) => [u.education_level, u.families?.[0]?.education_summary])
        .filter(Boolean) as string[]
    )
  ).sort();
  const occupations = Array.from(
    new Set(users.map((u) => u.occupation).filter(Boolean) as string[])
  ).sort();

  // Auto-detect extra scalar fields on user rows for future-proof filters
  const SKIP_AUTO = new Set([
    "id",
    "full_name",
    "phone",
    "photo_url",
    "qr_code_id",
    "city_id",
    "cities",
    "families",
    "native_village",
    "role",
    "verification_status",
    "gender",
    "blood_group",
    "education_level",
    "occupation",
    "about",
    "address",
    "m_pin_hash",
    "created_at",
    "updated_at",
  ]);

  const autoFilterFields = (() => {
    const map: Record<string, Set<string>> = {};
    for (const u of users) {
      const row = u as unknown as Record<string, unknown>;
      for (const [k, v] of Object.entries(row)) {
        if (SKIP_AUTO.has(k)) continue;
        if (v == null || v === "") continue;
        if (typeof v === "object") continue;
        const s = String(v).trim();
        if (!s || s.length > 40) continue;
        if (!map[k]) map[k] = new Set();
        map[k].add(s);
      }
    }
    return Object.entries(map)
      .filter(([, set]) => set.size >= 1 && set.size <= 40)
      .map(([key, set]) => ({
        key,
        title: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        values: Array.from(set).sort(),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  })();

  const toggleDynamic = (field: string, value: string) => {
    setDynamicFilters((prev) => {
      const cur = prev[field] || [];
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
      const copy = { ...prev };
      if (!next.length) delete copy[field];
      else copy[field] = next;
      return copy;
    });
  };

  const toggleMulti = (arr: string[], v: string, set: (x: string[]) => void) => {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const dynamicCount = Object.values(dynamicFilters).reduce((n, arr) => n + arr.length, 0);
  const activeFilterCount =
    filterVillage.length +
    filterCity.length +
    filterEmployment.length +
    filterRole.length +
    filterVerify.length +
    filterGender.length +
    filterBlood.length +
    filterEducation.length +
    filterOccupation.length +
    dynamicCount +
    (filterHasFamily !== "any" ? 1 : 0) +
    (filterHasPhoto !== "any" ? 1 : 0) +
    (ageMin || ageMax ? 1 : 0);

  const clearAllFilters = () => {
    setFilterVillage([]);
    setFilterCity([]);
    setFilterEmployment([]);
    setFilterRole([]);
    setFilterVerify([]);
    setFilterGender([]);
    setFilterBlood([]);
    setFilterEducation([]);
    setFilterOccupation([]);
    setFilterHasFamily("any");
    setFilterHasPhoto("any");
    setAgeMin("");
    setAgeMax("");
    setDynamicFilters({});
  };

  const memberAges = (u: DirectoryUser) =>
    (u.families?.[0]?.family_members || []).map((m) => m.age).filter((a): a is number => typeof a === "number");

  let filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.native_village?.toLowerCase().includes(q) ||
      u.phone?.includes(search) ||
      (u.qr_code_id || "").toLowerCase().includes(q) ||
      (u.occupation || "").toLowerCase().includes(q) ||
      (u.education_level || "").toLowerCase().includes(q);

    const matchVillage = !filterVillage.length || filterVillage.includes(u.native_village);
    const matchCity = !filterCity.length || filterCity.includes(u.cities?.name || "");
    const emp = u.families?.[0]?.employment_status || "";
    const matchEmp = !filterEmployment.length || filterEmployment.includes(emp);
    const matchRole = !filterRole.length || filterRole.includes(u.role || "normal");
    const matchVerify =
      !filterVerify.length || filterVerify.includes(u.verification_status || "pending");
    const g = (u.gender || "").toLowerCase();
    const matchGender =
      !filterGender.length ||
      filterGender.some((fg) => g === fg || g.startsWith(fg) || (fg === "male" && g === "m") || (fg === "female" && g === "f"));
    const matchBlood = !filterBlood.length || filterBlood.includes(u.blood_group || "");
    const edu = u.education_level || u.families?.[0]?.education_summary || "";
    const matchEdu =
      !filterEducation.length || filterEducation.some((e) => edu.toLowerCase().includes(e.toLowerCase()));
    const matchOcc =
      !filterOccupation.length ||
      filterOccupation.some((o) => (u.occupation || "").toLowerCase().includes(o.toLowerCase()));
    const hasFam = (u.families?.[0]?.family_members || []).length > 0 || !!u.families?.[0];
    const matchFam =
      filterHasFamily === "any" ||
      (filterHasFamily === "yes" && hasFam) ||
      (filterHasFamily === "no" && !hasFam);
    const hasPhoto = !!(u.photo_url && String(u.photo_url).length > 8);
    const matchPhoto =
      filterHasPhoto === "any" ||
      (filterHasPhoto === "yes" && hasPhoto) ||
      (filterHasPhoto === "no" && !hasPhoto);

    let matchAge = true;
    const amin = ageMin ? parseInt(ageMin, 10) : null;
    const amax = ageMax ? parseInt(ageMax, 10) : null;
    if (amin != null || amax != null) {
      const ages = memberAges(u);
      if (!ages.length) matchAge = false;
      else {
        matchAge = ages.some((a) => {
          if (amin != null && a < amin) return false;
          if (amax != null && a > amax) return false;
          return true;
        });
      }
    }

    let matchDynamic = true;
    for (const [field, selected] of Object.entries(dynamicFilters)) {
      if (!selected.length) continue;
      const val = String((u as any)[field] ?? "").trim();
      if (!selected.includes(val)) {
        matchDynamic = false;
        break;
      }
    }

    return (
      matchSearch &&
      matchVillage &&
      matchCity &&
      matchEmp &&
      matchRole &&
      matchVerify &&
      matchGender &&
      matchBlood &&
      matchEdu &&
      matchOcc &&
      matchFam &&
      matchPhoto &&
      matchAge &&
      matchDynamic
    );
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "name_desc") return (b.full_name || "").localeCompare(a.full_name || "");
    if (sortBy === "village") return (a.native_village || "").localeCompare(b.native_village || "");
    if (sortBy === "role") return (a.role || "").localeCompare(b.role || "");
    if (sortBy === "city") return (a.cities?.name || "").localeCompare(b.cities?.name || "");
    return (a.full_name || "").localeCompare(b.full_name || "");
  });


  if (selected) {
    const fam = memberDetail?.family || selected.families?.[0];
    const detail = memberDetail?.user || selected;
    const overrides: Record<string, boolean> = memberDetail?.overrides || {};
    const MODULE_FLAGS = [
      ["sos_enabled", "SOS"],
      ["jobs_enabled", "Jobs"],
      ["notices_enabled", "Notices / Feed"],
      ["feed_images_enabled", "Feed images"],
      ["feed_member_post_enabled", "Can post on Feed"],
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
      ["admin_requests_enabled", "All Requests"],
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

        <Card className="border-matang-gold/30">
          <CardContent className="p-3 space-y-2">
            <p className="text-sm font-semibold text-matang-navy">Reset M-PIN</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="New 4-digit M-PIN"
              value={resetPin}
              onChange={(e) => setResetPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-full px-3 py-2 rounded-xl border text-sm"
            />
            <Button
              className="w-full"
              isLoading={resetting}
              onClick={async () => {
                if (!/^\d{4}$/.test(resetPin)) {
                  toast("Enter 4-digit M-PIN", "error");
                  return;
                }
                setResetting(true);
                try {
                  const res = await fetch("/api/admin/reset-mpin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: selected.id, newMpin: resetPin }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    toast(data.error || "Reset failed", "error");
                    return;
                  }
                  toast("M-PIN reset", "success");
                  setResetPin("");
                } finally {
                  setResetting(false);
                }
              }}
            >
              Reset this member&apos;s M-PIN
            </Button>
          </CardContent>
        </Card>

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
      
      <div className="flex gap-2 items-center">
        <select
          className="flex-1 px-3 py-2 rounded-xl border text-sm bg-white"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
        >
          <option value="name_asc">Sort: Name A–Z</option>
          <option value="name_desc">Sort: Name Z–A</option>
          <option value="village">Sort: Village</option>
          <option value="city">Sort: City</option>
          <option value="role">Sort: Role</option>
        </select>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`px-3 py-2 rounded-xl border text-sm font-semibold shrink-0 ${
            activeFilterCount ? "bg-matang-gold text-matang-navy border-matang-gold" : "bg-white text-matang-navy"
          }`}
        >
          Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
        </button>
      </div>

      {showFilters && (
        <Card className="border-amber-300/60 shadow-md overflow-hidden bg-gradient-to-b from-amber-50 via-[#fff8e7] to-orange-50">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-3 py-2 bg-amber-100/80 border-b border-amber-200/80">
              <p className="text-xs font-bold text-matang-navy uppercase tracking-wide">Refine results</p>
              <button type="button" className="text-[11px] font-semibold text-matang-gold" onClick={clearAllFilters}>
                Clear all
              </button>
            </div>

            {/* Active chips */}
            {activeFilterCount > 0 && (
              <div className="px-3 py-2 flex flex-wrap gap-1 border-b bg-white">
                {filterVillage.map((v) => (
                  <button key={`v-${v}`} type="button" onClick={() => toggleMulti(filterVillage, v, setFilterVillage)} className="text-[10px] px-2 py-0.5 rounded-full bg-matang-gold/20 text-matang-navy">
                    {v} ×
                  </button>
                ))}
                {filterCity.map((v) => (
                  <button key={`c-${v}`} type="button" onClick={() => toggleMulti(filterCity, v, setFilterCity)} className="text-[10px] px-2 py-0.5 rounded-full bg-matang-gold/20 text-matang-navy">
                    {v} ×
                  </button>
                ))}
                {filterGender.map((v) => (
                  <button key={`g-${v}`} type="button" onClick={() => toggleMulti(filterGender, v, setFilterGender)} className="text-[10px] px-2 py-0.5 rounded-full bg-matang-gold/20 text-matang-navy">
                    {v} ×
                  </button>
                ))}
                {filterRole.map((v) => (
                  <button key={`r-${v}`} type="button" onClick={() => toggleMulti(filterRole, v, setFilterRole)} className="text-[10px] px-2 py-0.5 rounded-full bg-matang-gold/20 text-matang-navy">
                    {v} ×
                  </button>
                ))}
                {(ageMin || ageMax) && (
                  <button type="button" onClick={() => { setAgeMin(""); setAgeMax(""); }} className="text-[10px] px-2 py-0.5 rounded-full bg-matang-gold/20 text-matang-navy">
                    Age {ageMin || "0"}–{ageMax || "∞"} ×
                  </button>
                )}
              </div>
            )}

            <div className="max-h-[55vh] overflow-y-auto divide-y">
              {[
                {
                  key: "gender",
                  title: "Gender",
                  body: (
                    <div className="flex flex-wrap gap-1.5">
                      {["male", "female", "other", ...genders.filter((g) => !["male", "female", "other"].includes(g))].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleMulti(filterGender, v, setFilterGender)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            filterGender.includes(v) ? "bg-matang-navy text-white border-matang-navy" : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "age",
                  title: "Age (family members)",
                  body: (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Min"
                        value={ageMin}
                        onChange={(e) => setAgeMin(e.target.value.replace(/\\D/g, "").slice(0, 3))}
                        className="w-20 px-2 py-1.5 rounded-lg border text-sm"
                      />
                      <span className="text-gray-400 text-xs">to</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Max"
                        value={ageMax}
                        onChange={(e) => setAgeMax(e.target.value.replace(/\\D/g, "").slice(0, 3))}
                        className="w-20 px-2 py-1.5 rounded-lg border text-sm"
                      />
                    </div>
                  ),
                },
                {
                  key: "village",
                  title: `Village (${villages.length})`,
                  body: (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {villages.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleMulti(filterVillage, v, setFilterVillage)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            filterVillage.includes(v) ? "bg-matang-navy text-white border-matang-navy" : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                      {!villages.length && <p className="text-[11px] text-gray-400">No villages in data</p>}
                    </div>
                  ),
                },
                {
                  key: "city",
                  title: `City (${cities.length})`,
                  body: (
                    <div className="flex flex-wrap gap-1.5">
                      {cities.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleMulti(filterCity, v, setFilterCity)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            filterCity.includes(v) ? "bg-matang-navy text-white border-matang-navy" : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                      {!cities.length && <p className="text-[11px] text-gray-400">No cities</p>}
                    </div>
                  ),
                },
                {
                  key: "education",
                  title: "Education",
                  body: (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {(educations.length
                        ? educations
                        : ["Illiterate", "Primary", "High School", "Graduate", "Post Graduate", "Diploma"]
                      ).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleMulti(filterEducation, v, setFilterEducation)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            filterEducation.includes(v) ? "bg-matang-navy text-white border-matang-navy" : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "occupation",
                  title: "Occupation",
                  body: (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {(occupations.length ? occupations : ["Farmer", "Teacher", "Driver", "Business", "Student"]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleMulti(filterOccupation, v, setFilterOccupation)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            filterOccupation.includes(v) ? "bg-matang-navy text-white border-matang-navy" : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "blood",
                  title: "Blood group",
                  body: (
                    <div className="flex flex-wrap gap-1.5">
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", ...bloods.filter((b) => !["A+","A-","B+","B-","O+","O-","AB+","AB-"].includes(b))].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleMulti(filterBlood, v, setFilterBlood)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            filterBlood.includes(v) ? "bg-matang-navy text-white border-matang-navy" : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "employment",
                  title: "Employment",
                  body: (
                    <div className="flex flex-wrap gap-1.5">
                      {["employed", "unemployed", "self_employed", "student", "retired"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleMulti(filterEmployment, v, setFilterEmployment)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            filterEmployment.includes(v) ? "bg-matang-navy text-white border-matang-navy" : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {v.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "role",
                  title: "Role",
                  body: (
                    <div className="flex flex-wrap gap-1.5">
                      {(roles.length ? roles : ["normal", "volunteer", "core_committee", "super_admin"]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleMulti(filterRole, v, setFilterRole)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            filterRole.includes(v) ? "bg-matang-navy text-white border-matang-navy" : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "verify",
                  title: "Verification",
                  body: (
                    <div className="flex flex-wrap gap-1.5">
                      {["verified", "pending", "rejected"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleMulti(filterVerify, v, setFilterVerify)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            filterVerify.includes(v) ? "bg-matang-navy text-white border-matang-navy" : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "more",
                  title: "More",
                  body: (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[11px] text-gray-500 w-16">Family</span>
                        {(["any", "yes", "no"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setFilterHasFamily(v)}
                            className={`text-[11px] px-2.5 py-1 rounded-full border ${
                              filterHasFamily === v ? "bg-matang-navy text-white border-matang-navy" : "bg-white text-gray-700 border-gray-200"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[11px] text-gray-500 w-16">Photo</span>
                        {(["any", "yes", "no"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setFilterHasPhoto(v)}
                            className={`text-[11px] px-2.5 py-1 rounded-full border ${
                              filterHasPhoto === v ? "bg-matang-navy text-white border-matang-navy" : "bg-white text-gray-700 border-gray-200"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ),
                },
                ...autoFilterFields.map((f) => ({
                  key: `auto_${f.key}`,
                  title: `${f.title} · auto`,
                  body: (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {f.values.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleDynamic(f.key, v)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            (dynamicFilters[f.key] || []).includes(v)
                              ? "bg-matang-navy text-white border-matang-navy"
                              : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  ),
                })),
              ].map((sec) => (
                <div key={sec.key}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50"
                    onClick={() => setOpenSection(openSection === sec.key ? "" : sec.key)}
                  >
                    <span className="text-sm font-semibold text-matang-navy">{sec.title}</span>
                    <span className="text-gray-400 text-xs">{openSection === sec.key ? "▲" : "▼"}</span>
                  </button>
                  {openSection === sec.key && <div className="px-3 pb-3">{sec.body}</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <p className="text-[10px] text-gray-400">{filtered.length} members · multi-filter + sort</p>
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

    </div>
  );
}

export default function AdminDirectoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Loading directory…</div>}>
      <AdminDirectoryPageInner />
    </Suspense>
  );
}
