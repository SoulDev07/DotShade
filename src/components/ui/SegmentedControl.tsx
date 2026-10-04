"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Single selectable option in a SegmentedControl.
 */
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Accessible radiogroup segmented button bar with equal-width grid distribution.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid bg-muted/40 p-0.5 border border-border select-none",
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        gap: "1px",
      }}
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        const Icon = opt.icon;

        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isActive}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center justify-center gap-1.5 font-mono transition-all duration-75 relative text-center btn-press",
              size === "sm" ? "py-1.5 px-2 text-[11px]" : "py-2 px-2.5 text-xs",
              isActive
                ? "bg-white text-black font-bold border border-white shadow-sm"
                : "text-neutral-300 hover:text-white hover:bg-secondary/50 border border-transparent hover:border-neutral-700"
            )}
            title={opt.description || opt.label}
          >
            {Icon && (
              <Icon
                className={cn(
                  "shrink-0",
                  size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )}
              />
            )}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
