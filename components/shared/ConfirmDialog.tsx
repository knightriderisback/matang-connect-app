"use client";
import React, { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";
  const displayConfirmLabel = confirmLabel ? t(confirmLabel) : t("common.confirm");
  const displayCancelLabel = cancelLabel ? t(cancelLabel) : t("common.cancel");

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 border border-gray-100 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDanger
                ? "bg-red-50 text-red-600 border border-red-100"
                : variant === "warning"
                ? "bg-amber-50 text-amber-600 border border-amber-100"
                : "bg-blue-50 text-matang-navy border border-blue-100"
            }`}
          >
            {isDanger ? (
              <AlertCircle size={20} />
            ) : variant === "warning" ? (
              <AlertTriangle size={20} />
            ) : (
              <Info size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-matang-navy leading-snug">
              {t(title)}
            </h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t(description)}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 p-1 -mr-1 -mt-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1 text-xs py-2"
            onClick={onCancel}
            disabled={isLoading}
          >
            {displayCancelLabel}
          </Button>
          <Button
            type="button"
            className={`flex-1 text-xs py-2 ${
              isDanger
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-matang-navy hover:bg-matang-navy/90 text-white"
            }`}
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {displayConfirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
