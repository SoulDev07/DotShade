import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { colord, extend } from "colord";
import labPlugin from "colord/plugins/lab";

extend([labPlugin]);

export { colord };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseColorToNormalizedRgba(color: string): [number, number, number, number] {
  if (!color || typeof color !== "string") return [0, 0, 0, 1];
  const c = colord(color.trim());
  if (!c.isValid()) return [0, 0, 0, 1];
  const { r, g, b, a } = c.toRgb();
  return [r / 255, g / 255, b / 255, a];
}

export function hexToRgb(hex: string): [number, number, number] {
  if (!hex || typeof hex !== "string") return [0, 0, 0];
  const c = colord(hex.trim());
  if (!c.isValid()) return [0, 0, 0];
  const { r, g, b } = c.toRgb();
  return [r, g, b];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return colord({ r, g, b }).toHex();
}

export function getLuminance(r: number, g: number, b: number): number {
  return colord({ r, g, b }).brightness() * 255;
}

/** CIEDE2000 perceptual color distance via colord/lab */
export function deltaE(
  c1: string | { r: number; g: number; b: number },
  c2: string | { r: number; g: number; b: number }
): number {
  return colord(c1).delta(c2);
}

export function sRgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function linearToSRgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;
}

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

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
