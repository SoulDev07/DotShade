"use client";

import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface ColorSwatchPickerProps {
  label: string;
  color: string;
  onChange: (hex: string) => void;
  className?: string;
}

export function ColorSwatchPicker({ label, color, onChange, className }: ColorSwatchPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        "bg-secondary/40 border-border flex items-center justify-between border p-2 transition-colors hover:border-white/50",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-press relative block h-8 w-8 cursor-pointer overflow-hidden border border-white/60 shadow-inner"
            style={{ backgroundColor: color }}
            title={`Change ${label} color`}
          />
          <input
            ref={inputRef}
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="pointer-events-none absolute inset-0 h-0 w-0 cursor-pointer opacity-0"
          />
        </div>

        <div className="flex flex-col">
          <span className="text-foreground font-mono text-xs font-bold tracking-wide uppercase">
            {label}
          </span>
          <span className="font-mono text-[11px] tracking-wider text-neutral-400 uppercase">
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
        className="border-border w-20 border bg-black px-2 py-1 text-center font-mono text-xs text-white uppercase focus:border-white focus:outline-none"
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
            className="bg-secondary border-border text-foreground btn-press absolute top-1/2 right-3 z-10 -translate-y-1/2 border p-2 shadow-md transition-colors hover:bg-neutral-800 hover:text-white"
            title="Swap foreground & background colors"
          >
            <ArrowsLeftRightIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
