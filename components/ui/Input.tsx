"use client";
import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-matang-navy">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-matang-navy placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-matang-gold/50 focus:border-matang-gold transition-all",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";
