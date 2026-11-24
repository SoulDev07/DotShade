"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
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
    if (!Number.isNaN(num)) {
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
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="font-bold tracking-wide text-neutral-200 uppercase">{label}</span>

        <div className="flex items-center gap-1.5">
          {defaultValue !== undefined && Math.abs(value - defaultValue) > 0.0001 && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              className="p-0.5 text-neutral-400 transition-colors hover:text-white"
              title={`Reset to default (${defaultValue}${unit ? ` ${unit}` : ""})`}
            >
              <ArrowCounterClockwiseIcon className="h-3 w-3" />
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
              className="w-16 border border-white bg-black px-1.5 py-0.5 text-right font-mono text-xs text-white outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="font-mono text-xs font-bold text-white tabular-nums transition-colors hover:text-neutral-300 hover:underline"
              title="Click to edit value"
            >
              {formattedDisplay}
            </button>
          )}
        </div>
      </div>

      <div className="group relative flex h-5 w-full cursor-pointer items-center select-none">
        <div className="absolute inset-x-0 h-2 overflow-hidden border border-neutral-700 bg-neutral-900">
          <div className="pixel-progress h-full" style={{ width: `${percentage}%` }} />
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="relative z-10 h-full w-full cursor-ew-resize opacity-0"
        />

        <div
          className="pointer-events-none absolute z-20 -ml-2 h-4 w-4 border border-black bg-white shadow transition-transform duration-75 group-hover:scale-110"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
