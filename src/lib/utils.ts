import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names safely using clsx and tailwind-merge.
 * Resolves conflicting Tailwind utility classes cleanly.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses any common CSS color format into normalized RGBA floats in the range [0, 1].
 * Supports:
 *  - 3-digit hex (#rgb)
 *  - 6-digit hex (#rrggbb)
 *  - 8-digit hex (#rrggbbaa)
 *  - rgb(...) and rgba(...) functions with optional percentage alpha
 * Returns `[r, g, b, a]` normalized for WebGL/WGSL uniforms (defaulting to opaque black `[0, 0, 0, 1]`).
 */
export function parseColorToNormalizedRgba(color: string): [number, number, number, number] {
  if (!color || typeof color !== "string") {
    return [0, 0, 0, 1];
  }

  const trimmed = color.trim();

  // Hex format support: #RGB, #RRGGBB, #RRGGBBAA
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

  // Functional rgb/rgba formats: rgb(r, g, b) or rgba(r, g, b, a)
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

  // Fallback to opaque black if unparseable
  return [0, 0, 0, 1];
}

/**
 * Converts a hex color string into integer [r, g, b] channels in [0, 255].
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
 * Converts integer RGB values [0..255] into a standard 6-digit hex string (#RRGGBB).
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Computes standard ITU-R BT.709 relative luminance from 0..255 RGB channels.
 * Weight factors reflect human eye sensitivity (green > red > blue).
 */
export function getLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Converts a single sRGB gamma-compressed channel [0..1] to linear color space.
 */
export function sRgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Converts a single linear color space channel [0..1] to sRGB gamma-compressed.
 */
export function linearToSRgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;
}

/**
 * Calculates target bounding dimensions and centered offsets for media fitting:
 *  - "contain": maintains aspect ratio so media fits completely within container.
 *  - "cover": maintains aspect ratio so media fills container, cropping edges.
 *  - "fill": stretches media to completely match container width and height.
 */
export function calculateFitDimensions(
  fit: "contain" | "cover" | "fill",
  containerWidth: number,
  containerHeight: number,
  srcWidth: number,
  srcHeight: number
): { width: number; height: number; x: number; y: number } {
  if (fit === "fill" || srcWidth <= 0 || srcHeight <= 0) {
    return { width: containerWidth, height: containerHeight, x: 0, y: 0 };
  }

  const containerAspect = containerWidth / containerHeight;
  const srcAspect = srcWidth / srcHeight;

  let width = containerWidth;
  let height = containerHeight;

  if (fit === "contain") {
    if (srcAspect > containerAspect) {
      height = containerWidth / srcAspect;
    } else {
      width = containerHeight * srcAspect;
    }
  } else if (fit === "cover") {
    if (srcAspect > containerAspect) {
      width = containerHeight * srcAspect;
    } else {
      height = containerWidth / srcAspect;
    }
  }

  const x = (containerWidth - width) / 2;
  const y = (containerHeight - height) / 2;

  return { width, height, x, y };
}

/**
 * Formats a file size in raw bytes into human-readable representation (e.g. "1.5 MB").
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
