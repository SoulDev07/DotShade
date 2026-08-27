import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse any CSS color (Hex #fff, #ffffff, #ffffff80, rgb(r, g, b), rgba(r, g, b, a), hsl, hsla)
 * into normalized RGBA float array [0..1] suitable for GLSL shaders.
 */
export function parseColorToNormalizedRgba(color: string): [number, number, number, number] {
  if (!color || typeof color !== "string") {
    return [0, 0, 0, 1];
  }

  const trimmed = color.trim();

  // Hex colors
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16) / 255;
      const g = parseInt(hex[1] + hex[1], 16) / 255;
      const b = parseInt(hex[2] + hex[2], 16) / 255;
      return [r, g, b, 1];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, 1];
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      return [r, g, b, a];
    }
  }

  // RGB / RGBA
  const rgbaMatch = trimmed.match(
    /rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?%?))?\s*\)/i
  );
  if (rgbaMatch) {
    const r = parseFloat(rgbaMatch[1]) / 255;
    const g = parseFloat(rgbaMatch[2]) / 255;
    const b = parseFloat(rgbaMatch[3]) / 255;
    let a = 1;
    if (rgbaMatch[4] !== undefined) {
      a = rgbaMatch[4].endsWith("%")
        ? parseFloat(rgbaMatch[4]) / 100
        : parseFloat(rgbaMatch[4]);
    }
    return [
      Math.max(0, Math.min(1, r)),
      Math.max(0, Math.min(1, g)),
      Math.max(0, Math.min(1, b)),
      Math.max(0, Math.min(1, a)),
    ];
  }

  // Fallback default black
  return [0, 0, 0, 1];
}

/**
 * Parse Hex color to 0-255 RGB integer tuple
 */
export function hexToRgb(hex: string): [number, number, number] {
  const normalized = parseColorToNormalizedRgba(hex);
  return [
    Math.round(normalized[0] * 255),
    Math.round(normalized[1] * 255),
    Math.round(normalized[2] * 255),
  ];
}

/**
 * Convert 0-255 RGB integers to Hex string #RRGGBB
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Relative luminance (perceived brightness)
 */
export function getLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
