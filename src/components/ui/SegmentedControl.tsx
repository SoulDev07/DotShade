"use client";

import type React from "react";
import { cn } from "@/lib/utils";

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
      className={cn("bg-muted/40 border-border grid border p-0.5 select-none", className)}
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
              "btn-press relative flex items-center justify-center gap-1.5 text-center font-mono transition-all duration-75",
              size === "sm" ? "px-2 py-1.5 text-[11px]" : "px-2.5 py-2 text-xs",
              isActive
                ? "border border-white bg-white font-bold text-black shadow-sm"
                : "hover:bg-secondary/50 border border-transparent text-neutral-300 hover:border-neutral-700 hover:text-white",
            )}
            title={opt.description || opt.label}
          >
            {Icon && (
              <Icon
                className={cn(
                  "shrink-0",
                  size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
                  isActive ? "text-primary-foreground" : "text-muted-foreground",
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
