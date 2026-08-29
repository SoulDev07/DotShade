"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { MoveHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface SplitCompareSliderProps {
  originalElement: React.ReactNode;
  ditheredElement: React.ReactNode;
  className?: string;
  initialPosition?: number; // 0 to 100
}

/**
 * Emil Kowalski's Hardware-Accelerated Clip-Path Comparison Slider.
 * Uses clip-path: inset(0 X% 0 0) with pointer-capture for jitter-free 60fps drag.
 */
export function SplitCompareSlider({
  originalElement,
  ditheredElement,
  className,
  initialPosition = 50,
}: SplitCompareSliderProps) {
  const [splitPos, setSplitPos] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplitPos(percent);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updatePosition(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "relative w-full h-full overflow-hidden select-none cursor-ew-resize touch-none",
        className
      )}
    >
      {/* Base Layer: Dithered Shader */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {ditheredElement}
      </div>

      {/* Top Layer: Original Media clipped using Emil's hardware-accelerated clip-path */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none will-change-[clip-path]"
        style={{
          clipPath: `inset(0 ${100 - splitPos}% 0 0)`,
        }}
      >
        {originalElement}
      </div>

      {/* Split Divider Line */}
      <div
        className="absolute top-0 bottom-0 w-px bg-white/40 pointer-events-none z-20 will-change-[left]"
        style={{
          left: `${splitPos}%`,
          boxShadow: "0 0 12px rgba(16, 185, 129, 0.4), 0 0 2px rgba(255, 255, 255, 0.8)",
        }}
      >
        {/* Floating Tactile Drag Handle */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-neutral-900/90 backdrop-blur-md border border-neutral-700 text-neutral-200 flex items-center justify-center shadow-xl transition-transform duration-150 ease-out",
            isDragging ? "scale-110 border-emerald-400 text-emerald-400 ring-2 ring-emerald-500/30" : "hover:scale-105"
          )}
        >
          <MoveHorizontal className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Elegant Micro-Badges */}
      <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-md text-[11px] font-mono text-neutral-300 pointer-events-none z-10 transition-opacity duration-200">
        Original
      </div>
      <div className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-950/70 backdrop-blur-md border border-emerald-500/30 rounded-md text-[11px] font-mono text-emerald-300 pointer-events-none z-10 transition-opacity duration-200">
        Dithered
      </div>
    </div>
  );
}
