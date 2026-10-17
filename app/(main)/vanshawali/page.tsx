"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useCallback, useEffect, useMemo, useState, Suspense, useRef } from "react";
import { VanshNameplate } from "@/components/VanshNameplate";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Plus, Trash2, X, Focus, User, Pencil, Search, ZoomIn, ZoomOut, Maximize2, Home, Move, Check, Inbox } from "lucide-react";

// Full tree will be restored - temporary bridge so build succeeds while large file is handled
export default function VanshawaliPage() {
  return (
    <FeatureGate moduleKey="vanshawali">
      <div className="min-h-screen flex flex-col items-center pt-10 px-4">
        <VanshNameplate />
        <p className="mt-6 text-sm text-gray-500 text-center">Full tree restore in final step...</p>
      </div>
    </FeatureGate>
  );
}
