"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SplitCompareSliderProps {
  originalElement: React.ReactNode;
  ditheredElement: React.ReactNode;
  className?: string;
  initialPosition?: number; // 0 to 100
}

/**
 * Comparison slider using clip-path with pointer-capture.
 */
export const SplitCompareSlider = React.memo(function SplitCompareSlider({
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

      {/* Top Layer: Original Media */}
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
        className="absolute top-0 bottom-0 w-px bg-neutral-400/80 pointer-events-none z-20 will-change-[left]"
        style={{
          left: `${splitPos}%`,
        }}
      >
        {/* Floating Drag Handle */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-card border text-foreground flex items-center justify-center shadow-lg transition-all duration-100 ease-out",
            isDragging
              ? "scale-110 border-primary text-primary shadow-primary/25"
              : "border-border hover:border-primary/50 hover:scale-105"
          )}
        >
          <ArrowsLeftRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Micro-Badges */}
      <div className="absolute top-3 left-3 px-2.5 py-1 bg-card/90 border border-border rounded-md text-[10px] font-mono text-muted-foreground pointer-events-none z-10 backdrop-blur-sm shadow-md">
        Original
      </div>
      <div className="absolute top-3 right-3 px-2.5 py-1 bg-card/90 border border-primary/40 rounded-md text-[10px] font-mono text-primary pointer-events-none z-10 backdrop-blur-sm shadow-md flex items-center gap-1.5">
        <span>Dithered</span>
      </div>
    </div>
  );
});
