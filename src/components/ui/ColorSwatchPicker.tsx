"use client";

import React, { useRef } from "react";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ColorSwatchPickerProps {
  label: string;
  color: string;
  onChange: (hex: string) => void;
  className?: string;
}

/**
 * Color picker widget featuring an interactive color-well swatch and text hex input.
 */
export function ColorSwatchPicker({
  label,
  color,
  onChange,
  className,
}: ColorSwatchPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 bg-secondary/40 border border-border hover:border-white/50 transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-8 h-8 border border-white/60 shadow-inner overflow-hidden cursor-pointer btn-press block relative"
            style={{ backgroundColor: color }}
            title={`Change ${label} color`}
          />
          <input
            ref={inputRef}
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer pointer-events-none w-0 h-0"
          />
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-mono text-foreground font-bold uppercase tracking-wide">
            {label}
          </span>
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
            {color}
          </span>
        </div>
      </div>

      <input
        type="text"
        value={color}
        maxLength={7}
        onChange={(e) => {
          const val = e.target.value;
          if (val.startsWith("#") && (val.length === 4 || val.length === 7)) {
            onChange(val);
          }
        }}
        className="w-20 px-2 py-1 text-center font-mono text-xs uppercase bg-black border border-border text-white focus:border-white focus:outline-none"
      />
    </div>
  );
}

interface DualColorPickerProps {
  frontLabel?: string;
  backLabel?: string;
  colorFront: string;
  colorBack: string;
  onFrontChange: (hex: string) => void;
  onBackChange: (hex: string) => void;
  onSwap?: () => void;
  className?: string;
}

export function DualColorPicker({
  frontLabel = "Foreground",
  backLabel = "Background",
  colorFront,
  colorBack,
  onFrontChange,
  onBackChange,
  onSwap,
  className,
}: DualColorPickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <div className="space-y-1.5">
          <ColorSwatchPicker label={backLabel} color={colorBack} onChange={onBackChange} />
          <ColorSwatchPicker label={frontLabel} color={colorFront} onChange={onFrontChange} />
        </div>

        {onSwap && (
          <button
            type="button"
            onClick={onSwap}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-secondary border border-border text-foreground hover:bg-neutral-800 hover:text-white shadow-md transition-colors btn-press"
            title="Swap foreground & background colors"
          >
            <ArrowsLeftRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
