"use client";

import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import React, { useCallback, useRef, useState } from "react";
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
        "absolute inset-0 cursor-ew-resize touch-none overflow-hidden will-change-[clip-path]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{
          clipPath: `inset(0 ${100 - splitPos}% 0 0)`,
        }}
      >
        {originalElement}
      </div>

      <div
        className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-neutral-400/80 will-change-[left]"
        style={{
          left: `${splitPos}%`,
        }}
      >
        <div
          className={cn(
            "absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 border-white bg-black text-white transition-all duration-75 ease-out",
            isDragging
              ? "scale-110 shadow-[2px_2px_0px_#ffffff]"
              : "shadow-[1px_1px_0px_#ffffff] hover:scale-105",
          )}
        >
          <ArrowsLeftRightIcon className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="pointer-events-none absolute top-3 left-3 z-10 border border-white bg-black px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-white uppercase shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
        ORIGINAL
      </div>
      <div className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-1.5 border border-white bg-white px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-black uppercase shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
        <span>DITHERED</span>
      </div>
    </div>
  );
});
