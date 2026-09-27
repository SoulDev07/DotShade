"use client";

import React, { useState, useEffect } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
  formatValue?: (val: number) => string;
  onChange: (val: number) => void;
  className?: string;
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  defaultValue,
  formatValue,
  onChange,
  className,
}: SliderControlProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const handleCommitEdit = () => {
    setIsEditing(false);
    const num = parseFloat(inputValue);
    if (!isNaN(num)) {
      const clamped = Math.max(min, Math.min(max, num));
      onChange(clamped);
    } else {
      setInputValue(value.toString());
    }
  };

  const formattedDisplay = formatValue
    ? formatValue(value)
    : Number.isInteger(step)
    ? `${value}${unit ? ` ${unit}` : ""}`
    : `${value.toFixed(2)}${unit ? ` ${unit}` : ""}`;

  return (
    <div className={cn("space-y-1.5 select-none", className)}>
      <div className="flex items-center justify-between font-mono text-[11px]">
        <span className="text-muted-foreground font-medium">
          {label}
        </span>

        <div className="flex items-center gap-1.5">
          {defaultValue !== undefined && Math.abs(value - defaultValue) > 0.0001 && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              className="text-muted-foreground/60 hover:text-primary transition-colors p-0.5"
              title={`Reset to default (${defaultValue}${unit ? ` ${unit}` : ""})`}
            >
              <ArrowCounterClockwise className="w-2.5 h-2.5" />
            </button>
          )}

          {isEditing ? (
            <input
              type="number"
              value={inputValue}
              min={min}
              max={max}
              step={step}
              autoFocus
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleCommitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCommitEdit();
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setInputValue(value.toString());
                }
              }}
              className="w-14 px-1 py-0.5 text-right bg-background border border-primary rounded text-foreground text-[10px] font-mono outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-foreground/90 hover:text-foreground tabular-nums text-[10px] font-mono font-medium hover:underline transition-colors"
              title="Click to edit value"
            >
              {formattedDisplay}
            </button>
          )}
        </div>
      </div>

      <div className="relative flex items-center h-4 w-full group cursor-pointer">
        <div className="absolute inset-x-0 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="relative z-10 w-full h-full opacity-0 cursor-ew-resize"
        />

        <div
          className="absolute z-20 w-3 h-3 -ml-1.5 rounded-full bg-foreground border border-background shadow pointer-events-none transition-transform duration-100 ease-out group-hover:scale-125"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
