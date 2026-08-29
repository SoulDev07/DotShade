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

export function SplitCompareSlider({
  originalElement,
  ditheredElement,
  className,
  initialPosition = 50,
}: SplitCompareSliderProps) {
  const [splitPos, setSplitPos] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplitPos(percent);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleTouchStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMove]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden select-none group cursor-ew-resize",
        className
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Right side: Dithered Layer */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {ditheredElement}
      </div>

      {/* Left side: Original Layer clipped */}
      <div
        className="absolute inset-0 h-full overflow-hidden pointer-events-none transition-none"
        style={{ width: `${splitPos}%` }}
      >
        <div
          className="absolute inset-0 h-full"
          style={{
            width: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100%",
          }}
        >
          {originalElement}
        </div>
      </div>

      {/* Split Divider Line & Draggable Badge */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] pointer-events-none z-20"
        style={{ left: `${splitPos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-neutral-900 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
          <MoveHorizontal className="w-4 h-4" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded text-xs font-mono text-neutral-300 pointer-events-none z-10">
        Original
      </div>
      <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 rounded text-xs font-mono text-emerald-300 pointer-events-none z-10">
        Dithered
      </div>
    </div>
  );
}
