/** LOCKED — Matrimony module UI/share */
"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Heart, Plus, User, Share2, Link2 } from "lucide-react";

const GENDER_OPTS = ["male", "female", "other"];
const EDUCATION_BASE = [
    "below_10th",
    "10th",
    "12th",
    "diploma",
    "graduate",
    "post_graduate",
    "professional",
    "doctorate",
    "other",
];
const OCCUPATION_BASE = [
    "student",
    "government_job",
    "private_job",
    "business",
    "teacher",
    "doctor",
    "engineer",
    "farmer",
    "self_employed",
    "homemaker",
    "unemployed",
    "other",
];
const LOOKING_BASE = [
    "educated_partner",
    "working_partner",
    "homemaker",
    "same_city",
    "same_community_values",
    "flexible",
    "other",
];

function ageFromDob(dob: string): number | null {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age >= 0 && age < 120 ? age : null;
}

function feetInchesToCm(feet: string, inches: string): number | null {
    const f = parseInt(feet || "0", 10);
    const i = parseInt(inches || "0", 10);
    if (!f && !i) return null;
    return Math.round(f * 30.48 + i * 2.54);
}

function cmToFeetInches(cm: number): { feet: string; inches: string } {
    if (!cm) return { feet: "", inches: "" };
    const totalIn = cm / 2.54;
    const feet = Math.floor(totalIn / 12);
    const inches = Math.round(totalIn % 12);
    return { feet: String(feet), inches: String(inches) };
}

interface Profile {
    id: string;
    user_id?: string;
    gender: string;
    age?: number;
    dob?: string;
    height_cm?: number;
    education?: string;
    occupation?: string;
    native_village?: string;
    about?: string;
    looking_for?: string;
    photo_url?: string;
    contact_visible?: boolean;
    user_name?: string;
}

function MatrimonyPageInner() {
    const { t, n } = useI18n();
    const { toast } = useToast();
    const { user } = useCurrentUser();
    const router = useRouter();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterGender, setFilterGender] = useState("all");
    const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
    const [submitting, setSubmitting] = useState(false);
    const [confirmDeactivate, setConfirmDeactivate] = useState(false);
    const [deactivating, setDeactivating] = useState(false);
    const [form, setForm] = useState({
        gender: "male",
        dob: "",
        height_cm: "",
        height_ft: "",
        height_in: "",
        education: "graduate",
        education_other: "",
        occupation: "private_job",
        occupation_other: "",
        native_village: "",
        about: "",
        looking_for: "flexible",
        looking_other: "",
        contact_visible: false,
    });

    const load = (g = filterGender) => {
        setLoading(true);
        fetch(`/api/matrimony?gender=${g}`)
            .then((r) => r.json())
            .then((d) => {
                setProfiles(d.profiles || []);
                const mine = d.mine || (d.profiles || []).find((p: Profile) => p.user_id === user?.id);
                if (mine) {
                    const fi = mine.height_cm ? cmToFeetInches(Number(mine.height_cm)) : { feet: "", inches: "" };
                    setForm((f) => ({
                        ...f,
                        gender: mine.gender || f.gender,
                        dob: mine.dob || "",
                        height_cm: mine.height_cm ? String(mine.height_cm) : "",
                        height_ft: fi.feet,
                        height_in: fi.inches,
                        education: mine.education || f.education,
                        education_other: "",
                        occupation: mine.occupation || f.occupation,
                        occupation_other: "",
                        native_village: mine.native_village || "",
                        about: mine.about || "",
                        looking_for: mine.looking_for || f.looking_for,
                        looking_other: "",
                        contact_visible: !!mine.contact_visible,
                    }));
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    };
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resolveField = (value: string, other: string) =>
        value === "other" ? other.trim() : value;

    const submit = async () => {
        if (!form.gender) {
            toast(t("auth.invalidCredentials") || "Gender required", "error");
            return;
        }
        const education = resolveField(form.education, form.education_other);
        const occupation = resolveField(form.occupation, form.occupation_other);
        const looking_for = resolveField(form.looking_for, form.looking_other);

        let height_cm: number | null = null;
        if (heightUnit === "cm") {
            height_cm = form.height_cm ? Number(form.height_cm) : null;
        } else {
            height_cm = feetInchesToCm(form.height_ft, form.height_in);
        }

        const age = ageFromDob(form.dob);

        setSubmitting(true);
        try {
            const res = await fetch("/api/matrimony", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    gender: form.gender,
                    dob: form.dob || null,
                    age,
                    height_cm,
                    education: education || null,
                    occupation: occupation || null,
                    native_village: form.native_village || null,
                    about: form.about || null,
                    looking_for: looking_for || null,
                    contact_visible: form.contact_visible,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast(data.error || "Failed", "error");
                return;
            }
            toast(t("common.success"), "success");
            setShowForm(false);
            load();
        } catch {
            toast(t("common.error"), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const deactivate = async () => {
        setDeactivating(true);
        try {
            const res = await fetch("/api/matrimony", { method: "DELETE" });
            if (res.ok) {
                toast(t("common.success"), "success");
                setConfirmDeactivate(false);
                load();
            } else {
                toast(t("common.error"), "error");
            }
        } catch {
            toast(t("common.error"), "error");
        } finally {
            setDeactivating(false);
        }
    };

    const profileLink = (id?: string) => {
        if (typeof window === "undefined") return "";
        const base = window.location.origin;
        return id ? `${base}/member/${id}` : `${base}/matrimony`;
    };

    const shareProfile = async (p: Profile) => {
        const link = profileLink(p.user_id);
        const lines = [
            `💍 *${t("matrimony.title")} - ${t("app.name")}*`,
            p.user_name ? `👤 ${t("auth.fullName")}: ${p.user_name}` : null,
            p.gender ? `⚧ ${t("census.gender")}: ${t(p.gender)}` : null,
            p.age ? `🎂 ${t("common.age")}: ${n(p.age)} ${t("common.yrs")}` : null,
            p.height_cm ? `📏 ${t("matrimony.height")}: ${n(p.height_cm)} cm` : null,
            p.education ? `🎓 ${t("census.education")}: ${t(p.education)}` : null,
            p.occupation ? `💼 ${t("census.occupation")}: ${t(p.occupation)}` : null,
            p.native_village ? `🏡 ${t("auth.nativeVillage")}: ${p.native_village}` : null,
            p.about ? `📝 ${t("matrimony.about")}: ${p.about}` : null,
            p.looking_for ? `💫 ${t("matrimony.lookingFor")}: ${t(p.looking_for)}` : null,
            link ? `🔗 ${t("common.copyLink")}:\n${link}` : null,
        ];
        const text = lines.filter((x) => x != null && x !== "").join("\n");
        const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(wa, "_blank");
    };

    const copyLink = async (p: Profile) => {
        const link = profileLink(p.user_id);
        try {
            await navigator.clipboard.writeText(link);
            toast(t("common.success"), "success");
        } catch {
            toast(link || "No link", "error");
        }
    };

    const selectCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white";

    return (
        <div className="p-4 space-y-4 pb-24">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Heart className="text-matang-gold" size={22} />
                    <h1 className="text-lg font-bold text-matang-navy">{t("matrimony.title")}</h1>
                </div>
                <div className="flex gap-2">
                    <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
                        <Plus size={16} /> {t("matrimony.myProfile")}
                    </Button>
                </div>
            </div>

            <div className="flex gap-2">
                {["all", "female", "male"].map((g) => (
                    <button
                        key={g}
                        type="button"
                        onClick={() => {
                            setFilterGender(g);
                            load(g);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer ${filterGender === g ? "bg-matang-navy text-white" : "bg-gray-100 text-gray-600"
                            }`}
                    >
                        {t(g)}
                    </button>
                ))}
            </div>

            {showForm && (
                <Card className="border-matang-gold/30">
                    <CardContent className="p-4 space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-matang-navy mb-1">{t("census.gender")} *</label>
                            <select
                                className={selectCls}
                                value={form.gender}
                                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                            >
                                {GENDER_OPTS.map((g) => (
                                    <option key={g} value={g}>
                                        {t(g)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-matang-navy mb-1">
                                {t("census.dob")}
                            </label>
                            <input
                                type="date"
                                className={selectCls}
                                value={form.dob}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                            />
                            {form.dob && ageFromDob(form.dob) != null && (
                                <p className="text-[11px] text-gray-500 mt-1">
                                    {t("common.age")}: {n(ageFromDob(form.dob))} {t("common.yrs")}
                                </p>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-sm font-medium text-matang-navy">{t("matrimony.height")}</label>
                                <div className="flex gap-1 text-[11px]">
                                    <button
                                        type="button"
                                        onClick={() => setHeightUnit("cm")}
                                        className={`px-2 py-0.5 rounded-full border cursor-pointer ${heightUnit === "cm" ? "bg-matang-navy text-white" : "bg-white"
                                            }`}
                                    >
                                        cm
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setHeightUnit("ft")}
                                        className={`px-2 py-0.5 rounded-full border cursor-pointer ${heightUnit === "ft" ? "bg-matang-navy text-white" : "bg-white"
                                            }`}
                                    >
                                        ft / in
                                    </button>
                                </div>
                            </div>
                            {heightUnit === "cm" ? (
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="170"
                                    value={form.height_cm}
                                    onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                                />
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        label="Feet"
                                        type="number"
                                        inputMode="numeric"
                                        value={form.height_ft}
                                        onChange={(e) => setForm({ ...form, height_ft: e.target.value })}
                                    />
                                    <Input
                                        label="Inches"
                                        type="number"
                                        inputMode="numeric"
                                        value={form.height_in}
                                        onChange={(e) => setForm({ ...form, height_in: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-matang-navy mb-1">{t("census.education")}</label>
                            <select
                                className={selectCls}
                                value={form.education}
                                onChange={(e) => setForm({ ...form, education: e.target.value })}
                            >
                                {EDUCATION_BASE.map((o) => (
                                    <option key={o} value={o}>
                                        {t(o)}
                                    </option>
                                ))}
                            </select>
                            {form.education === "other" && (
                                <Input
                                    className="mt-2"
                                    placeholder={t("education_opts.other")}
                                    value={form.education_other}
                                    onChange={(e) => setForm({ ...form, education_other: e.target.value })}
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-matang-navy mb-1">{t("census.occupation")}</label>
                            <select
                                className={selectCls}
                                value={form.occupation}
                                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                            >
                                {OCCUPATION_BASE.map((o) => (
                                    <option key={o} value={o}>
                                        {t(o)}
                                    </option>
                                ))}
                            </select>
                            {form.occupation === "other" && (
                                <Input
                                    className="mt-2"
                                    placeholder={t("occupations.other")}
                                    value={form.occupation_other}
                                    onChange={(e) => setForm({ ...form, occupation_other: e.target.value })}
                                />
                            )}
                        </div>

                        <Input
                            label={t("auth.nativeVillage")}
                            value={form.native_village}
                            onChange={(e) => setForm({ ...form, native_village: e.target.value })}
                        />

                        <div>
                            <label className="block text-sm font-medium text-matang-navy mb-1">{t("matrimony.lookingFor")}</label>
                            <select
                                className={selectCls}
                                value={form.looking_for}
                                onChange={(e) => setForm({ ...form, looking_for: e.target.value })}
                            >
                                {LOOKING_BASE.map((o) => (
                                    <option key={o} value={o}>
                                        {t(o)}
                                    </option>
                                ))}
                            </select>
                            {form.looking_for === "other" && (
                                <Input
                                    className="mt-2"
                                    placeholder={t("common.details")}
                                    value={form.looking_other}
                                    onChange={(e) => setForm({ ...form, looking_other: e.target.value })}
                                />
                            )}
                        </div>

                        <label className="block text-sm font-medium text-matang-navy">{t("matrimony.about")}</label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[80px]"
                            value={form.about}
                            onChange={(e) => setForm({ ...form, about: e.target.value })}
                        />

                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={form.contact_visible}
                                onChange={(e) => setForm({ ...form, contact_visible: e.target.checked })}
                            />
                            {t("matrimony.showContact")}
                        </label>

                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                                {t("common.cancel")}
                            </Button>
                            <Button className="flex-1" isLoading={submitting} onClick={submit}>
                                {t("common.save")}
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
                            onClick={() => setConfirmDeactivate(true)}
                        >
                            {t("matrimony.deactivateProfile")}
                        </Button>
                    </CardContent>
                </Card>
            )}

            <ConfirmDialog
                isOpen={confirmDeactivate}
                title={t("matrimony.confirmDeactivate")}
                description={t("matrimony.confirmDeactivateDesc")}
                variant="danger"
                confirmLabel={t("matrimony.deactivateProfile")}
                isLoading={deactivating}
                onConfirm={deactivate}
                onCancel={() => setConfirmDeactivate(false)}
            />

            {loading ? (
                <p className="text-center text-gray-500 py-8">{t("common.loading")}</p>
            ) : profiles.length === 0 ? (
                <EmptyState
                    icon={Heart}
                    title={t("matrimony.noProfiles")}
                    description={t("services.noServicesDesc")}
                    actionLabel={t("matrimony.registerProfile")}
                    onAction={() => setShowForm(true)}
                />
            ) : (
                profiles.map((p) => (
                    <Card key={p.id || p.user_id}>
                        <CardContent className="p-4 space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-matang-navy/10 flex items-center justify-center border border-gray-100">
                                    {p.photo_url ? (
                                        <img src={p.photo_url} alt={p.user_name || "Member"} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={22} className="text-matang-navy" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    {p.user_name && p.user_id ? (
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/member/${p.user_id}`)}
                                            className="font-semibold text-matang-navy hover:underline text-left cursor-pointer"
                                        >
                                            {p.user_name}
                                            {p.user_id === user?.id ? ` (${t("relations.self")})` : ""}
                                        </button>
                                    ) : (
                                        <p className="font-semibold text-matang-navy">{t("auth.member")}</p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                        {t(p.gender)}
                                        {p.age ? `, ${n(p.age)} ${t("common.yrs")}` : ""}
                                        {[p.education ? t(p.education) : null, p.occupation ? t(p.occupation) : null].filter(Boolean).length
                                            ? " · " + [p.education ? t(p.education) : null, p.occupation ? t(p.occupation) : null].filter(Boolean).join(" · ")
                                            : ""}
                                    </p>
                                </div>
                            </div>
                            {p.height_cm && <p className="text-sm text-gray-600">{t("matrimony.height")}: {n(p.height_cm)} cm</p>}
                            {p.native_village && (
                                <p className="text-sm text-gray-600">{t("auth.nativeVillage")}: {p.native_village}</p>
                            )}
                            {p.about && <p className="text-sm text-gray-700">{p.about}</p>}
                            {p.looking_for && (
                                <p className="text-xs text-matang-gold">
                                    <span className="font-medium">{t("matrimony.lookingFor")}:</span> {t(p.looking_for)}
                                </p>
                            )}
                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => shareProfile(p)}
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-xl py-2 active:scale-[0.98] cursor-pointer"
                                >
                                    <Share2 size={14} /> {t("common.share")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => copyLink(p)}
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-matang-navy bg-gray-50 rounded-xl py-2 active:scale-[0.98] cursor-pointer"
                                >
                                    <Link2 size={14} /> {t("common.copyLink")}
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}

export default function MatrimonyPage() {
    return (
        <FeatureGate moduleKey="matrimony">
            <MatrimonyPageInner />
        </FeatureGate>
    );
}
