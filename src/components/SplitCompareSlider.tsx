"use client";

import React, { useState, useRef, useCallback } from "react";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SplitCompareSliderProps {
  originalElement: React.ReactNode;
  className?: string;
  initialPosition?: number;
}

export const SplitCompareSlider = React.memo(function SplitCompareSlider({
  originalElement,
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
        "absolute inset-0 overflow-hidden cursor-ew-resize touch-none will-change-[clip-path]",
        className
      )}
    >
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          clipPath: `inset(0 ${100 - splitPos}% 0 0)`,
        }}
      >
        {originalElement}
      </div>

      <div
        className="absolute top-0 bottom-0 w-px bg-neutral-400/80 pointer-events-none z-20 will-change-[left]"
        style={{
          left: `${splitPos}%`,
        }}
      >
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-black border-2 border-white text-white flex items-center justify-center transition-all duration-75 ease-out",
            isDragging
              ? "scale-110 shadow-[2px_2px_0px_#ffffff]"
              : "hover:scale-105 shadow-[1px_1px_0px_#ffffff]"
          )}
        >
          <ArrowsLeftRightIcon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="absolute top-3 left-3 px-2 py-1 bg-black border border-white text-[10px] font-mono font-bold text-white uppercase tracking-wider pointer-events-none z-10 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
        ORIGINAL
      </div>
      <div className="absolute top-3 right-3 px-2 py-1 bg-white border border-white text-[10px] font-mono font-bold text-black uppercase tracking-wider pointer-events-none z-10 shadow-[2px_2px_0px_rgba(0,0,0,0.8)] flex items-center gap-1.5">
        <span>DITHERED</span>
      </div>
    </div>
  );
});
