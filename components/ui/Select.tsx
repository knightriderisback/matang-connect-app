"use client";
import { SelectHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, id, error, hint, options, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-matang-navy select-none">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          className={cn(
            "w-full px-4 py-2.5 sm:py-3 rounded-xl border bg-white text-matang-navy text-base sm:text-sm transition-all appearance-none cursor-pointer",
            "focus:outline-none focus:ring-2",
            error
              ? "border-red-400 text-red-900 focus:border-red-500 focus:ring-red-200"
              : "border-gray-200 focus:border-matang-gold focus:ring-matang-gold/30",
            props.disabled && "bg-gray-100 text-gray-400 cursor-not-allowed",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-red-600 font-medium mt-0.5 animate-in fade-in">{error}</p>
        )}
        {!error && hint && (
          <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
