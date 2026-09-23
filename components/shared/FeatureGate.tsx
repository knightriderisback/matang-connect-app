"use client";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useFeatureFlags } from "@/lib/useFeatureFlags";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Lock } from "lucide-react";

/** Hides module for non-super users when stage/flag is OFF. Does not alter module internals. */
export function FeatureGate({
  moduleKey,
  children,
}: {
  moduleKey: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading: userLoading } = useCurrentUser();
  const { can, loading: flagsLoading } = useFeatureFlags(user?.role);

  if (userLoading || flagsLoading) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">{t("common.loading")}</div>
    );
  }

  if (!can(moduleKey)) {
    return (
      <div className="p-8 max-w-sm mx-auto text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center">
          <Lock className="text-gray-400" size={28} />
        </div>
        <h2 className="text-lg font-bold text-matang-navy">{t("common.moduleLocked")}</h2>
        <p className="text-sm text-gray-500">
          {t("common.moduleLockedDesc")}
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm font-semibold text-matang-gold cursor-pointer"
        >
          ← {t("common.back")}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export default FeatureGate;
