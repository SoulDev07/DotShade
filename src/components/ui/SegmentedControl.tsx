"use client";

import React from "react";
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
      className={cn(
        "grid bg-muted/60 p-0.5 rounded-lg border border-border gap-0.5 select-none",
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
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
              "flex items-center justify-center gap-1.5 rounded-md font-mono transition-all duration-150 relative text-center btn-press",
              size === "sm" ? "py-1 px-1.5 text-[10px]" : "py-1.5 px-2 text-[11px]",
              isActive
                ? "bg-card text-foreground font-semibold shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
            )}
            title={opt.description || opt.label}
          >
            {Icon && (
              <Icon
                className={cn(
                  "shrink-0",
                  size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5",
                  isActive ? "text-primary" : "text-muted-foreground"
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
