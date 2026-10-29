"use client";

import React, { useState, useEffect } from "react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
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
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-neutral-200 font-bold uppercase tracking-wide">
          {label}
        </span>

        <div className="flex items-center gap-1.5">
          {defaultValue !== undefined && Math.abs(value - defaultValue) > 0.0001 && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              className="text-neutral-400 hover:text-white transition-colors p-0.5"
              title={`Reset to default (${defaultValue}${unit ? ` ${unit}` : ""})`}
            >
              <ArrowCounterClockwiseIcon className="w-3 h-3" />
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
              className="w-16 px-1.5 py-0.5 text-right bg-black border border-white text-white text-xs font-mono outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-white hover:text-neutral-300 tabular-nums text-xs font-mono font-bold hover:underline transition-colors"
              title="Click to edit value"
            >
              {formattedDisplay}
            </button>
          )}
        </div>
      </div>

      <div className="relative flex items-center h-5 w-full group cursor-pointer select-none">
        
        <div className="absolute inset-x-0 h-2 bg-neutral-900 overflow-hidden border border-neutral-700">
          
          <div
            className="h-full pixel-progress"
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
          className="absolute z-20 w-4 h-4 -ml-2 bg-white border border-black shadow pointer-events-none group-hover:scale-110 transition-transform duration-75"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
