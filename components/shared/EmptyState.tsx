"use client";
import React from "react";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon: any;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-matang-gold flex items-center justify-center border border-amber-200/50 shadow-inner">
        <Icon size={26} strokeWidth={2} />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-bold text-matang-navy">{title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-2 text-xs px-4 py-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
