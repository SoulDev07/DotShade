import React from "react";
import { cn } from "@/lib/utils";

interface DotShadeLogoProps {
  className?: string;
  size?: number;
}

/**
 * Pixel-art brand logo using 2x2 SVG patterns to recreate hardware halftone dithering.
 */
export function DotShadeLogo({ className, size = 24 }: DotShadeLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      shapeRendering="crispEdges"
      aria-label="DotShade Logo"
    >
      <defs>
        <pattern id="dither50-react" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="#ffffff" />
          <rect x="1" y="1" width="1" height="1" fill="#ffffff" />
        </pattern>
        <pattern id="dither25-react" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="#ffffff" />
        </pattern>
        <pattern id="dither75-react" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="#ffffff" />
          <rect x="1" y="1" width="1" height="1" fill="#000000" />
        </pattern>
      </defs>

      <rect width="32" height="32" fill="#000000" />
      <rect x="4" y="4" width="24" height="24" fill="#ffffff" />
      <rect x="5" y="5" width="22" height="22" fill="#09090b" />

      <rect x="6" y="6" width="5" height="20" fill="#ffffff" />
      <rect x="11" y="6" width="5" height="20" fill="url(#dither75-react)" />
      <rect x="16" y="6" width="5" height="20" fill="url(#dither50-react)" />
      <rect x="21" y="6" width="5" height="20" fill="url(#dither25-react)" />

      <rect x="10" y="10" width="12" height="12" fill="#ffffff" />
      <rect x="11" y="11" width="10" height="10" fill="#000000" />
      <rect x="14" y="14" width="4" height="4" fill="#ffffff" />
    </svg>
  );
}
